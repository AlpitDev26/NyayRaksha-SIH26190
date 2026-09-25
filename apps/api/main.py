import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import NyayaVaultException
from app.core.logging import logger
from app.db.seed import seed_database
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lifecycle startup hook
    logger.info("Initializing NyayaVault database tables and seed state...")
    try:
        await init_db()
        await seed_database()
        logger.info("NyayaVault backend engine ready.")
    except Exception as e:
        logger.error(f"Initialization warning: {e}")
    yield
    logger.info("NyayaVault backend shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Tamper-evident legal and investigation document management with verifiable chain of custody (SIH 26190).",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Strict CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# Standardized Domain Exception Handler
@app.exception_handler(NyayaVaultException)
async def nyayavault_exception_handler(request: Request, exc: NyayaVaultException):
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.detail,
    )


# Generic Internal Exception Handler (hiding stack traces from clients)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "An internal error occurred. Please contact the system administrator.", "code": "INTERNAL_ERROR"},
    )


# Mount API Routers
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "tagline": "Tamper-evident legal and investigation document management with verifiable chain of custody.",
        "problem_statement_id": "26190",
        "api_docs": "/docs",
        "version": "2.0.0",
        "status": "OPERATIONAL",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=(settings.APP_ENV == "development"),
    )
