import logging
import os

from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema

load_dotenv()

logger = logging.getLogger(__name__)


def smtp_is_configured() -> bool:
    """Return True when all required SMTP env vars are present."""
    required = ["MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_FROM", "MAIL_SERVER", "MAIL_PORT"]
    return all(os.getenv(key) for key in required)


def _build_smtp_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_FROM=os.getenv("MAIL_FROM"),
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
    )


async def send_smtp_email(to: str, subject: str, body: str, subtype: str = "plain") -> bool:
    """Send email over SMTP via fastapi-mail. Returns True on success."""
    if not smtp_is_configured():
        logger.error("SMTP is not configured. Missing one or more MAIL_* environment variables.")
        return False

    try:
        conf = _build_smtp_config()
        fm = FastMail(conf)
        message = MessageSchema(
            subject=subject,
            recipients=[to],
            body=body,
            subtype=subtype,
        )
        await fm.send_message(message)
        return True
    except Exception as exc:
        logger.error(f"SMTP send failed to {to}: {exc}")
        return False
