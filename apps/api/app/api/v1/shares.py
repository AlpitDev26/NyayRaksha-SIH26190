from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.schemas.share import (
    AccessRequestCreate,
    AccessRequestResponse,
    AccessRequestReview,
)
from app.services.auth_service import get_current_user, require_roles
from app.services.share_service import ShareService

router = APIRouter(tags=["Access & Sharing"])


@router.post("/access-requests", response_model=AccessRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_access_request(
    request_data: AccessRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ShareService.create_access_request(
        db=db,
        request_data=request_data,
        requester=current_user,
    )


@router.get("/access-requests", response_model=List[AccessRequestResponse])
async def list_access_requests(
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ShareService.list_access_requests(db=db, user=current_user, status=status)


@router.post("/access-requests/{request_id}/review", response_model=AccessRequestResponse)
async def review_access_request(
    request_id: str,
    review: AccessRequestReview,
    current_user: User = Depends(require_roles(["ADMIN", "INVESTIGATING_OFFICER", "POLICE_OFFICER"])),
    db: AsyncSession = Depends(get_db),
):
    return await ShareService.review_access_request(
        db=db,
        request_id=request_id,
        review=review,
        reviewer=current_user,
    )


@router.post("/shares/{grant_id}/revoke")
async def revoke_share_grant(
    grant_id: str,
    current_user: User = Depends(require_roles(["ADMIN", "INVESTIGATING_OFFICER"])),
    db: AsyncSession = Depends(get_db),
):
    success = await ShareService.revoke_grant(db=db, grant_id=grant_id, user=current_user)
    return {"status": "SUCCESS", "message": "Share grant revoked and anchored on blockchain."}
