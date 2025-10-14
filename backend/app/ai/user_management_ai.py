"""AI heuristics for the User Management module."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from models import UserRole
from schemas import (
    UserManagementAIInsights,
    UserManagementAIRequest,
    UserManagementAIResponse,
    UserManagementOnboardingStepInput,
)


@dataclass(frozen=True)
class _RoleProfile:
    baseline_permissions: List[str]
    onboarding_steps: List[Dict[str, object]]
    focus_areas: List[str]
    risk_prompts: List[str]
    resource_suggestions: List[str]


_ROLE_PROFILES: Dict[UserRole, _RoleProfile] = {
    UserRole.SUPER_ADMIN: _RoleProfile(
        baseline_permissions=[
            "Global platform administration",
            "Security policy management",
            "Integration governance",
        ],
        onboarding_steps=[
            {
                "title": "Enterprise security and compliance orientation",
                "owner_role": "Chief Compliance Officer",
                "due_in_days": 3,
                "notes": "Review corporate risk posture, regulatory boundaries, and executive escalation paths.",
            },
            {
                "title": "Platform configuration deep dive",
                "owner_role": "IT Security Lead",
                "due_in_days": 7,
                "notes": "Validate SSO, audit logging, and data residency controls for all regions.",
            },
            {
                "title": "Leadership stakeholder alignment",
                "owner_role": "CEO / COO",
                "due_in_days": 14,
                "notes": "Agree on quarterly compliance objectives and reporting cadence.",
            },
        ],
        focus_areas=[
            "Cross-module access governance",
            "Regulatory intelligence integration",
            "Executive level reporting precision",
        ],
        risk_prompts=[
            "Validate segregation of duties for privileged roles",
            "Monitor anomalous access patterns across subsidiaries",
        ],
        resource_suggestions=[
            "Executive compliance dashboard", "Regulatory change monitoring service"
        ],
    ),
    UserRole.ADMIN: _RoleProfile(
        baseline_permissions=[
            "User lifecycle administration",
            "Policy publishing",
            "Incident oversight",
        ],
        onboarding_steps=[
            {
                "title": "Security and governance bootcamp",
                "owner_role": "Security Manager",
                "due_in_days": 5,
                "notes": "Cover MFA policy, password rotations, and privileged access reviews.",
            },
            {
                "title": "Module configuration labs",
                "owner_role": "Compliance Platform Specialist",
                "due_in_days": 10,
                "notes": "Hands-on configuration of documents, audits, incidents, and risk workflows.",
            },
            {
                "title": "Shadow existing administrator",
                "owner_role": "Lead Administrator",
                "due_in_days": 15,
                "notes": "Observe escalation handling and advanced permission delegation.",
            },
        ],
        focus_areas=[
            "Access provisioning discipline",
            "Audit trail accuracy",
            "Cross-functional coordination",
        ],
        risk_prompts=[
            "Ensure quarterly permission recertification",
            "Track dormant high-privilege accounts",
        ],
        resource_suggestions=["Admin playbook", "Change management templates"],
    ),
    UserRole.MANAGER: _RoleProfile(
        baseline_permissions=[
            "Team level document review",
            "Risk assessment approvals",
            "Incident triage",
        ],
        onboarding_steps=[
            {
                "title": "Department compliance orientation",
                "owner_role": "Compliance Manager",
                "due_in_days": 4,
                "notes": "Clarify departmental KPIs, reporting lines, and escalation protocols.",
            },
            {
                "title": "Workflow coaching session",
                "owner_role": "Process Excellence Lead",
                "due_in_days": 9,
                "notes": "Optimise review cycles and stakeholder notifications for the team.",
            },
            {
                "title": "Risk dashboard familiarisation",
                "owner_role": "Risk Analyst",
                "due_in_days": 12,
                "notes": "Interpret heat maps, mitigation scores, and predictive alerts.",
            },
        ],
        focus_areas=[
            "Team adoption coaching",
            "Performance analytics interpretation",
            "Cross-team knowledge transfer",
        ],
        risk_prompts=[
            "Watch for bottlenecks in document approvals",
            "Review team workload balance for assurance tasks",
        ],
        resource_suggestions=["Manager enablement toolkit", "Performance dashboards"],
    ),
    UserRole.AUDITOR: _RoleProfile(
        baseline_permissions=[
            "Audit programme management",
            "Corrective action oversight",
            "Evidence library access",
        ],
        onboarding_steps=[
            {
                "title": "Regulatory framework refresher",
                "owner_role": "Head of Internal Audit",
                "due_in_days": 5,
                "notes": "Align on audit scope, sampling strategy, and documentation expectations.",
            },
            {
                "title": "Digital evidence capture training",
                "owner_role": "Quality Systems Lead",
                "due_in_days": 8,
                "notes": "Standardise tagging, retention, and traceability practices.",
            },
            {
                "title": "AI-assisted analytics walkthrough",
                "owner_role": "Data Insights Team",
                "due_in_days": 12,
                "notes": "Leverage predictive scoring for audit planning and sampling.",
            },
        ],
        focus_areas=[
            "Consistency of audit trails",
            "Automation of follow-up actions",
            "Continuous monitoring insights",
        ],
        risk_prompts=[
            "Validate evidence authenticity before closure",
            "Monitor backlog of outstanding audit findings",
        ],
        resource_suggestions=["Audit analytics workspace", "Sampling automation toolkit"],
    ),
    UserRole.EMPLOYEE: _RoleProfile(
        baseline_permissions=[
            "Document acknowledgement",
            "Issue reporting",
            "Task collaboration",
        ],
        onboarding_steps=[
            {
                "title": "Platform essentials onboarding",
                "owner_role": "HR Business Partner",
                "due_in_days": 3,
                "notes": "Complete compliance orientation modules and confirm policy acknowledgements.",
            },
            {
                "title": "Role-specific training journey",
                "owner_role": "Team Lead",
                "due_in_days": 7,
                "notes": "Tailored walkthrough of daily workflows and escalation triggers.",
            },
            {
                "title": "Mentor check-in",
                "owner_role": "Assigned Mentor",
                "due_in_days": 14,
                "notes": "Address questions, capture feedback, and reinforce key controls.",
            },
        ],
        focus_areas=[
            "Policy comprehension",
            "Timely task execution",
            "Issue escalation confidence",
        ],
        risk_prompts=[
            "Monitor overdue policy attestations",
            "Review incident reporting cadence for gaps",
        ],
        resource_suggestions=["Employee knowledge base", "Learning portal playlist"],
    ),
    UserRole.VIEWER: _RoleProfile(
        baseline_permissions=[
            "Read-only dashboards",
            "Policy viewer",
        ],
        onboarding_steps=[
            {
                "title": "Read-only orientation",
                "owner_role": "Compliance Coordinator",
                "due_in_days": 2,
                "notes": "Cover navigation, filtering, and exporting of compliance dashboards.",
            },
            {
                "title": "Observation feedback loop",
                "owner_role": "Quality Lead",
                "due_in_days": 6,
                "notes": "Define how observations are raised and triaged.",
            },
        ],
        focus_areas=[
            "Visibility into key KPIs",
            "Escalation expectations",
        ],
        risk_prompts=[
            "Ensure reports are shared securely",
        ],
        resource_suggestions=["Reporting quick reference", "Observation register"],
    ),
}


def _score_from_profile(profile: _RoleProfile, payload: UserManagementAIRequest) -> float:
    """Create a workforce health score using heuristics from the payload."""

    score = 72.0
    if payload.experience_level == "junior":
        score -= 6
    elif payload.experience_level == "senior":
        score += 4

    if payload.requires_mfa:
        score += 3

    if payload.remote_worker:
        score -= 2

    # More tooling leads to more complexity -> small deduction to highlight enablement need
    score -= min(6, len(payload.tool_stack) * 1.5)

    # Higher risk prompts increase focus -> adjust down slightly
    score -= len(profile.risk_prompts) * 1.0

    return max(40.0, min(95.0, score))


def generate_user_management_intelligence(payload: UserManagementAIRequest) -> UserManagementAIResponse:
    profile = _ROLE_PROFILES.get(payload.role, _ROLE_PROFILES[UserRole.EMPLOYEE])

    recommended_steps = [
        UserManagementOnboardingStepInput(
            title=step["title"],
            owner_role=step.get("owner_role"),
            due_in_days=step.get("due_in_days"),
            notes=step.get("notes"),
        )
        for step in profile.onboarding_steps
    ]

    if payload.requires_mfa:
        recommended_steps.insert(
            0,
            UserManagementOnboardingStepInput(
                title="Multi-factor authentication enrolment",
                owner_role="IT Security",
                due_in_days=1,
                notes="Enroll the user in MFA and validate backup factors are configured.",
            ),
        )

    if payload.remote_worker:
        recommended_steps.append(
            UserManagementOnboardingStepInput(
                title="Remote workplace readiness",
                owner_role="IT Support",
                due_in_days=5,
                notes="Confirm secure connectivity, device hardening, and remote support contacts.",
            )
        )

    for tool in payload.tool_stack[:3]:
        recommended_steps.append(
            UserManagementOnboardingStepInput(
                title=f"Enable access to {tool}",
                owner_role="Platform Owner",
                due_in_days=4,
                notes=f"Provision access and confirm training completion for {tool}.",
            )
        )

    recommended_permissions = list(profile.baseline_permissions)
    if payload.responsibilities:
        recommended_permissions.append(
            f"Custom responsibilities: {', '.join(payload.responsibilities[:3])}"
        )

    resource_recommendations = list(profile.resource_suggestions)
    if payload.remote_worker:
        resource_recommendations.append("Remote onboarding knowledge base")

    workforce_health_score = _score_from_profile(profile, payload)

    risk_alerts = list(profile.risk_prompts)
    if payload.remote_worker:
        risk_alerts.append("Remote access monitoring required")
    if payload.requires_mfa:
        risk_alerts.append("Validate MFA backup methods and recovery codes")

    recommended_focus = list(profile.focus_areas)
    if payload.experience_level == "junior":
        recommended_focus.append("Provide extra mentoring touchpoints during first month")
    elif payload.experience_level == "senior":
        recommended_focus.append("Leverage expertise for peer coaching and process optimisation")

    narrative = (
        f"Projected onboarding health score of {workforce_health_score:.0f}. "
        "Focus on reinforcing "
        f"{recommended_focus[0].lower()} and closing {risk_alerts[0].lower()} to accelerate readiness."
    )

    insights = UserManagementAIInsights(
        workforce_health_score=round(workforce_health_score, 1),
        risk_alerts=risk_alerts,
        recommended_focus=recommended_focus,
        resource_recommendations=resource_recommendations,
        narrative=narrative,
    )

    return UserManagementAIResponse(
        insights=insights,
        recommended_steps=recommended_steps,
        recommended_permissions=recommended_permissions,
        resource_recommendations=resource_recommendations,
    )


__all__ = ["generate_user_management_intelligence"]
