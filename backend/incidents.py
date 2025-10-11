from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.ai.incident_ai import (
    assess_incident_severity,
    detect_duplicate_incidents,
    forecast_incident_trend,
    recommend_escalation_path,
    recommend_investigation_timeline,
    suggest_resource_allocation,
    suggest_root_cause_factors,
)
from auth import get_current_user, require_roles
from database import get_db
from models import (
    Department,
    Incident,
    IncidentAttachment,
    IncidentInvestigation,
    IncidentInvestigationActivity,
    IncidentPriority,
    IncidentRootCauseFactor,
    IncidentSeverity,
    IncidentStatus,
    InvestigationActivityType,
    Site,
    User,
)
from schemas import (
    IncidentAIInsights,
    IncidentAnalytics,
    IncidentAttachmentInput,
    IncidentAttachmentResponse,
    IncidentCategoryBreakdown,
    IncidentDashboardResponse,
    IncidentDepartmentOption,
    IncidentDepartmentPerformance,
    IncidentDetail,
    IncidentCreate,
    IncidentDuplicateDetectionResponse,
    IncidentDuplicateMatch,
    IncidentInvestigationActivityInput,
    IncidentInvestigationActivityResponse,
    IncidentInvestigationDetail,
    IncidentInvestigationInsightsRequest,
    IncidentInvestigationInsightsResponse,
    IncidentInvestigationUpdate,
    IncidentListItem,
    IncidentListResponse,
    IncidentLocationOption,
    IncidentOptionsResponse,
    IncidentResourceSuggestionResponse,
    IncidentRootCauseFactorResponse,
    IncidentSeverityBreakdown,
    IncidentSummaryCards,
    IncidentTrendPoint,
    IncidentTrendForecastRequest,
    IncidentTrendForecastResponse,
    IncidentUpdate,
    IncidentUserOption,
)


router = APIRouter(prefix="/incidents", tags=["Incident Management"])

READ_ROLES = ("Reader", "Editor", "Reviewer", "Admin", "Super Admin")
MANAGE_ROLES = ("Editor", "Reviewer", "Admin", "Super Admin")

INCIDENT_TYPES = [
    "Safety Incident",
    "Security Breach",
    "Compliance Violation",
    "Environmental Incident",
    "Quality Issue",
    "IT System Failure",
    "Process Failure",
    "Customer Complaint",
    "Other",
]

INCIDENT_CATEGORY_MAP: Dict[str, List[str]] = {
    "Safety Incident": [
        "Injury",
        "Near Miss",
        "Hazard Observation",
        "PPE Non-Compliance",
    ],
    "Security Breach": [
        "Physical Security",
        "Cybersecurity",
        "Data Leak",
        "Access Control",
    ],
    "Compliance Violation": [
        "Regulatory",
        "Policy",
        "Ethics",
        "Financial",
    ],
    "Environmental Incident": [
        "Spill",
        "Emissions",
        "Waste",
        "Wildlife",
    ],
    "Quality Issue": [
        "Product Defect",
        "Process Deviation",
        "Supplier Non-Conformance",
    ],
    "IT System Failure": [
        "Network",
        "Infrastructure",
        "Application",
        "Service Availability",
    ],
    "Process Failure": [
        "Equipment",
        "Procedure",
        "Training",
    ],
    "Customer Complaint": [
        "Service",
        "Product",
        "Support",
    ],
    "Other": [
        "General",
    ],
}


def _month_start(value: date) -> date:
    return date(value.year, value.month, 1)


def _add_month(value: date, months: int) -> date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    return date(year, month, 1)


def _severity_to_priority(severity: IncidentSeverity) -> IncidentPriority:
    mapping = {
        IncidentSeverity.CRITICAL: IncidentPriority.CRITICAL,
        IncidentSeverity.HIGH: IncidentPriority.HIGH,
        IncidentSeverity.MEDIUM: IncidentPriority.MEDIUM,
        IncidentSeverity.LOW: IncidentPriority.LOW,
    }
    return mapping.get(severity, IncidentPriority.MEDIUM)


def _serialise_attachment(model: IncidentAttachment) -> IncidentAttachmentResponse:
    return IncidentAttachmentResponse(
        id=model.id,
        file_name=model.file_name,
        file_url=model.file_url,
        file_type=model.file_type,
        file_size=model.file_size,
        description=model.description,
        uploaded_at=model.uploaded_at,
        uploaded_by_id=model.uploaded_by_id,
    )


