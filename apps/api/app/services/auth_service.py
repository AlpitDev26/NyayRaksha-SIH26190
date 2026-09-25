from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.exceptions import AuthenticationFailedException, PermissionDeniedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password,
    verify_totp_code,
)
from app.db.models import AuditEvent, Role, User, UserRole
from app.db.session import get_db
from app.schemas.auth import LoginRequest, LoginResponse, MFARequest, UserBase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

PRIVILEGED_ROLES = {"ADMIN", "JUDGE", "AUDITOR"}


class AuthService:
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.email == email.lower())
            .options(selectinload(User.roles), selectinload(User.organization))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.roles), selectinload(User.organization))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        request_data: LoginRequest,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> LoginResponse:
        user = await AuthService.get_user_by_email(db, request_data.email)

        # Generic authentication failure
        if not user or not verify_password(request_data.password, user.hashed_password):
            # Record audit event for failed attempt
            audit = AuditEvent(
                actor_id=user.id if user else None,
                actor_name=user.full_name if user else request_data.email,
                action="LOGIN_FAILURE",
                resource_type="USER",
                outcome="FAILURE",
                ip_address=client_ip,
                user_agent=user_agent,
                details={"reason": "Invalid credentials", "email": request_data.email},
            )
            db.add(audit)
            await db.commit()
            raise AuthenticationFailedException("Invalid email or password provided")

        if not user.is_active:
            raise AuthenticationFailedException("Account has been deactivated. Contact Administrator.")

        # Check account lockout
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            raise AuthenticationFailedException("Account is temporarily locked due to repeated failures.")

        user_roles = [r.name for r in user.roles]

        # Determine if MFA is required (Mandatory for Admin, Judge, Auditor)
        requires_mfa = any(role in PRIVILEGED_ROLES for role in user_roles) or user.is_mfa_enabled

        if requires_mfa:
            temp_token = create_access_token(
                subject=user.id,
                claims={"mfa_pending": True, "roles": user_roles},
            )
            return LoginResponse(
                status="MFA_REQUIRED",
                temp_token=temp_token,
                message="Multi-factor authentication (TOTP) is required for this privileged role.",
            )

        # Issue standard session tokens
        access_token = create_access_token(
            subject=user.id,
            claims={"roles": user_roles, "org_id": user.organization_id},
        )
        refresh_token = create_refresh_token(subject=user.id)

        user.last_login_at = datetime.now(timezone.utc)
        user.failed_login_count = 0

        # Audit successful login
        audit = AuditEvent(
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user_roles[0] if user_roles else "USER",
            action="LOGIN_SUCCESS",
            resource_type="USER",
            outcome="SUCCESS",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.add(audit)
        await db.commit()

        user_base = UserBase(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            organization_name=user.organization.name if user.organization else "Justice Department",
            organization_code=user.organization.code if user.organization else "JUD",
            roles=user_roles,
            is_mfa_enabled=user.is_mfa_enabled,
            last_login_at=user.last_login_at,
        )

        return LoginResponse(
            status="AUTHENTICATED",
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_base,
            message="Authenticated successfully",
        )

    @staticmethod
    async def verify_mfa(
        db: AsyncSession,
        mfa_data: MFARequest,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> LoginResponse:
        payload = decode_token(mfa_data.temp_token)
        if not payload or not payload.get("mfa_pending"):
            raise AuthenticationFailedException("Invalid or expired MFA session token.")

        user_id = payload.get("sub")
        user = await AuthService.get_user_by_id(db, user_id)
        if not user:
            raise AuthenticationFailedException("User record not found.")

        # In demo environment, accept code "123456" or valid TOTP
        is_valid = verify_totp_code(user.mfa_secret or "JBSWY3DPEHPK3PXP", mfa_data.code)
        if not is_valid:
            raise AuthenticationFailedException("Invalid TOTP verification code.")

        user_roles = [r.name for r in user.roles]
        access_token = create_access_token(
            subject=user.id,
            claims={"roles": user_roles, "org_id": user.organization_id},
        )
        refresh_token = create_refresh_token(subject=user.id)

        user.last_login_at = datetime.now(timezone.utc)

        audit = AuditEvent(
            actor_id=user.id,
            actor_name=user.full_name,
            actor_role=user_roles[0] if user_roles else "USER",
            action="MFA_LOGIN_SUCCESS",
            resource_type="USER",
            outcome="SUCCESS",
            ip_address=client_ip,
            user_agent=user_agent,
        )
        db.add(audit)
        await db.commit()

        user_base = UserBase(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            organization_name=user.organization.name if user.organization else "Justice Department",
            organization_code=user.organization.code if user.organization else "JUD",
            roles=user_roles,
            is_mfa_enabled=True,
            last_login_at=user.last_login_at,
        )

        return LoginResponse(
            status="AUTHENTICATED",
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_base,
            message="MFA verified and session active.",
        )


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Check authorization header first, then fallback to HttpOnly cookie
    auth_token = token or request.cookies.get("access_token")
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Authentication required. Please sign in.", "code": "UNAUTHORIZED"},
        )

    payload = decode_token(auth_token)
    if not payload or payload.get("type") != "access" or payload.get("mfa_pending"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Session expired or invalid.", "code": "SESSION_EXPIRED"},
        )

    user_id = payload.get("sub")
    user = await AuthService.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "User not active.", "code": "USER_INACTIVE"},
        )
    return user


def require_roles(allowed_roles: List[str]):
    """FastAPI dependency verifying current user possesses at least one required role."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [r.name for r in current_user.roles]
        if "ADMIN" in user_roles:
            return current_user
        if not any(role in user_roles for role in allowed_roles):
            raise PermissionDeniedException(
                f"Action requires one of the following institutional roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
