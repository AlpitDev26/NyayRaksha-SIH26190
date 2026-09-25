from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.schemas.case import CaseCreate, CaseResponse
from app.services.auth_service import get_current_user, require_roles
from app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CaseService.list_cases(
        db=db,
        user=current_user,
        status=status,
        priority=priority,
        search=search,
    )


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(require_roles(["ADMIN", "POLICE_OFFICER", "INVESTIGATING_OFFICER"])),
    db: AsyncSession = Depends(get_db),
):
    return await CaseService.create_case(db=db, case_data=case_data, creator=current_user)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CaseService.get_case_by_id(db=db, case_id=case_id)


@router.get("/{case_id}/timeline")
async def get_case_timeline(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CaseService.get_case_timeline(db=db, case_id=case_id)
