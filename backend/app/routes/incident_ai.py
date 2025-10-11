from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai.incident_ai import (
    assess_incident_severity,
    auto_classify_incident,
    detect_duplicate_incidents,
    forecast_incident_trend,
    recommend_escalation_path,
    recommend_investigation_timeline,
    suggest_resource_allocation,
    suggest_root_cause_factors,
)
from auth import require_roles
from database import get_db
from models import Incident, IncidentSeverity, IncidentStatus
from schemas import (
    IncidentClassificationRequest,
    IncidentClassificationResponse,
    IncidentDuplicateDetectionRequest,
    IncidentDuplicateDetectionResponse,
    IncidentEscalationRequest,
    IncidentEscalationResponse,
    IncidentInvestigationInsightsRequest,
    IncidentInvestigationInsightsResponse,
    IncidentResourceSuggestionRequest,
    IncidentResourceSuggestionResponse,
    IncidentSeverityAssessmentRequest,
    IncidentSeverityAssessmentResponse,
    IncidentTimelineRequest,
    IncidentTimelineResponse,
    IncidentTrendForecastRequest,
    IncidentTrendForecastResponse,
)

router = APIRouter(prefix="/incidents/ai", tags=["incidents-ai"])

READ_ROLES = ("Reader", "Editor", "Reviewer", "Admin", "Super Admin")
MANAGE_ROLES = ("Editor", "Reviewer", "Admin", "Super Admin")


@router.post("/forecast", response_model=IncidentTrendForecastResponse)
async def ai_forecast_trend(
    payload: IncidentTrendForecastRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentTrendForecastResponse:
    del current_user
    return forecast_incident_trend(payload)


@router.post("/classify", response_model=IncidentClassificationResponse)
async def ai_classify_incident(
    payload: IncidentClassificationRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentClassificationResponse:
    del current_user
    return auto_classify_incident(payload)


@router.post("/assess-severity", response_model=IncidentSeverityAssessmentResponse)
async def ai_assess_severity(
    payload: IncidentSeverityAssessmentRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentSeverityAssessmentResponse:
    del current_user
    return assess_incident_severity(
        description=payload.description,
        impact_assessment=payload.impact_assessment,
        immediate_actions=payload.immediate_actions,
    )


@router.post("/resources", response_model=IncidentResourceSuggestionResponse)
async def ai_resource_suggestion(
    payload: IncidentResourceSuggestionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentResourceSuggestionResponse:
    del current_user

    if payload.severity_distribution:
        distribution = payload.severity_distribution
    else:
        distribution = {payload.severity: max(1, payload.open_incident_count or 1)}

    open_incidents = payload.open_incident_count or (
        db.query(Incident)
        .filter(Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.UNDER_INVESTIGATION]))
        .count()
    )

    return suggest_resource_allocation(
        severity_distribution=distribution,
        open_incidents=open_incidents,
    )


@router.post("/detect-duplicates", response_model=IncidentDuplicateDetectionResponse)
async def ai_detect_duplicates(
    payload: IncidentDuplicateDetectionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(*MANAGE_ROLES)),
) -> IncidentDuplicateDetectionResponse:
    del current_user
    temp_incident = Incident(
        title=payload.title,
        detailed_description=payload.description,
        occurred_at=payload.occurred_at,
        incident_code="TEMP",
        reported_at=payload.occurred_at,
        severity=IncidentSeverity.MEDIUM,
        status=IncidentStatus.OPEN,
        impact_assessment="",
        what_happened=payload.description,
    )
    existing = (
        db.query(Incident)
        .order_by(Incident.reported_at.desc())
        .limit(25)
        .all()
    )
    return detect_duplicate_incidents(incident=temp_incident, existing_incidents=existing)


@router.post("/investigation-insights", response_model=IncidentInvestigationInsightsResponse)
async def ai_investigation_insights(
    payload: IncidentInvestigationInsightsRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentInvestigationInsightsResponse:
    del current_user
    return suggest_root_cause_factors(payload)


@router.post("/timeline", response_model=IncidentTimelineResponse)
async def ai_timeline(
    payload: IncidentTimelineRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentTimelineResponse:
    del current_user
    recommendation = recommend_investigation_timeline(
        incident_type=payload.incident_type,
        severity=payload.severity,
        occurred_at=payload.occurred_at,
    )
    return IncidentTimelineResponse(
        target_resolution_date=recommendation.target_resolution_date,
        timeline_guidance=recommendation.timeline_guidance,
        priority_rationale=recommendation.priority_rationale,
    )


@router.post("/escalation-path", response_model=IncidentEscalationResponse)
async def ai_escalation_path(
    payload: IncidentEscalationRequest,
    current_user=Depends(require_roles(*READ_ROLES)),
) -> IncidentEscalationResponse:
    del current_user
    steps = recommend_escalation_path(
        severity=payload.severity,
        department_id=payload.department_id,
    )
    return IncidentEscalationResponse(steps=steps)
