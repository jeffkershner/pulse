from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import (
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    VerifyRequest,
)
from app.services.auth_service import (
    create_access_token,
    create_otp,
    create_refresh_token,
    decode_token,
    get_or_create_user,
    verify_otp,
)
from app.services.email_service import send_otp_email
from app.utils.rate_limit import otp_send_limiter, otp_verify_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not otp_send_limiter.is_allowed(req.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many OTP requests")

    code = await create_otp(db, req.email)
    await send_otp_email(req.email, code)
    return RegisterResponse(message="Verification code sent", email=req.email)


@router.post("/verify", response_model=TokenResponse)
async def verify(req: VerifyRequest, db: AsyncSession = Depends(get_db)):
    if not otp_verify_limiter.is_allowed(req.email):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many verification attempts")

    valid = await verify_otp(db, req.email, req.code)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    user = await get_or_create_user(db, req.email)
    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id, user.email)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=str(user.id),
        email=user.email,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    access_token = create_access_token(payload["sub"], payload["email"])
    return RefreshResponse(access_token=access_token)
