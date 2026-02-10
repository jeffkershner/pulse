import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


async def send_otp_email(email: str, code: str) -> bool:
    if not settings.resend_api_key:
        logger.warning(f"RESEND_API_KEY not set. OTP for {email}: {code}")
        return True

    resend.api_key = settings.resend_api_key

    try:
        resend.Emails.send({
            "from": "Market Pulse <contact@notifications.jeffkershner.com>",
            "to": [email],
            "subject": f"Your Market Pulse login code: {code}",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1a1a2e;">Market Pulse</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: #f5f5f5; text-align: center; border-radius: 8px; margin: 20px 0;">
                        {code}
                    </div>
                    <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
            """,
        })
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        return False
