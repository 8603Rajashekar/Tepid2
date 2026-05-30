import os
import re
import urllib.parse
import urllib.request
from uuid import UUID

from app.core.config import settings
from app.modules.notifications.model import Notification


# ── In-app DB notifications ───────────────────────────────────────────────────

async def create_notification(user_id: UUID, message: str) -> None:
    """
    Persist a single notification using its own session.
    Never raises — a notification failure must never break business logic.
    """
    from app.db.session import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as db:
            db.add(Notification(user_id=user_id, message=message))
            await db.commit()
    except Exception as exc:
        print(f"[Notification] Failed for {user_id}: {exc}")


async def notify_role(roles: list[str], message: str) -> None:
    """
    Send *message* to every active user whose role is in *roles*.
    Uses its own session — safe to call from any service.

    Example:
        await notify_role(["admin", "super_admin"], "New expense submitted")
        await notify_role(["supervisor"], "Task ready for review")
    """
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.user import User

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User.id)
                .where(User.role.in_(roles))
                .where(User.is_active == True)  # noqa: E712
            )
            user_ids = result.scalars().all()
            for uid in user_ids:
                db.add(Notification(user_id=uid, message=message))
            if user_ids:
                await db.commit()
    except Exception as exc:
        print(f"[Notification] notify_role({roles}) failed: {exc}")


# ── External email / SMS (unchanged) ─────────────────────────────────────────

class NotificationService:
    @staticmethod
    def _smslogin_mobile(phone: str) -> str:
        # SMSLogin expects numeric mobile values in query params.
        return re.sub(r"\D", "", (phone or "").strip())

    @staticmethod
    def _looks_like_sms_success(provider_response: str) -> bool:
        text = (provider_response or "").strip().lower()
        if not text:
            return False
        # SMSLogin may return a JSON-ish body containing campid on accepted submits.
        if "campid" in text:
            return True
        failure_tokens = ["error", "invalid", "failed", "failure", "unauthor", "reject", "denied"]
        success_tokens = ["ok", "success", "sent", "queued", "submit", "accepted", "messageid", "id:"]
        if any(token in text for token in failure_tokens):
            return False
        return any(token in text for token in success_tokens)

    @staticmethod
    async def send_email(to: str, subject: str, body: str) -> None:
        api_key = os.getenv("SENDGRID_API_KEY")
        if api_key:
            try:
                import sendgrid
                from sendgrid.helpers.mail import Mail

                sg = sendgrid.SendGridAPIClient(api_key=api_key)
                message = Mail(
                    from_email=os.getenv("FROM_EMAIL", "noreply@company.com"),
                    to_emails=to,
                    subject=subject,
                    plain_text_content=body,
                )
                sg.send(message)
                return
            except Exception as exc:
                print(f"[NotificationService] SendGrid error: {exc}")

        print(f"\n[EMAIL] To: {to}")
        print(f"   Subject : {subject}")
        print(f"   Body    : {body}\n")

    @staticmethod
    async def send_sms(phone: str, message: str) -> tuple[bool, str]:
        provider = (settings.SMS_PROVIDER or "").strip().lower()
        if provider == "smslogin":
            base_url = settings.SMS_API_BASE_URL or "https://smslogin.co/v3/api.php"
            username = settings.SMS_USERNAME or ""
            api_key = settings.SMS_API_KEY or ""
            sender_id = settings.SMS_SENDER_ID or ""
            dlt_entity_id = settings.SMS_DLT_ENTITY_ID or ""
            template_id = settings.SMS_DLT_TEMPLATE_ID_OTP or ""
            if username and api_key and sender_id:
                try:
                    sms_mobile = NotificationService._smslogin_mobile(phone)
                    if not sms_mobile:
                        return False, "smslogin rejected: mobile number is empty after normalization"
                    params = {
                        "username": username,
                        "apikey": api_key,
                        "mobile": sms_mobile,
                        "senderid": sender_id,
                        "message": message,
                    }
                    if dlt_entity_id and dlt_entity_id != "REPLACE_WITH_DLT_ENTITY_ID":
                        params["entityid"] = dlt_entity_id
                    if template_id and template_id != "REPLACE_WITH_DLT_TEMPLATE_ID_OTP":
                        params["templateid"] = template_id
                    url = f"{base_url}?{urllib.parse.urlencode(params)}"
                    with urllib.request.urlopen(url, timeout=15) as resp:
                        body = resp.read().decode("utf-8", errors="ignore")
                    if NotificationService._looks_like_sms_success(body):
                        return True, f"smslogin accepted: {body[:200]}"
                    return False, f"smslogin rejected: {body[:200]}"
                except Exception as exc:
                    return False, f"smslogin error: {exc}"

        sid = os.getenv("TWILIO_SID")
        token = os.getenv("TWILIO_TOKEN")
        from_number = os.getenv("TWILIO_FROM")
        if sid and token and from_number:
            try:
                from twilio.rest import Client

                client = Client(sid, token)
                msg = client.messages.create(body=message, from_=from_number, to=phone)
                status = getattr(msg, "status", "unknown")
                if status in {"queued", "accepted", "sent", "delivered"}:
                    return True, f"twilio status: {status}"
                return False, f"twilio status: {status}"
            except Exception as exc:
                return False, f"twilio error: {exc}"

        print(f"\n[SMS] To: {phone}")
        print(f"   Message : {message}\n")
        return False, "no live SMS provider configured; OTP printed to backend terminal"
