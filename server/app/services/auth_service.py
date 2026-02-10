import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.otp import OtpCode
from app.models.user import User


def generate_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"


async def create_otp(db: AsyncSession, email: str) -> str:
    code = generate_otp()
    otp = OtpCode(
        email=email.lower(),
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(otp)
    await db.commit()
    return code


async def verify_otp(db: AsyncSession, email: str, code: str) -> bool:
    result = await db.execute(
        select(OtpCode).where(
            OtpCode.email == email.lower(),
            OtpCode.code == code,
            OtpCode.used == False,  # noqa: E712
            OtpCode.expires_at > datetime.now(timezone.utc),
        )
    )
    otp = result.scalar_one_or_none()
    if not otp:
        return False

    otp.used = True
    await db.commit()
    return True


async def get_or_create_user(db: AsyncSession, email: str) -> User:
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user:
        user.is_verified = True
        await db.commit()
        return user

    user = User(
        email=email.lower(),
        is_verified=True,
        starting_balance=settings.starting_balance,
        cash_balance=settings.starting_balance,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def create_access_token(user_id: uuid.UUID, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: uuid.UUID, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None