def _serialise_activity(model: IncidentInvestigationActivity) -> IncidentInvestigationActivityResponse:
    return IncidentInvestigationActivityResponse(
        id=model.id,
        activity_time=model.activity_time,
        activity_type=model.activity_type,
        investigator_id=model.investigator_id,
        description=model.description,
        findings=model.findings,
        evidence_url=model.evidence_url,
        follow_up_required=model.follow_up_required,
        created_at=model.created_at,
    )


def _serialise_investigation(investigation: Optional[IncidentInvestigation]) -> Optional[IncidentInvestigationDetail]:
    if not investigation:
        return None

    return IncidentInvestigationDetail(
        status=investigation.status,
        priority=investigation.priority,
        assigned_investigator_id=investigation.assigned_investigator_id,
        investigation_team_ids=list(investigation.investigation_team_ids or []),
        target_resolution_date=investigation.target_resolution_date,
        actual_resolution_date=investigation.actual_resolution_date,
        rca_method=investigation.rca_method,
        primary_root_cause=investigation.primary_root_cause,
        rca_notes=investigation.rca_notes,
        ai_guidance=investigation.ai_guidance,
        root_cause_factors=[
            IncidentRootCauseFactorResponse(
                id=factor.id,
                description=factor.description,
                category=factor.category,
                impact_level=factor.impact_level,
                created_at=factor.created_at,
            )
            for factor in sorted(
                investigation.root_cause_factors,
                key=lambda item: item.created_at or datetime.utcnow(),
            )
        ],
        activities=[
            _serialise_activity(activity)
            for activity in sorted(
                investigation.activities,
                key=lambda item: item.activity_time,
            )
        ],
    )


def _serialise_incident(incident: Incident) -> IncidentDetail:
    return IncidentDetail(
        id=incident.id,
        incident_code=incident.incident_code,
        title=incident.title,
        incident_type=incident.incident_type,
        incident_category=incident.incident_category,
        department_id=incident.department_id,
        location_path=incident.location_path,
        occurred_at=incident.occurred_at,
        reported_at=incident.reported_at,
        severity=incident.severity,
        status=incident.status,
        priority=incident.priority,
        impact_assessment=incident.impact_assessment,
        immediate_actions=incident.immediate_actions,
        detailed_description=incident.detailed_description,
        what_happened=incident.what_happened,
        root_cause=incident.root_cause,
        contributing_factors=incident.contributing_factors,
        people_involved_ids=list(incident.people_involved_ids or []),
        witness_ids=list(incident.witness_ids or []),
        equipment_involved=incident.equipment_involved,
        immediate_notification_ids=list(incident.immediate_notification_ids or []),
        escalation_path=list(incident.escalation_path or []),
        external_notifications=list(incident.external_notifications or []),
        public_disclosure_required=incident.public_disclosure_required,
        resolved_at=incident.resolved_at,
        created_by_id=incident.created_by_id,
        attachments=[_serialise_attachment(attachment) for attachment in incident.attachments],
        investigation=_serialise_investigation(incident.investigation),
        ai_metadata=incident.ai_metadata,
    )


def _serialise_list_item(incident: Incident, department_lookup: Dict[int, str]) -> IncidentListItem:
    return IncidentListItem(
        id=incident.id,
        incident_code=incident.incident_code,
        title=incident.title,
        status=incident.status,
        severity=incident.severity,
        priority=incident.priority,
        department_name=department_lookup.get(incident.department_id),
        occurred_at=incident.occurred_at,
        reported_at=incident.reported_at,
        overdue=bool(incident.is_overdue),
        assigned_investigator_id=incident.investigation.assigned_investigator_id if incident.investigation else None,
    )


def _generate_incident_code(db: Session) -> str:
    now = datetime.utcnow()
    year = now.year
    count = (
        db.query(func.count(Incident.id))
        .filter(func.extract("year", Incident.reported_at) == year)
        .scalar()
        or 0
    )
    return f"INC-{year}-{count + 1:04d}"


def _ensure_investigation(incident: Incident) -> IncidentInvestigation:
    if incident.investigation:
        return incident.investigation
    investigation = IncidentInvestigation(
        incident=incident,
        status=incident.status,
        priority=incident.priority,
    )
    incident.investigation = investigation
    return investigation


def _calculate_resolution_hours(incident: Incident) -> Optional[float]:
    if not incident.resolved_at:
        return None
    delta = incident.resolved_at - incident.reported_at
    return round(delta.total_seconds() / 3600, 2)


def _mark_overdue(incident: Incident, today: date) -> None:
    investigation = incident.investigation
    if not investigation or not investigation.target_resolution_date:
        incident.is_overdue = False
        return
    if incident.status in {IncidentStatus.RESOLVED, IncidentStatus.CLOSED}:
        incident.is_overdue = False
        return
    incident.is_overdue = investigation.target_resolution_date < today


