from __future__ import annotations

import json
from typing import Dict, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from auth import get_password_hash
from database import get_db
from models import RegistrationRequest
from schemas import (
    CompanyRegistrationRequest,
    CompanyRegistrationResponse,
    LandingPersonalizationResponse,
    QuickCompanyRegistrationRequest,
    RegistrationDepartment,
    RegistrationFramework,
    RegistrationSuggestionResponse,
)


router = APIRouter(prefix="/registration", tags=["registration"])


_INDUSTRY_FRAMEWORKS: Dict[str, List[RegistrationFramework]] = {
    "Financial Services": [
        RegistrationFramework(key="sox", label="SOX (Sarbanes-Oxley Act)", category="Financial Services", estimated_timeline="6-9 months"),
        RegistrationFramework(key="pci_dss", label="PCI DSS", category="Financial Services", estimated_timeline="3-6 months"),
        RegistrationFramework(key="gdpr", label="GDPR", category="Financial Services", estimated_timeline="6-12 months"),
        RegistrationFramework(key="basel_iii", label="Basel III", category="Financial Services", estimated_timeline="12 months"),
    ],
    "Healthcare": [
        RegistrationFramework(key="hipaa", label="HIPAA", category="Healthcare", estimated_timeline="6-9 months"),
        RegistrationFramework(key="fda_cfr_11", label="FDA CFR Part 11", category="Healthcare", estimated_timeline="9 months"),
        RegistrationFramework(key="hitech", label="HITECH Act", category="Healthcare", estimated_timeline="6 months"),
    ],
    "Manufacturing": [
        RegistrationFramework(key="iso_9001", label="ISO 9001", category="Manufacturing", estimated_timeline="6-9 months"),
        RegistrationFramework(key="iso_14001", label="ISO 14001", category="Manufacturing", estimated_timeline="6 months"),
        RegistrationFramework(key="iso_45001", label="ISO 45001", category="Manufacturing", estimated_timeline="6-9 months"),
    ],
    "Technology": [
        RegistrationFramework(key="soc2", label="SOC 2", category="Technology", estimated_timeline="6 months"),
        RegistrationFramework(key="iso_27001", label="ISO 27001", category="Technology", estimated_timeline="9 months"),
        RegistrationFramework(key="nist_csf", label="NIST Cybersecurity Framework", category="Technology", estimated_timeline="6 months"),
    ],
    "Customs & Trade": [
        RegistrationFramework(key="aeo", label="AEO", category="Customs & Trade", estimated_timeline="9 months"),
        RegistrationFramework(key="ctpat", label="C-TPAT", category="Customs & Trade", estimated_timeline="6 months"),
        RegistrationFramework(key="ctpat_anti_terror", label="CTPAT Anti-terror", category="Customs & Trade", estimated_timeline="6 months"),
    ],
}


_DEFAULT_DEPARTMENTS: Dict[str, List[RegistrationDepartment]] = {
    "default": [
        RegistrationDepartment(name="Compliance", description="Compliance management and oversight"),
        RegistrationDepartment(name="Legal", description="Legal affairs and contract management"),
        RegistrationDepartment(name="Finance", description="Financial operations and reporting"),
        RegistrationDepartment(name="Operations", description="Operational processes and procedures"),
        RegistrationDepartment(name="Human Resources", description="HR policies and employee management"),
    ],
    "Healthcare": [
        RegistrationDepartment(name="Clinical Compliance", description="Clinical operations and regulatory adherence"),
        RegistrationDepartment(name="Patient Privacy", description="HIPAA privacy and security administration"),
    ],
    "Financial Services": [
        RegistrationDepartment(name="Risk & Controls", description="Enterprise risk and controls governance"),
        RegistrationDepartment(name="AML & KYC", description="Anti-money laundering and customer due diligence"),
    ],
    "Manufacturing": [
        RegistrationDepartment(name="Quality Assurance", description="Product quality and continuous improvement"),
        RegistrationDepartment(name="EHS", description="Environmental health and safety compliance"),
    ],
}


def _resolve_departments(industry: str) -> List[RegistrationDepartment]:
    base = list(_DEFAULT_DEPARTMENTS["default"])
    industry_departments = _DEFAULT_DEPARTMENTS.get(industry)
    if industry_departments:
        base.extend(industry_departments)
    return base


def _resolve_frameworks(industry: str) -> List[RegistrationFramework]:
    frameworks = _INDUSTRY_FRAMEWORKS.get(industry)
    if frameworks:
        return frameworks
    # Provide a mixed default set if industry unknown
    return [
        RegistrationFramework(key="soc2", label="SOC 2", category="Technology", estimated_timeline="6 months"),
        RegistrationFramework(key="iso_27001", label="ISO 27001", category="Technology", estimated_timeline="9 months"),
        RegistrationFramework(key="gdpr", label="GDPR", category="General", estimated_timeline="6-12 months"),
    ]


def _estimate_setup_time(company_size: str, frameworks: List[RegistrationFramework]) -> str:
    base_months = 3
    size_multiplier = {
        "1-50 employees": 1,
        "51-200 employees": 2,
        "201-1000 employees": 3,
        "1001-5000 employees": 4,
        "5000+ employees": 5,
    }.get(company_size, 2)
    framework_multiplier = max(1, len(frameworks))
    total_months = base_months + size_multiplier + framework_multiplier
    return f"Approximately {total_months}-{total_months + 3} weeks"


