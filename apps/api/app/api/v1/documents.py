from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import Response as RawResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.storage.storage_adapter import get_storage_adapter
from app.db.models import User
from app.db.session import get_db
from app.schemas.custody import CustodyEventResponse
from app.schemas.document import (
    DocumentReceiptResponse,
    DocumentResponse,
    DocumentVerificationResponse,
)
from app.schemas.signature import SignatureResponse
from app.services.auth_service import get_current_user, require_roles
from app.services.custody_service import CustodyService
from app.services.document_service import DocumentService
from app.services.integrity_service import IntegrityService
from app.services.signature_service import SignatureService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentReceiptResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    case_id: str = Form(...),
    title: str = Form(...),
    document_type: str = Form(...),
    classification: str = Form("RESTRICTED"),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: User = Depends(require_roles(["ADMIN", "POLICE_OFFICER", "INVESTIGATING_OFFICER", "FORENSIC_ANALYST", "PROSECUTOR", "COURT_CLERK"])),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    return await DocumentService.upload_document(
        db=db,
        case_id=case_id,
        title=title,
        document_type=document_type,
        classification=classification,
        description=description,
        tags=tags,
        file=file,
        uploader=current_user,
        client_ip=client_ip,
        user_agent=user_agent,
    )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    case_id: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DocumentService.list_documents(
        db=db,
        user=current_user,
        case_id=case_id,
        doc_type=doc_type,
        classification=classification,
        search=search,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DocumentService.get_document_by_id(db=db, document_id=document_id)


@router.get("/{document_id}/preview")
async def get_document_preview(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    url, watermark = await DocumentService.get_preview_url(db=db, document_id=document_id, user=current_user)
    return {"preview_url": url, "watermark": watermark}


@router.get("/stream/{object_key:path}")
async def stream_document_bytes(
    object_key: str,
):
    """Internal secure streaming endpoint for local encrypted storage."""
    storage = get_storage_adapter()
    try:
        data = await storage.get_object(object_key)
        # Determine basic mime type
        mime = "application/pdf" if object_key.endswith(".pdf") else "text/plain"
        return RawResponse(content=data, media_type=mime)
    except Exception:
        raise HTTPException(status_code=404, detail="Requested file not found in storage vault.")


@router.post("/{document_id}/verify", response_model=DocumentVerificationResponse)
async def verify_document_integrity(
    document_id: str,
    version: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await IntegrityService.verify_document(
        db=db,
        document_id=document_id,
        user=current_user,
        version_number=version,
    )


@router.get("/{document_id}/custody", response_model=List[CustodyEventResponse])
async def get_document_custody(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await CustodyService.get_document_custody(db=db, document_id=document_id)


@router.get("/{document_id}/signatures", response_model=List[SignatureResponse])
async def get_document_signatures(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await SignatureService.get_document_signatures(db=db, document_id=document_id)