def _collect_department_lookup(db: Session) -> Dict[int, str]:
    mapping: Dict[int, str] = {}
    for department in db.query(Department).all():
        mapping[department.id] = department.name
    return mapping


@router.get("/options", response_model=IncidentOptionsResponse)
async def get_incident_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
) -> IncidentOptionsResponse:
    del current_user  # unused but ensures auth

    departments = db.query(Department).all()
    sites = db.query(Site).all()
    users = db.query(User).all()

    site_lookup = {site.id: site for site in sites}

    department_options = [
        IncidentDepartmentOption(
            id=department.id,
            name=department.name,
            site=site_lookup.get(department.site_id).name if department.site_id in site_lookup else None,
        )
        for department in departments
    ]

    location_options = [
        IncidentLocationOption(id=site.id, label=f"{site.name}") for site in sites
    ]

    user_options = [
        IncidentUserOption(
            id=user.id,
            name=f"{user.first_name} {user.last_name}".strip() or user.username,
            role=user.role.value if user.role else None,
        )
        for user in users
    ]

    return IncidentOptionsResponse(
        incident_types=INCIDENT_TYPES,
        incident_categories=INCIDENT_CATEGORY_MAP,
        departments=department_options,
        locations=location_options,
        users=user_options,
    )


@router.get("/dashboard", response_model=IncidentDashboardResponse)
async def get_incident_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
) -> IncidentDashboardResponse:
    del current_user
    now = datetime.utcnow()
    today = now.date()

    total_incidents = db.query(func.count(Incident.id)).scalar() or 0
    open_incidents = (
        db.query(func.count(Incident.id))
        .filter(Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.UNDER_INVESTIGATION]))
        .scalar()
        or 0
    )
    resolved_this_month = (
        db.query(func.count(Incident.id))
        .filter(
            Incident.resolved_at.isnot(None),
            func.extract("year", Incident.resolved_at) == today.year,
            func.extract("month", Incident.resolved_at) == today.month,
        )
        .scalar()
        or 0
    )

    resolved_incidents: List[Incident] = (
        db.query(Incident)
        .filter(Incident.resolved_at.isnot(None))
        .all()
    )
    avg_resolution_hours: Optional[float] = None
    if resolved_incidents:
        avg_resolution_hours = round(
            sum(_calculate_resolution_hours(incident) or 0 for incident in resolved_incidents)
            / max(1, sum(1 for incident in resolved_incidents if incident.resolved_at)),
            2,
        )

    overdue_incidents = (
        db.query(Incident)
        .join(IncidentInvestigation)
        .filter(
            IncidentInvestigation.target_resolution_date.isnot(None),
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]),
            IncidentInvestigation.target_resolution_date < today,
        )
        .count()
    )

    months: List[IncidentTrendPoint] = []
    history_counts: List[int] = []

    start_month = _month_start(today)
    for offset in range(5, -1, -1):
        month_start = _add_month(start_month, -offset)
        month_end = _add_month(month_start, 1)
        reported_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.reported_at >= month_start)
            .filter(Incident.reported_at < month_end)
            .scalar()
            or 0
        )
        resolved_count = (
            db.query(func.count(Incident.id))
            .filter(Incident.resolved_at.isnot(None))
            .filter(Incident.resolved_at >= month_start)
            .filter(Incident.resolved_at < month_end)
            .scalar()
            or 0
        )
        months.append(
            IncidentTrendPoint(
                period=month_start.strftime("%b %Y"),
                open_count=reported_count,
                resolved_count=resolved_count,
                predicted_count=None,
            )
        )
        history_counts.append(reported_count)

    forecast: IncidentTrendForecastResponse = forecast_incident_trend(
        IncidentTrendForecastRequest(history=months)
    )
    if forecast.projections:
        months = forecast.projections

    category_rows = (
        db.query(Incident.incident_category, func.count(Incident.id))
        .group_by(Incident.incident_category)
        .all()
    )
    categories = [
        IncidentCategoryBreakdown(category=row[0] or "Uncategorised", count=row[1])
        for row in category_rows
    ]

    severity_rows = (
        db.query(Incident.severity, func.count(Incident.id))
        .group_by(Incident.severity)
        .all()
    )
    severity_breakdown = [
        IncidentSeverityBreakdown(severity=row[0], count=row[1]) for row in severity_rows if row[0]
    ]

    department_lookup = _collect_department_lookup(db)

    incidents = db.query(Incident).all()
    department_metrics: Dict[int, Dict[str, float]] = {}
    for incident in incidents:
        department_id = incident.department_id or 0
        metrics = department_metrics.setdefault(
            department_id,
            {
                "name": department_lookup.get(incident.department_id, "Unassigned"),
                "durations": [],
                "open": 0,
            },
        )
        resolution = _calculate_resolution_hours(incident)
        if resolution is not None:
            metrics["durations"].append(resolution)
        if incident.status in {IncidentStatus.OPEN, IncidentStatus.UNDER_INVESTIGATION}:
            metrics["open"] += 1

    department_performance = [
        IncidentDepartmentPerformance(
            department_id=dept_id if dept_id != 0 else None,
            department_name=data["name"],
            average_resolution_hours=(
                round(sum(data["durations"]) / len(data["durations"]), 2)
                if data["durations"]
                else None
            ),
            open_count=data["open"],
        )
        for dept_id, data in department_metrics.items()
    ]

    resource_plan = suggest_resource_allocation(
        severity_distribution={entry.severity: entry.count for entry in severity_breakdown},
        open_incidents=open_incidents,
    )

    if forecast.projections:
        predicted_next = forecast.projections[-1].predicted_count or forecast.projections[-1].open_count
    else:
        predicted_next = history_counts[-1] if history_counts else 0

    resource_messages = [
        f"Recommended response headcount: {resource_plan.recommended_headcount}",
        resource_plan.shift_guidance,
        *resource_plan.specialist_support,
    ]
    ai_insights = IncidentAIInsights(
        narrative=forecast.narrative,
        forecast_next_month=predicted_next,
        confidence=forecast.confidence,
        alerts=forecast.alerts,
        resource_recommendations=[message for message in resource_messages if message],
    )

    summary = IncidentSummaryCards(
        total_incidents=total_incidents,
        open_incidents=open_incidents,
        resolved_this_month=resolved_this_month,
        average_resolution_time_hours=avg_resolution_hours,
        overdue_incidents=overdue_incidents,
        trend_direction=(
            "up"
            if len(history_counts) > 1 and history_counts[-1] > history_counts[-2]
            else "down"
            if len(history_counts) > 1 and history_counts[-1] < history_counts[-2]
            else "flat"
        ),
        trend_change_percentage=(
            round(
                ((history_counts[-1] - history_counts[-2]) / max(1, history_counts[-2])) * 100,
                2,
            )
            if len(history_counts) > 1 and history_counts[-2] > 0
            else None
        ),
    )

    analytics = IncidentAnalytics(
        trend=months,
        categories=categories,
        severity=severity_breakdown,
        department_performance=department_performance,
        ai=ai_insights,
    )

    return IncidentDashboardResponse(
        last_refreshed=now,
        summary=summary,
        analytics=analytics,
    )


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    status_filter: Optional[IncidentStatus] = Query(default=None, alias="status"),
    severity_filter: Optional[IncidentSeverity] = Query(default=None, alias="severity"),
    department_id: Optional[int] = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
) -> IncidentListResponse:
    query = db.query(Incident)

    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if severity_filter:
        query = query.filter(Incident.severity == severity_filter)
    if department_id:
        query = query.filter(Incident.department_id == department_id)
    if assigned_to_me:
        query = query.join(IncidentInvestigation, isouter=True).filter(
            IncidentInvestigation.assigned_investigator_id == current_user.id
        )

    incidents = query.order_by(Incident.reported_at.desc()).all()
    department_lookup = _collect_department_lookup(db)

    return IncidentListResponse(
        items=[_serialise_list_item(incident, department_lookup) for incident in incidents],
        total=len(incidents),
    )


