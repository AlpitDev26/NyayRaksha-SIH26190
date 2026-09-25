from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User
from app.db.session import get_db
from app.schemas.ai import AISuggestionResponse, RedactionApplyRequest
from app.schemas.document import DocumentResponse
from app.services.ai_service import AIService
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/documents", tags=["AI & Redaction"])


@router.post("/{document_id}/ai-analyze", response_model=AISuggestionResponse)
async def analyze_document_with_ai(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.analyze_document(db=db, document_id=document_id, user=current_user)


@router.post("/{document_id}/redaction", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_redacted_derivative(
    document_id: str,
    redaction_data: RedactionApplyRequest,
    current_user: User = Depends(require_roles(["ADMIN", "INVESTIGATING_OFFICER", "FORENSIC_ANALYST", "PROSECUTOR"])),
    db: AsyncSession = Depends(get_db),
):
    return await AIService.apply_redaction(
        db=db,
        document_id=document_id,
        redaction_data=redaction_data,
        reviewer=current_user,
    )
