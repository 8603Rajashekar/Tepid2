import os
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.model import Notification


# ── In-app DB notifications ───────────────────────────────────────────────────

async def create_notification(db: AsyncSession, user_id: UUID, message: str) -> None:
    """
    Add a notification row for *user_id* to the current session.
    The caller's next db.commit() will persist it — no extra commit needed here.
    Silently ignores errors so a notification failure never breaks core business logic.
    """
    try:
        notif = Notification(user_id=user_id, message=message)
        db.add(notif)
    except Exception as exc:
        print(f"[Notification] Failed to queue notification: {exc}")


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