@router.get("/{incident_id}", response_model=IncidentDetail)
async def get_incident_detail(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
) -> IncidentDetail:
    del current_user
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return _serialise_incident(incident)


@router.post("", response_model=IncidentDetail, status_code=status.HTTP_201_CREATED)
async def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
) -> IncidentDetail:
    incident = Incident(
        incident_code=_generate_incident_code(db),
        title=payload.title,
        incident_type=payload.incident_type,
        incident_category=payload.incident_category,
        department_id=payload.department_id,
        location_path=payload.location_path,
        occurred_at=payload.occurred_at,
        reported_at=payload.reported_at or datetime.utcnow(),
        severity=payload.severity,
        priority=_severity_to_priority(payload.severity),
        status=IncidentStatus.OPEN,
        impact_assessment=payload.impact_assessment,
        immediate_actions=payload.immediate_actions,
        detailed_description=payload.detailed_description,
        what_happened=payload.what_happened,
        root_cause=payload.root_cause,
        contributing_factors=payload.contributing_factors,
        people_involved_ids=payload.people_involved_ids,
        witness_ids=payload.witness_ids,
        equipment_involved=payload.equipment_involved,
        immediate_notification_ids=payload.immediate_notification_ids,
        escalation_path=payload.escalation_path,
        external_notifications=payload.external_notifications,
        public_disclosure_required=payload.public_disclosure_required,
        created_by_id=current_user.id,
    )

    db.add(incident)
    db.flush()

    for attachment in payload.attachments:
        db.add(
            IncidentAttachment(
                incident=incident,
                file_name=attachment.file_name,
                file_url=attachment.file_url,
                file_type=attachment.file_type,
                file_size=attachment.file_size,
                description=attachment.description,
                uploaded_by_id=current_user.id,
            )
        )

    investigation = _ensure_investigation(incident)
    timeline = recommend_investigation_timeline(
        incident_type=incident.incident_type,
        severity=incident.severity,
        occurred_at=incident.occurred_at,
    )
    investigation.target_resolution_date = timeline.target_resolution_date
    investigation.ai_guidance = {
        "timeline_guidance": timeline.timeline_guidance,
        "priority_rationale": timeline.priority_rationale,
    }

    _mark_overdue(incident, datetime.utcnow().date())

    if not incident.escalation_path:
        incident.escalation_path = recommend_escalation_path(
            severity=incident.severity,
            department_id=incident.department_id,
        )

    severity_assessment = assess_incident_severity(
        description=incident.detailed_description,
        impact_assessment=incident.impact_assessment,
        immediate_actions=incident.immediate_actions,
    )
    incident.ai_metadata = {
        "severity_assessment": severity_assessment.model_dump(),
    }

    db.commit()
    db.refresh(incident)

    duplicates = detect_duplicate_incidents(
        incident=incident,
        existing_incidents=db.query(Incident).filter(Incident.id != incident.id).order_by(Incident.reported_at.desc()).limit(20).all(),
    )
    if duplicates.matches:
        ai_meta = incident.ai_metadata or {}
        ai_meta["potential_duplicates"] = [match.model_dump() for match in duplicates.matches]
        incident.ai_metadata = ai_meta
        db.commit()
        db.refresh(incident)

    return _serialise_incident(incident)


