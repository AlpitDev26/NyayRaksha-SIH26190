from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import User
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, MFARequest, UserBase
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request_data: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    login_res = await AuthService.authenticate_user(
        db=db,
        request_data=request_data,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    # Set secure HttpOnly cookies if authenticated
    if login_res.status == "AUTHENTICATED" and login_res.access_token:
        response.set_cookie(
            key="access_token",
            value=login_res.access_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            max_age=settings.JWT_ACCESS_TTL_MINUTES * 60,
        )
        if login_res.refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=login_res.refresh_token,
                httponly=True,
                secure=settings.COOKIE_SECURE,
                samesite=settings.COOKIE_SAMESITE,
                max_age=settings.JWT_REFRESH_TTL_DAYS * 24 * 3600,
            )

    return login_res


@router.post("/mfa/verify", response_model=LoginResponse)
async def verify_mfa(
    mfa_data: MFARequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    res = await AuthService.verify_mfa(
        db=db,
        mfa_data=mfa_data,
        client_ip=client_ip,
        user_agent=user_agent,
    )

    if res.access_token:
        response.set_cookie(
            key="access_token",
            value=res.access_token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            max_age=settings.JWT_ACCESS_TTL_MINUTES * 60,
        )
    return res


@router.get("/me", response_model=UserBase)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    user_roles = [r.name for r in current_user.roles]
    return UserBase(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        organization_name=current_user.organization.name if current_user.organization else "Justice Department",
        organization_code=current_user.organization.code if current_user.organization else "JUD",
        roles=user_roles,
        is_mfa_enabled=current_user.is_mfa_enabled,
        last_login_at=current_user.last_login_at,
    )


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully. Secure cookies cleared."}