def _summarize_recommendations(industry: str, frameworks: List[RegistrationFramework]) -> str:
    framework_names = ", ".join(f.label for f in frameworks[:3])
    return (
        f"Based on {industry} peers we recommend prioritising {framework_names}. "
        "Comply-X will auto-configure tasks, owners, and evidence libraries so you can launch faster."
    )


@router.get("/personalize", response_model=LandingPersonalizationResponse)
def personalize_landing(industry: str = "Technology") -> LandingPersonalizationResponse:
    frameworks = _resolve_frameworks(industry)
    examples = [
        f"Automate {framework.label} control testing",
        f"Monitor {framework.category} compliance deadlines",
    ][:2]
    modules = ["Policy Automation", "Control Monitoring", "AI Evidence Collection"]
    return LandingPersonalizationResponse(
        industry=industry,
        headline="Smart Compliance Management Platform",
        subheadline="Streamline compliance processes with AI-powered automation",
        dynamic_examples=examples,
        recommended_modules=modules,
        testimonial=f"Leading {industry} teams close audits 40% faster with Comply-X.",
        ai_summary=_summarize_recommendations(industry, frameworks),
    )


@router.get("/suggestions", response_model=RegistrationSuggestionResponse)
def registration_suggestions(industry: str = "Technology", company_size: str = "51-200 employees") -> RegistrationSuggestionResponse:
    frameworks = _resolve_frameworks(industry)
    departments = _resolve_departments(industry)
    estimated_setup_time = _estimate_setup_time(company_size, frameworks)
    recommended_modules = [
        "AI Policy Assistant",
        "Automated Evidence Collection",
        "Real-time Control Monitoring",
    ]
    return RegistrationSuggestionResponse(
        industry=industry,
        frameworks=frameworks,
        departments=departments,
        recommended_modules=recommended_modules,
        estimated_setup_time=estimated_setup_time,
    )


@router.post("/wizard", response_model=CompanyRegistrationResponse, status_code=status.HTTP_201_CREATED)
def submit_wizard_registration(
    payload: CompanyRegistrationRequest,
    db: Session = Depends(get_db),
):
    hashed_password = get_password_hash(payload.password)

    frameworks_json = json.dumps([framework.model_dump() for framework in payload.frameworks])
    departments_json = json.dumps([department.model_dump() for department in payload.departments])
    custom_frameworks_json = json.dumps([framework.model_dump() for framework in payload.custom_frameworks])

    registration = RegistrationRequest(
        company_name=payload.company_name,
        industry=payload.industry,
        company_size=payload.company_size,
        country=payload.country,
        time_zone=payload.time_zone,
        website=str(payload.website) if payload.website else None,
        admin_first_name=payload.admin_first_name,
        admin_last_name=payload.admin_last_name,
        admin_email=payload.admin_email,
        admin_phone=payload.admin_phone,
        admin_job_title=payload.admin_job_title,
        admin_department=payload.admin_department,
        admin_password_hash=hashed_password,
        permission_level=payload.permission_level,
        role=payload.role,
        departments=departments_json,
        frameworks=frameworks_json,
        custom_frameworks=custom_frameworks_json,
        ai_recommendations=_summarize_recommendations(payload.industry, payload.frameworks),
        quick_setup=False,
        setup_score=payload.setup_score,
    )

    db.add(registration)
    db.commit()
    db.refresh(registration)

    recommended_actions = [
        "Share onboarding checklist with implementation team",
        "Schedule compliance readiness workshop",
        "Review AI-generated control library",
    ]

    return CompanyRegistrationResponse(
        registration_id=registration.id,
        status=registration.status,
        recommended_actions=recommended_actions,
        setup_score=registration.setup_score,
    )


@router.post("/quick", response_model=CompanyRegistrationResponse, status_code=status.HTTP_201_CREATED)
def submit_quick_registration(
    payload: QuickCompanyRegistrationRequest,
    db: Session = Depends(get_db),
):
    hashed_password = get_password_hash(payload.password)

    inferred_departments = _resolve_departments(payload.industry)
    inferred_frameworks = _resolve_frameworks(payload.industry)
    frameworks_json = json.dumps([framework.model_dump() for framework in inferred_frameworks])
    departments_json = json.dumps([department.model_dump() for department in inferred_departments])

    registration = RegistrationRequest(
        company_name=payload.company_name,
        industry=payload.industry,
        company_size=payload.company_size,
        country=payload.country,
        time_zone="UTC",
        website=str(payload.website) if payload.website else None,
        admin_first_name=payload.admin_first_name,
        admin_last_name=payload.admin_last_name,
        admin_email=payload.admin_email,
        admin_job_title="Administrator",
        admin_department="Compliance",
        admin_password_hash=hashed_password,
        permission_level=payload.permission_level,
        role=payload.role,
        departments=departments_json if payload.use_default_departments else None,
        frameworks=frameworks_json if payload.use_standard_frameworks else None,
        ai_recommendations=_summarize_recommendations(payload.industry, inferred_frameworks),
        quick_setup=True,
        setup_score=payload.setup_score,
    )

    db.add(registration)
    db.commit()
    db.refresh(registration)

    recommended_actions = [
        "Invite department leads to configure access",
        "Enable AI onboarding assistant",
        "Verify MFA for administrator account",
    ]

    return CompanyRegistrationResponse(
        registration_id=registration.id,
        status=registration.status,
        recommended_actions=recommended_actions,
        setup_score=registration.setup_score,
    )