@router.put("/{incident_id}", response_model=IncidentDetail)
async def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
) -> IncidentDetail:
    del current_user
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)

    if payload.severity:
        incident.priority = _severity_to_priority(payload.severity)

    _mark_overdue(incident, datetime.utcnow().date())

    db.commit()
    db.refresh(incident)
    return _serialise_incident(incident)


@router.post("/{incident_id}/investigation", response_model=IncidentDetail)
async def update_investigation(
    incident_id: int,
    payload: IncidentInvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
) -> IncidentDetail:
    del current_user
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    investigation = _ensure_investigation(incident)

    data = payload.model_dump(exclude_unset=True)

    root_factors = data.pop("root_cause_factors", None)

    for field, value in data.items():
        setattr(investigation, field, value)

    if root_factors is not None:
        investigation.root_cause_factors.clear()
        for factor in root_factors:
            investigation.root_cause_factors.append(
                IncidentRootCauseFactor(
                    description=factor.description,
                    category=factor.category,
                    impact_level=factor.impact_level,
                )
            )

    if investigation.status:
        incident.status = investigation.status
    if investigation.priority:
        incident.priority = investigation.priority

    _mark_overdue(incident, datetime.utcnow().date())

    db.commit()
    db.refresh(incident)
    return _serialise_incident(incident)


@router.post("/{incident_id}/activities", response_model=IncidentInvestigationActivityResponse)
async def add_investigation_activity(
    incident_id: int,
    payload: IncidentInvestigationActivityInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
) -> IncidentInvestigationActivityResponse:
    del current_user
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    investigation = _ensure_investigation(incident)

    activity = IncidentInvestigationActivity(
        investigation=investigation,
        activity_time=payload.activity_time,
        activity_type=payload.activity_type,
        investigator_id=payload.investigator_id,
        description=payload.description,
        findings=payload.findings,
        evidence_url=payload.evidence_url,
        follow_up_required=payload.follow_up_required,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    _mark_overdue(incident, datetime.utcnow().date())
    return _serialise_activity(activity)


@router.get("/{incident_id}/activities", response_model=List[IncidentInvestigationActivityResponse])
async def list_investigation_activities(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*READ_ROLES)),
) -> List[IncidentInvestigationActivityResponse]:
    del current_user
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    return [_serialise_activity(activity) for activity in sorted(incident.investigation.activities, key=lambda item: item.activity_time)] if incident.investigation else []


