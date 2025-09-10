from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from database import get_db
from auth import router as auth_router
from documents import router as documents_router
from organization import router as organization_router
from mfa import router as mfa_router
from document_assignments import router as document_assignments_router
from questionnaires import router as questionnaires_router
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fmea_router import router as fmea_router
from calendar_module import router as calendar_router
from app.routes.calendar_ai import router as calendar_ai_router


app = FastAPI(
    title="Comply-X API",
    description="A comprehensive compliance management system API with authentication, RBAC, and modular compliance tools.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "authentication",
            "description": "User authentication and authorization operations",
        },
        {
            "name": "users",
            "description": "User management operations",
        },
        {
            "name": "health",
            "description": "System health checks",
        },
        {
            "name": "documents",
            "description": "Document management operations",
        },
        {
            "name": "organization",
            "description": "Organization structure and user assignment operations",
        },
        {
            "name": "mfa",
            "description": "Multi-factor authentication and device management operations",
        },
        {
            "name": "document-assignments",
            "description": "Document assignment, scheduling, and cross-department tagging operations",
        },
        {
            "name": "questionnaires",
            "description": "Questionnaire builder and response collection operations",
        },
        {
            "name": "fmea",
            "description": "Failure Mode and Effects Analysis (FMEA) operations"
        },
        {
            "name": "calendar",
            "description": "Calendar management operations"
        },
        {
            "name": "calendar-ai",
            "description": "AI-powered calendar management operations"
        }
    ]
)

# CORS middleware

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # "https://comply-x-tyle.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(organization_router, prefix="/api/organization", tags=["organization"])
app.include_router(mfa_router, prefix="/api/mfa", tags=["mfa"])
app.include_router(document_assignments_router, prefix="/api/document-assignments", tags=["document-assignments"])
app.include_router(questionnaires_router, prefix="/api/questionnaires", tags=["questionnaires"])

@app.get("/")
async def root():
    return {"message": "Comply-X API is running"}

@app.get("/api/health", tags=["health"], summary="Health Check", description="Check if the API is running and healthy")
async def health_check():
    return {"status": "healthy", "message": "Comply-X API is running successfully"}


# app.mount("/_next", StaticFiles(directory="static/.next"), name="_next")
# app.mount("/public", StaticFiles(directory="static/public"), name="public")

# @app.get("/{full_path:path}")
# async def serve_frontend(full_path: str):
#     index_path = os.path.join("static", "public", "index.html")
#     if os.path.exists(index_path):
#         return FileResponse(index_path)
#     return {"message": "Comply-X API is running"}



# main.py

app.include_router(fmea_router)
app.include_router(calendar_router)
app.include_router(calendar_ai_router, prefix="/api")
