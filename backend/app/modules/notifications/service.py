import os
import urllib.parse
import urllib.request
from uuid import UUID

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
    async def send_sms(phone: str, message: str) -> None:
        provider = os.getenv("SMS_PROVIDER", "").strip().lower()
        if provider == "smslogin":
            base_url = os.getenv("SMS_API_BASE_URL", "https://smslogin.co/v3/api.php")
            username = os.getenv("SMS_USERNAME", "")
            api_key = os.getenv("SMS_API_KEY", "")
            sender_id = os.getenv("SMS_SENDER_ID", "")
            dlt_entity_id = os.getenv("SMS_DLT_ENTITY_ID", "")
            template_id = os.getenv("SMS_DLT_TEMPLATE_ID_OTP", "")
            if username and api_key and sender_id:
                try:
                    params = {
                        "username": username,
                        "apikey": api_key,
                        "mobile": phone,
                        "senderid": sender_id,
                        "message": message,
                    }
                    if dlt_entity_id and dlt_entity_id != "REPLACE_WITH_DLT_ENTITY_ID":
                        params["entityid"] = dlt_entity_id
                    if template_id and template_id != "REPLACE_WITH_DLT_TEMPLATE_ID_OTP":
                        params["templateid"] = template_id
                    url = f"{base_url}?{urllib.parse.urlencode(params)}"
                    with urllib.request.urlopen(url, timeout=15) as resp:
                        resp.read()
                    return
                except Exception as exc:
                    print(f"[NotificationService] smslogin error: {exc}")

        sid   = os.getenv("TWILIO_SID")
        token = os.getenv("TWILIO_TOKEN")
        from_number = os.getenv("TWILIO_FROM")
        if sid and token and from_number:
            try:
                from twilio.rest import Client

                client = Client(sid, token)
                client.messages.create(body=message, from_=from_number, to=phone)
                return
            except Exception as exc:
                print(f"[NotificationService] Twilio error: {exc}")

        print(f"\n[SMS] To: {phone}")
        print(f"   Message : {message}\n")
