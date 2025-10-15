"""Public endpoints that power the guided company registration experience."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AnyUrl, BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from auth import get_password_hash, get_user_by_email
from database import get_db
from models import PermissionLevel, RegistrationSubmission, UserRole

router = APIRouter(prefix="/registration", tags=["registration"])

# --- Pydantic models -------------------------------------------------------


class CompanyInfo(BaseModel):
    name: str = Field(..., max_length=100)
    industry: str
    company_size: str = Field(..., alias="companySize")
    country: str
    time_zone: str = Field(..., alias="timeZone")
    website: Optional[AnyUrl] = None

    class Config:
        populate_by_name = True


class AdministratorInfo(BaseModel):
    first_name: str = Field(..., max_length=50)
    last_name: str = Field(..., max_length=50)
    email: EmailStr
    phone_number: Optional[str] = Field(default=None, alias="phoneNumber")
    job_title: str = Field(..., max_length=100, alias="jobTitle")
    department: str
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8, alias="confirmPassword")
    agree_terms: bool = Field(..., alias="agreeToTerms")

    class Config:
        populate_by_name = True


class DepartmentInput(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    parent_department: Optional[str] = Field(default=None, alias="parentDepartment")

    class Config:
        populate_by_name = True


class FrameworkInput(BaseModel):
    name: str = Field(..., max_length=150)
    category: Optional[str] = None
    description: Optional[str] = Field(default=None, max_length=500)
    is_custom: bool = Field(default=False, alias="isCustom")

    class Config:
        populate_by_name = True


class QuickSetupOptions(BaseModel):
    use_default_departments: bool = Field(default=True, alias="useDefaultDepartments")
    configure_departments_later: bool = Field(default=False, alias="configureDepartmentsLater")
    use_standard_frameworks: bool = Field(default=True, alias="useStandardFrameworks")
    configure_frameworks_later: bool = Field(default=False, alias="configureFrameworksLater")

    class Config:
        populate_by_name = True


class RegistrationPayload(BaseModel):
    setup_mode: Literal["guided", "quick"] = Field(..., alias="setupMode")
    company: CompanyInfo
    administrator: AdministratorInfo
    departments: List[DepartmentInput] = []
    frameworks: List[FrameworkInput] = []
    quick_options: Optional[QuickSetupOptions] = Field(default=None, alias="quickOptions")
    ai_recommendations: Optional[Dict[str, Any]] = Field(default=None, alias="aiRecommendations")

    class Config:
        populate_by_name = True


class RegistrationResponse(BaseModel):
    submission_id: int
    created_at: datetime
    message: str
    permission_level: PermissionLevel = PermissionLevel.ADMIN


# --- Helpers ----------------------------------------------------------------

PASSWORD_PATTERN = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]).{8,}$")


DISPOSABLE_EMAIL_DOMAINS = {
    "mailinator.com",
    "10minutemail.com",
    "tempmail.com",
    "yopmail.com",
    "guerrillamail.com",
    "trashmail.com",
    "dispostable.com",
    "fakeinbox.com",
    "getnada.com",
    "maildrop.cc",
}


DEFAULT_DEPARTMENTS: Dict[str, List[str]] = {
    "default": [
        "Compliance",
        "Legal",
        "Finance",
        "Operations",
        "Human Resources",
        "Risk Management",
        "Quality Assurance",
    ],
    "manufacturing": [
        "Operations",
        "Quality Assurance",
        "Environmental Health & Safety",
        "Supply Chain",
        "Maintenance",
    ],
    "financial services": [
        "Compliance",
        "Risk Management",
        "Internal Audit",
        "Finance",
        "Operations",
    ],
    "healthcare": [
        "Clinical Governance",
        "Risk Management",
        "Quality Assurance",
        "IT Security",
    ],
    "technology": [
        "Security",
        "Engineering",
        "Legal",
        "Customer Success",
    ],
    "retail": [
        "Operations",
        "Finance",
        "Loss Prevention",
        "Human Resources",
    ],
    "transportation & logistics": [
        "Operations Control",
        "Safety",
        "Regulatory Affairs",
        "Security",
    ],
    "energy & utilities": [
        "Operations",
        "Health & Safety",
        "Regulatory Affairs",
        "Asset Management",
    ],
    "government": [
        "Policy",
        "Internal Audit",
        "Legal",
        "Operations",
    ],
}


def ensure_password_strength(password: str) -> None:
    if not PASSWORD_PATTERN.match(password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must include uppercase, lowercase, number, and special character",
        )


def ensure_terms_accepted(agree_terms: bool) -> None:
    if not agree_terms:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Terms of Service and Privacy Policy must be accepted",
        )


def ensure_email_is_unique(db: Session, email: str) -> None:
    existing = get_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )


def ensure_email_domain_is_allowed(email: str) -> None:
    try:
        domain = email.split("@", 1)[1].lower()
    except IndexError as exc:  # pragma: no cover - guarded by pydantic validation
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email domain is invalid",
        ) from exc

    if "." not in domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email domain is invalid",
        )

    if domain in DISPOSABLE_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disposable email addresses are not permitted",
        )


def map_departments_for_storage(payload: List[DepartmentInput]) -> List[Dict[str, Optional[str]]]:
    return [dept.model_dump(by_alias=True) for dept in payload]


def map_frameworks_for_storage(payload: List[FrameworkInput]) -> List[Dict[str, Optional[str]]]:
    return [framework.model_dump(by_alias=True) for framework in payload]


# --- Routes -----------------------------------------------------------------


@router.get("/default-departments", response_model=List[str], summary="Get default department suggestions")
async def get_default_departments(industry: Optional[str] = None) -> List[str]:
    key = (industry or "").strip().lower()
    return DEFAULT_DEPARTMENTS.get(key, DEFAULT_DEPARTMENTS["default"])


@router.post("/company", response_model=RegistrationResponse, summary="Submit company registration")
async def submit_company_registration(
    payload: RegistrationPayload,
    db: Session = Depends(get_db),
) -> RegistrationResponse:
    ensure_terms_accepted(payload.administrator.agree_terms)
    ensure_password_strength(payload.administrator.password)
    ensure_email_domain_is_allowed(payload.administrator.email)

    # Prevent duplicate administrator accounts
    ensure_email_is_unique(db, payload.administrator.email)

    if payload.administrator.password != payload.administrator.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    password_hash = get_password_hash(payload.administrator.password)

    submission = RegistrationSubmission(
        setup_mode=payload.setup_mode,
        company_name=payload.company.name,
        industry=payload.company.industry,
        company_size=payload.company.company_size,
        country=payload.company.country,
        time_zone=payload.company.time_zone,
        website=str(payload.company.website) if payload.company.website else None,
        admin_first_name=payload.administrator.first_name,
        admin_last_name=payload.administrator.last_name,
        admin_email=payload.administrator.email,
        admin_phone=payload.administrator.phone_number,
        admin_job_title=payload.administrator.job_title,
        admin_department=payload.administrator.department,
        admin_password_hash=password_hash,
        ai_recommendations=payload.ai_recommendations,
        department_payload=map_departments_for_storage(payload.departments),
        framework_payload=map_frameworks_for_storage(payload.frameworks),
        quick_options=payload.quick_options.model_dump(by_alias=True) if payload.quick_options else None,
        submission_metadata={
            "setup_mode": payload.setup_mode,
            "permission_level": PermissionLevel.ADMIN.value,
            "role": UserRole.ADMIN.value,
        },
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return RegistrationResponse(
        submission_id=submission.id,
        created_at=submission.created_at or datetime.utcnow(),
        message="Registration received. Our team will reach out to activate your workspace.",
        permission_level=PermissionLevel.ADMIN,
    )
