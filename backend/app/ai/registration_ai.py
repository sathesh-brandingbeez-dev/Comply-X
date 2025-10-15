"""AI-assisted insights for the registration and onboarding experience."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class IndustryProfile:
    headline_examples: List[str]
    recommended_modules: List[str]
    default_departments: List[str]
    framework_focus: List[str]


INDUSTRY_PROFILES: Dict[str, IndustryProfile] = {
    "manufacturing": IndustryProfile(
        headline_examples=[
            "Digitise ISO 9001 audits for production lines",
            "Automate supplier compliance monitoring",
            "Streamline safety incident escalation for plants",
        ],
        recommended_modules=[
            "Quality Management",
            "Corrective Actions",
            "Risk & Controls",
            "Supplier Governance",
        ],
        default_departments=[
            "Operations",
            "Quality Assurance",
            "Environmental Health & Safety",
            "Maintenance",
        ],
        framework_focus=["ISO 9001", "ISO 14001", "ISO 45001"],
    ),
    "financial services": IndustryProfile(
        headline_examples=[
            "Evidence SOX controls in a unified workspace",
            "Monitor AML/KYC obligations with proactive alerts",
            "Co-ordinate audit responses across risk teams",
        ],
        recommended_modules=[
            "Regulatory Change",
            "Audit Trail",
            "Policy Management",
            "Control Testing",
        ],
        default_departments=[
            "Compliance",
            "Risk Management",
            "Internal Audit",
            "Finance",
        ],
        framework_focus=["SOX", "PCI DSS", "Basel III"],
    ),
    "healthcare": IndustryProfile(
        headline_examples=[
            "Track HIPAA safeguards with automated reminders",
            "Connect device quality records to CAPA workflows",
            "Monitor clinical incident trends with AI narratives",
        ],
        recommended_modules=[
            "Clinical Incident Management",
            "Document Control",
            "Supplier Quality",
            "Training & Certification",
        ],
        default_departments=[
            "Clinical Governance",
            "Quality Assurance",
            "Risk Management",
            "IT Security",
        ],
        framework_focus=["HIPAA", "HITECH", "FDA CFR Part 11"],
    ),
    "technology": IndustryProfile(
        headline_examples=[
            "Operationalise SOC 2 controls with workflow automation",
            "Map product features to GDPR requirements",
            "Orchestrate vendor risk reviews with AI summaries",
        ],
        recommended_modules=[
            "Trust & Security",
            "Third-Party Risk",
            "Policy Lifecycle",
            "Incident Response",
        ],
        default_departments=[
            "Security",
            "Engineering",
            "Legal",
            "Customer Success",
        ],
        framework_focus=["SOC 2", "ISO 27001", "NIST CSF"],
    ),
    "retail": IndustryProfile(
        headline_examples=[
            "Co-ordinate PCI DSS evidence for store rollouts",
            "Monitor supplier compliance across regions",
            "Automate loss-prevention incident response",
        ],
        recommended_modules=[
            "Vendor Assurance",
            "Incident Command Centre",
            "Audit Management",
            "Training Automation",
        ],
        default_departments=[
            "Operations",
            "Finance",
            "Loss Prevention",
            "Human Resources",
        ],
        framework_focus=["PCI DSS", "GDPR"],
    ),
    "transportation & logistics": IndustryProfile(
        headline_examples=[
            "Monitor fleet compliance KPIs in real time",
            "Automate customs documentation validation",
            "Streamline maintenance incident reporting",
        ],
        recommended_modules=[
            "Fleet Compliance",
            "Document Vault",
            "Incident Management",
            "Audit Readiness",
        ],
        default_departments=[
            "Operations",
            "Safety",
            "Regulatory Affairs",
            "Security",
        ],
        framework_focus=["CTPAT", "AEO"],
    ),
    "energy & utilities": IndustryProfile(
        headline_examples=[
            "Align ISO 55001 asset controls with regulatory reporting",
            "Track environmental permits and remediation actions",
            "Automate incident escalation for field teams",
        ],
        recommended_modules=[
            "Asset Compliance",
            "Environmental Monitoring",
            "Risk Register",
            "Incident Response",
        ],
        default_departments=[
            "Operations",
            "Health & Safety",
            "Regulatory Affairs",
            "Asset Management",
        ],
        framework_focus=["ISO 14001", "NERC CIP"],
    ),
    "government": IndustryProfile(
        headline_examples=[
            "Centralise policy attestations for agencies",
            "Map risk treatments to legislative mandates",
            "Deliver transparency dashboards for oversight bodies",
        ],
        recommended_modules=[
            "Policy Portal",
            "Risk Register",
            "Internal Audit",
            "Stakeholder Reporting",
        ],
        default_departments=[
            "Policy",
            "Internal Audit",
            "Legal",
            "Operations",
        ],
        framework_focus=["NIST CSF", "GDPR"],
    ),
}


DEFAULT_PROFILE = IndustryProfile(
    headline_examples=[
        "Maintain a single source of truth for compliance evidence",
        "Automate reminders for critical obligations",
        "Collaborate on risk mitigation in real time",
    ],
    recommended_modules=[
        "Policy Management",
        "Incident Response",
        "Risk Register",
        "Audit Management",
    ],
    default_departments=[
        "Compliance",
        "Legal",
        "Risk Management",
        "Operations",
    ],
    framework_focus=["GDPR", "ISO 27001"],
)


COUNTRY_OVERRIDES: Dict[str, Dict[str, List[str]]] = {
    "us": {"framework_focus": ["SOX", "HIPAA", "NIST CSF"]},
    "gb": {"framework_focus": ["GDPR", "ISO 27001"]},
    "de": {"framework_focus": ["GDPR", "BaFin MaRisk"]},
    "in": {"framework_focus": ["ISO 27001", "DPDP"], "recommended_modules": ["Vendor Governance", "Policy Automation"]},
    "sg": {"framework_focus": ["MAS TRM", "GDPR"], "recommended_modules": ["Third-Party Risk", "Audit Readiness"]},
}


COMPANY_SIZE_SCALING: Dict[str, Dict[str, int]] = {
    "1-50 employees": {"timeline": 14, "review_cycles": 1},
    "51-200 employees": {"timeline": 21, "review_cycles": 2},
    "201-1000 employees": {"timeline": 30, "review_cycles": 2},
    "1001-5000 employees": {"timeline": 45, "review_cycles": 3},
    "5000+ employees": {"timeline": 60, "review_cycles": 4},
}


def normalise_key(value: Optional[str]) -> str:
    if not value:
        return "other"
    return value.strip().lower()


def get_industry_profile(industry: Optional[str]) -> IndustryProfile:
    key = normalise_key(industry)
    return INDUSTRY_PROFILES.get(key, DEFAULT_PROFILE)


def merge_profile(
    base: IndustryProfile,
    country: Optional[str] = None,
) -> IndustryProfile:
    overrides = COUNTRY_OVERRIDES.get(normalise_key(country), {})
    return IndustryProfile(
        headline_examples=base.headline_examples,
        recommended_modules=overrides.get("recommended_modules", base.recommended_modules),
        default_departments=base.default_departments,
        framework_focus=overrides.get("framework_focus", base.framework_focus),
    )


def estimate_setup_timeline(company_size: Optional[str]) -> Dict[str, int]:
    defaults = {"timeline": 28, "review_cycles": 2}
    return COMPANY_SIZE_SCALING.get(company_size or "", defaults)


def build_recommendations(
    industry: Optional[str],
    country: Optional[str],
    company_size: Optional[str],
) -> Dict[str, object]:
    profile = merge_profile(get_industry_profile(industry), country)
    timeline = estimate_setup_timeline(company_size)

    frameworks = profile.framework_focus
    if industry and "financial" in industry.lower() and country and country.lower() in {"uk", "gb"}:
        frameworks = list(dict.fromkeys(["FCA Handbook", *frameworks]))

    return {
        "recommended_modules": profile.recommended_modules,
        "suggested_departments": profile.default_departments,
        "framework_recommendations": frameworks,
        "estimated_setup_days": timeline["timeline"],
        "suggested_review_cycles": timeline["review_cycles"],
        "personalised_examples": profile.headline_examples,
    }


def get_personalised_examples(industry: Optional[str], country: Optional[str]) -> List[str]:
    data = build_recommendations(industry, country, None)
    return data["personalised_examples"]


__all__ = [
    "build_recommendations",
    "get_personalised_examples",
]
