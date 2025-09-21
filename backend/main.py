# # main.py
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# # your routers
# from auth import router as auth_router
# from documents import router as documents_router
# from organization import router as organization_router
# from mfa import router as mfa_router
# from document_assignments import router as document_assignments_router
# from questionnaires import router as questionnaires_router
# from fmea_router import router as fmea_router
# from calendar_module import router as calendar_router
# from app.routes.calendar_ai import router as calendar_ai_router

# app = FastAPI(
#     title="Comply-X API",
#     description="Compliance management system API",
#     version="1.0.0",
#     docs_url="/docs",
#     redoc_url="/redoc",
# )

# # IMPORTANT: allow your frontend origins (add/remove as needed)
# ALLOWED_ORIGINS = [
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
#     # add vite dev if you use it:
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=ALLOWED_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
#     allow_headers=[
#         "Accept",
#         "Accept-Language",
#         "Content-Language",
#         "Content-Type",
#         "Authorization",
#         "X-Requested-With",
#         "Origin",
#         "Access-Control-Request-Method",
#         "Access-Control-Request-Headers",
#     ],
#     expose_headers=["*"],
# )

# @app.get("/")
# async def root():
#     return {"message": "Comply-X API is running"}

# @app.get("/api/health", tags=["health"], summary="Health Check")
# async def health_check():
#     return {"status": "healthy", "message": "Comply-X API is running successfully"}

# # Mount everything under /api so the frontend path /api/... works
# app.include_router(auth_router,               prefix="/api/auth",               tags=["authentication"])
# app.include_router(documents_router,          prefix="/api/documents",          tags=["documents"])
# app.include_router(organization_router,       prefix="/api/organization",       tags=["organization"])
# app.include_router(mfa_router,                prefix="/api/mfa",                tags=["mfa"])
# app.include_router(document_assignments_router, prefix="/api/document-assignments", tags=["document-assignments"])
# app.include_router(questionnaires_router,     prefix="/api/questionnaires",     tags=["questionnaires"])
# app.include_router(fmea_router,               prefix="/api/fmea",               tags=["fmea"])

# # ⬇️ Ensure calendar endpoints are reachable at /api/calendar/...
# # (even if the router itself already has a prefix, this keeps it correct)
# app.include_router(calendar_router,           prefix="/api",           tags=["calendar"])

# # If the calendar_ai router expects to be under /api already, keep this:
# app.include_router(calendar_ai_router,        prefix="/api",                    tags=["calendar-ai"])


# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from documents import router as documents_router
from organization import router as organization_router
from mfa import router as mfa_router
from document_assignments import router as document_assignments_router
from questionnaires import router as questionnaires_router
from fmea_router import router as fmea_router
# from calendar_module import router as calendar_module_router
# from app.routes.calendar_ai import router as calendar_ai_router
from calendar_api import router as calendar_api_router

try:
    from app.routes.calendar_ai import router as calendar_ai_router
except Exception:
    calendar_ai_router = None

try:
    from app.routes.fmea_ai import router as fmea_ai_router
except Exception:
    fmea_ai_router = None

try:
    from app.routes.document_ai import router as document_ai_router
except Exception:
    document_ai_router = None

# ⬇️ import your models Base and engine
from models import Base
from database import engine

app = FastAPI(
    title="Comply-X API",
    description="Compliance management system API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    # allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_methods=["*"],
    # allow_headers=[
    #     "Accept","Accept-Language","Content-Language","Content-Type","Authorization",
    #     "X-Requested-With","Origin","Access-Control-Request-Method","Access-Control-Request-Headers",
    # ],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.on_event("startup")
def _create_tables_on_startup():
    # Safe to call repeatedly; will only create missing tables
    Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "Comply-X API is running"}

@app.get("/api/health", tags=["health"], summary="Health Check")
async def health_check():
    return {"status": "healthy", "message": "Comply-X API is running successfully"}

# Routers (your prefixes as you currently have them)
app.include_router(auth_router,                 prefix="/api/auth",                  tags=["authentication"])
app.include_router(documents_router,            prefix="/api/documents",             tags=["documents"])
app.include_router(organization_router,         prefix="/api/organization",          tags=["organization"])
app.include_router(mfa_router,                  prefix="/api/mfa",                   tags=["mfa"])
app.include_router(document_assignments_router, prefix="/api/document-assignments",  tags=["document-assignments"])
app.include_router(questionnaires_router,       prefix="/api/questionnaires",        tags=["questionnaires"])
app.include_router(fmea_router,                 prefix="/api",                       tags=["fmea"])
# app.include_router(calendar_module_router,      prefix="/api",                       tags=["calendar"])
# app.include_router(calendar_ai_router,          prefix="/api",                       tags=["calendar-ai"])
app.include_router(calendar_api_router)

if calendar_ai_router:
    # most AI examples use router without a prefix; put it under /api
    app.include_router(calendar_ai_router,      prefix="/api",                      tags=["calendar-ai"])

if fmea_ai_router:
    app.include_router(fmea_ai_router,          prefix="/api",                      tags=["fmea-ai"])

if document_ai_router:
    app.include_router(document_ai_router,     prefix="/api",                      tags=["documents-ai"])

# Optional: manual init endpoint if you ever need to click it
@app.post("/api/dev/init-db", tags=["health"])
def init_db_now():
    Base.metadata.create_all(bind=engine)
    return {"ok": True}
