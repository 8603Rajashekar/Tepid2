import os


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

        # Fallback — set SENDGRID_API_KEY in .env to enable real emails
        print(f"\n📧 EMAIL → {to}")
        print(f"   Subject : {subject}")
        print(f"   Body    : {body}\n")

    @staticmethod
    async def send_sms(phone: str, message: str) -> None:
        sid = os.getenv("TWILIO_SID")
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

        # Fallback — set TWILIO_SID / TWILIO_TOKEN / TWILIO_FROM in .env to enable real SMS
        print(f"\n📱 SMS → {phone}")
        print(f"   Message : {message}\n")
