from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.cases import router as cases_router
from app.api.v1.documents import router as documents_router
from app.api.v1.shares import router as shares_router
from app.api.v1.signatures import router as signatures_router
from app.api.v1.ai import router as ai_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(cases_router)
api_router.include_router(documents_router)
api_router.include_router(shares_router)
api_router.include_router(signatures_router)
api_router.include_router(ai_router)
api_router.include_router(audit_router)
