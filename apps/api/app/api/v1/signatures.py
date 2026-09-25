from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.schemas.signature import SignatureCreate, SignatureResponse
from app.services.auth_service import get_current_user, require_roles
from app.services.signature_service import SignatureService

router = APIRouter(tags=["Signatures"])


@router.post("/documents/{document_id}/sign", response_model=SignatureResponse, status_code=status.HTTP_201_CREATED)
async def sign_document(
    document_id: str,
    sign_data: SignatureCreate,
    current_user: User = Depends(require_roles(["ADMIN", "JUDGE", "PROSECUTOR"])),
    db: AsyncSession = Depends(get_db),
):
    return await SignatureService.sign_document(
        db=db,
        document_id=document_id,
        sign_data=sign_data,
        signer=current_user,
    )
