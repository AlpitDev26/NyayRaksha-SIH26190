from datetime import datetime, timezone
from fastapi import APIRouter
from app.adapters.blockchain.blockchain_adapter import get_blockchain_adapter
from app.core.config import settings

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/readiness")
async def readiness_check():
    blockchain = get_blockchain_adapter()
    ledger_stats = await blockchain.get_ledger_stats()

    return {
        "status": "READY",
        "database": "CONNECTED",
        "storage": settings.STORAGE_MODE.upper(),
        "blockchain_adapter": ledger_stats.get("mode", "MOCK"),
        "scanner_adapter": settings.SCANNER_MODE.upper(),
        "ai_mode": settings.AI_MODE.upper(),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }
