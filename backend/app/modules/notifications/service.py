import os
from uuid import UUID

from app.modules.notifications.model import Notification


# ── In-app DB notifications ───────────────────────────────────────────────────

async def create_notification(user_id: UUID, message: str) -> None:
    """
    Persist a notification using its OWN session so it always commits,
    regardless of what the caller's session has already committed or not.
    Never raises — a notification failure must never break business logic.
    """
    from app.db.session import AsyncSessionLocal   # local import avoids circular dep
    try:
        async with AsyncSessionLocal() as db:
            db.add(Notification(user_id=user_id, message=message))
            await db.commit()
    except Exception as exc:
        print(f"[Notification] Failed to save notification for {user_id}: {exc}")


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
