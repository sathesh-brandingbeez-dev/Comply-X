from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user
from database import get_db
from models import (
    Audit as AuditModel,
    AuditChecklistQuestion as AuditChecklistQuestionModel,
    AuditChecklistSection as AuditChecklistSectionModel,
    AuditQuestionType,
    AuditStatus,
    AuditType,
    Department,
    RiskLevel,
    User,
)
from schemas import (
    Audit as AuditSchema,
    AuditAIRecommendations,
    AuditBasicInfoAIRequest,
    AuditBasicInfoAIResponse,
    AuditCalendarEvent,
    AuditChecklistAIRequest,
    AuditChecklistAIResponse,
    AuditChecklistQuestion,
    AuditChecklistSection,
    AuditCreate,
    AuditEmailTemplates,
    AuditListItem,
    AuditNotificationAIRequest,
    AuditNotificationAIResponse,
    AuditNotificationSettings,
    AuditPlanningDashboard,
    AuditPlanningSummary,
    AuditResourceAllocation,
    AuditReviewAIRequest,
    AuditReviewAIResponse,
    AuditSchedulingAIRequest,
    AuditSchedulingAIResponse,
    AuditTimelineEntry,
    AuditWizardOptions,
)

router = APIRouter()


@router.get("/options", response_model=AuditWizardOptions, summary="Get options for audit creation")
def get_audit_wizard_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # current_user is resolved to ensure the endpoint requires authentication.
    _ = current_user

    departments = (
        db.query(Department)
        .filter(Department.is_active == True)  # noqa: E712 - intentional comparison to literal true
        .order_by(Department.name.asc())
        .all()
    )

    users = (
        db.query(User)
        .filter(User.is_active == True)  # noqa: E712 - intentional comparison to literal true
        .order_by(User.first_name.asc(), User.last_name.asc(), User.id.asc())
        .all()
    )

    department_options = [
        {"id": department.id, "name": department.name} for department in departments
    ]

    user_options: List[dict[str, object]] = []
    for user in users:
        first_name = (user.first_name or "").strip()
        last_name = (user.last_name or "").strip()

        if not first_name and not last_name:
            fallback_identifier = (user.username or user.email or "").strip()
            if fallback_identifier:
                first_name = fallback_identifier
            else:
                first_name = f"User {user.id}"

        user_options.append(
            {
                "id": user.id,
                "username": user.username,
                "first_name": first_name,
                "last_name": last_name,
                "email": user.email,
                "role": user.role.value if user.role else None,
            }
        )

    return AuditWizardOptions(departments=department_options, users=user_options)


def _collect_department_lookup(db: Session, audits: Sequence[AuditModel]) -> Dict[int, str]:
    department_ids: set[int] = set()
    for audit in audits:
        for dep_id in audit.departments or []:
            department_ids.add(dep_id)
    if not department_ids:
        return {}
    rows = db.query(Department.id, Department.name).filter(Department.id.in_(department_ids)).all()
    return {row.id: row.name for row in rows}


def _collect_user_lookup(db: Session, audits: Sequence[AuditModel]) -> Dict[int, str]:
    user_ids: set[int] = set()
    for audit in audits:
        if audit.lead_auditor_id:
            user_ids.add(audit.lead_auditor_id)
        for uid in audit.audit_team_ids or []:
            user_ids.add(uid)
        for uid in audit.auditee_contact_ids or []:
            user_ids.add(uid)
        if audit.resource_allocation:
            for allocation in audit.resource_allocation:
                user_id = allocation.get("user_id") if isinstance(allocation, dict) else None
                if user_id:
                    user_ids.add(user_id)
    if not user_ids:
        return {}
    rows = db.query(User.id, User.first_name, User.last_name).filter(User.id.in_(user_ids)).all()
    return {row.id: f"{row.first_name} {row.last_name}".strip() for row in rows}


def _ensure_allocation_models(resource_allocation: Optional[Iterable[dict]]) -> List[AuditResourceAllocation]:
    allocations: List[AuditResourceAllocation] = []
    if not resource_allocation:
        return allocations
    for item in resource_allocation:
        if isinstance(item, AuditResourceAllocation):
            allocations.append(item)
        elif isinstance(item, dict):
            try:
                allocations.append(AuditResourceAllocation.model_validate(item))
            except Exception:
                continue
    return allocations


def _ensure_timeline_models(timeline: Optional[Iterable[dict]]) -> List[AuditTimelineEntry]:
    entries: List[AuditTimelineEntry] = []
    if not timeline:
        return entries
    for item in timeline:
        if isinstance(item, AuditTimelineEntry):
            entries.append(item)
        elif isinstance(item, dict):
            try:
                entries.append(AuditTimelineEntry.model_validate(item))
            except Exception:
                continue
    return entries


def _map_audit_to_schema(
    audit: AuditModel,
    department_lookup: Dict[int, str],
    user_lookup: Dict[int, str],
) -> AuditSchema:
    lead_name = user_lookup.get(audit.lead_auditor_id)
    department_names = [department_lookup.get(dep_id, f"Department {dep_id}") for dep_id in audit.departments or []]
    sections: List[AuditChecklistSection] = []
    for section in audit.sections:
        section_questions: List[AuditChecklistQuestion] = []
        for question in section.questions:
            section_questions.append(
                AuditChecklistQuestion(
                    id=question.id,
                    question_text=question.question_text,
                    question_type=question.question_type,
                    evidence_required=question.evidence_required,
                    scoring_weight=question.scoring_weight,
                    risk_impact=question.risk_impact,
                    guidance_notes=question.guidance_notes,
                    order_index=question.order_index,
                )
            )
        sections.append(
            AuditChecklistSection(
                id=section.id,
                title=section.title,
                description=section.description,
                weight=section.weight,
                is_required=section.is_required,
                order_index=section.order_index,
                questions=section_questions,
            )
        )

    resource_allocation = _ensure_allocation_models(audit.resource_allocation)
    timeline = _ensure_timeline_models(audit.timeline)
    notification_settings = (
        AuditNotificationSettings.model_validate(audit.notification_settings)
        if audit.notification_settings
        else AuditNotificationSettings()
    )
    email_templates = (
        AuditEmailTemplates.model_validate(audit.email_templates)
        if audit.email_templates
        else AuditEmailTemplates()
    )

    return AuditSchema(
        id=audit.id,
        title=audit.title,
        audit_type=audit.audit_type,
        risk_level=audit.risk_level,
        departments=audit.departments or [],
        scope=audit.scope,
        objective=audit.objective,
        compliance_frameworks=audit.compliance_frameworks or [],
        planned_start_date=audit.planned_start_date,
        planned_end_date=audit.planned_end_date,
        estimated_duration_hours=audit.estimated_duration_hours,
        lead_auditor_id=audit.lead_auditor_id,
        audit_team_ids=audit.audit_team_ids or [],
        external_auditors=audit.external_auditors,
        auditee_contact_ids=audit.auditee_contact_ids or [],
        meeting_room=audit.meeting_room,
        special_requirements=audit.special_requirements,
        notification_settings=notification_settings,
        email_templates=email_templates,
        distribution_list_ids=audit.distribution_list_ids or [],
        cc_list=audit.cc_list or [],
        bcc_list=audit.bcc_list or [],
        launch_option=audit.launch_option,
        resource_allocation=resource_allocation,
        timeline=timeline,
        status=audit.status,
        progress=audit.progress,
        created_at=audit.created_at,
        updated_at=audit.updated_at,
        lead_auditor_name=lead_name,
        department_names=department_names,
        sections=sections,
    )


def _predict_duration_hours(audit_type: AuditType, risk_level: RiskLevel, start: date, end: date) -> int:
    base_hours = max(6, ((end - start).days + 1) * 4)
    type_multiplier = {
        AuditType.INTERNAL: 1.0,
        AuditType.COMPLIANCE: 1.2,
        AuditType.QUALITY: 1.1,
        AuditType.FINANCIAL: 1.3,
        AuditType.IT_SECURITY: 1.4,
        AuditType.RISK_ASSESSMENT: 1.25,
        AuditType.OPERATIONAL: 1.1,
        AuditType.ENVIRONMENTAL: 1.2,
        AuditType.HEALTH_SAFETY: 1.15,
        AuditType.CUSTOM: 1.0,
    }[audit_type]
    risk_multiplier = {
        RiskLevel.LOW: 0.9,
        RiskLevel.MEDIUM: 1.0,
        RiskLevel.HIGH: 1.2,
        RiskLevel.CRITICAL: 1.35,
    }[risk_level]
    return int(round(base_hours * type_multiplier * risk_multiplier))


def _derive_status(launch_option: str, start_date: date) -> AuditStatus:
    if not launch_option:
        return AuditStatus.DRAFT
    normalized = launch_option.lower()
    if "launch" in normalized:
        return AuditStatus.IN_PROGRESS if start_date <= date.today() else AuditStatus.SCHEDULED
    if "schedule" in normalized:
        return AuditStatus.SCHEDULED
    if "draft" in normalized or "save" in normalized:
        return AuditStatus.DRAFT
    return AuditStatus.DRAFT


def _calculate_progress(audit: AuditModel) -> int:
    if audit.timeline:
        completed = [entry for entry in audit.timeline if isinstance(entry, dict) and entry.get("completion")]
        if completed:
            progress_values = [min(100, max(0, entry.get("completion", 0))) for entry in completed]
            return int(sum(progress_values) / len(progress_values))
    if audit.planned_start_date and audit.planned_end_date:
        total_days = (audit.planned_end_date - audit.planned_start_date).days
        if total_days <= 0:
            return 0
        elapsed = (date.today() - audit.planned_start_date).days
        if elapsed <= 0:
            return 0
        return int(max(0, min(100, (elapsed / total_days) * 100)))
    return 0


def _build_dashboard_summary(audits: Sequence[AuditModel]) -> AuditPlanningSummary:
    total = len(audits)
    scheduled = sum(1 for audit in audits if audit.status == AuditStatus.SCHEDULED)
    in_progress = sum(1 for audit in audits if audit.status == AuditStatus.IN_PROGRESS)
    completed = sum(1 for audit in audits if audit.status == AuditStatus.COMPLETED)
    overdue = sum(1 for audit in audits if audit.planned_end_date and audit.planned_end_date < date.today() and audit.status != AuditStatus.COMPLETED)
    average_progress = sum(audit.progress or 0 for audit in audits) / total if total else 0
    return AuditPlanningSummary(
        total_audits=total,
        scheduled=scheduled,
        in_progress=in_progress,
        completed=completed,
        overdue=overdue,
        average_progress=round(average_progress, 1),
    )


def _build_calendar_events(
    audits: Sequence[AuditModel],
    department_lookup: Dict[int, str],
    user_lookup: Dict[int, str],
) -> List[AuditCalendarEvent]:
    events: List[AuditCalendarEvent] = []
    for audit in audits:
        lead_name = user_lookup.get(audit.lead_auditor_id, "Unassigned")
        department_names = [department_lookup.get(dep_id, f"Department {dep_id}") for dep_id in audit.departments or []]
        quick_actions = ["View Plan", "Open Checklist"]
        if audit.status in {AuditStatus.SCHEDULED, AuditStatus.IN_PROGRESS}:
            quick_actions.append("Assign Resources")
        events.append(
            AuditCalendarEvent(
                id=audit.id,
                audit_id=audit.id,
                title=audit.title,
                start_date=audit.planned_start_date,
                end_date=audit.planned_end_date,
                status=audit.status,
                audit_type=audit.audit_type,
                lead_auditor=lead_name,
                department_names=department_names,
                risk_level=audit.risk_level,
                quick_actions=quick_actions,
            )
        )
    return events


def _build_ai_recommendations(audits: Sequence[AuditModel]) -> AuditAIRecommendations:
    if not audits:
        return AuditAIRecommendations(
            intelligent_schedule=["No audits scheduled. Consider launching an internal control readiness review."],
            resource_allocation=["Assign experienced auditors to establish baseline templates."],
            duration_predictions=["Average audit duration is projected at 3.5 days based on historical data."],
        )

    high_risk_audits = [audit for audit in audits if audit.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}]
    upcoming = sorted(audits, key=lambda a: a.planned_start_date)

    intelligent_schedule: List[str] = []
    if high_risk_audits:
        earliest = min(high_risk_audits, key=lambda a: a.planned_start_date)
        intelligent_schedule.append(
            f"Prioritise {earliest.title} ({earliest.risk_level.value.title()}) starting {earliest.planned_start_date:%d %b}."
        )
    if upcoming:
        next_audit = upcoming[0]
        intelligent_schedule.append(
            f"Prepare kickoff briefing for {next_audit.title} one week before {next_audit.planned_start_date:%d %b}."
        )

    resource_allocation = [
        "Balance workload by limiting auditors to 2 concurrent engagements.",
        "Allocate at least 30% of effort to evidence validation for high risk audits.",
    ]

    avg_duration = sum(audit.estimated_duration_hours for audit in audits) / len(audits)
    duration_predictions = [
        f"Predicted average audit duration: {round(avg_duration, 1)} hours.",
    ]
    if high_risk_audits:
        high_risk_avg = sum(audit.estimated_duration_hours for audit in high_risk_audits) / len(high_risk_audits)
        duration_predictions.append(
            f"High risk audits require approximately {round(high_risk_avg, 1)} hours based on current plan."
        )

    return AuditAIRecommendations(
        intelligent_schedule=intelligent_schedule,
        resource_allocation=resource_allocation,
        duration_predictions=duration_predictions,
    )


def _apply_filters(
    audits: Sequence[AuditModel],
    status: Optional[AuditStatus],
    department: Optional[int],
    search: Optional[str],
) -> List[AuditModel]:
    filtered = list(audits)
    if status:
        filtered = [audit for audit in filtered if audit.status == status]
    if department:
        filtered = [audit for audit in filtered if department in (audit.departments or [])]
    if search:
        lowered = search.lower()
        filtered = [
            audit
            for audit in filtered
            if lowered in audit.title.lower()
            or lowered in (audit.objective or "").lower()
            or lowered in (audit.scope or "").lower()
        ]
    return filtered


@router.get("/dashboard", response_model=AuditPlanningDashboard)
def get_planning_dashboard(
    view: str = Query("month", regex="^(month|week|day)$"),
    status: Optional[AuditStatus] = Query(None),
    department: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audits = (
        db.query(AuditModel)
        .options(
            joinedload(AuditModel.sections).joinedload(AuditChecklistSectionModel.questions),
            joinedload(AuditModel.lead_auditor),
        )
        .order_by(AuditModel.planned_start_date)
        .all()
    )

    department_lookup = _collect_department_lookup(db, audits)
    user_lookup = _collect_user_lookup(db, audits)

    for audit in audits:
        if audit.estimated_duration_hours == 0 and audit.planned_start_date and audit.planned_end_date:
            audit.estimated_duration_hours = _predict_duration_hours(
                audit.audit_type,
                audit.risk_level,
                audit.planned_start_date,
                audit.planned_end_date,
            )
        audit.progress = _calculate_progress(audit)

    filtered = _apply_filters(audits, status, department, search)

    summary = _build_dashboard_summary(filtered)
    calendar_events = _build_calendar_events(filtered, department_lookup, user_lookup)

    legend = {
        AuditStatus.SCHEDULED: "bg-blue-500",
        AuditStatus.IN_PROGRESS: "bg-green-500",
        AuditStatus.COMPLETED: "bg-emerald-600",
        AuditStatus.DRAFT: "bg-gray-400",
        AuditStatus.ON_HOLD: "bg-amber-500",
    }

    audit_cards: List[AuditListItem] = []
    for audit in filtered:
        audit_cards.append(
            AuditListItem(
                id=audit.id,
                title=audit.title,
                audit_type=audit.audit_type,
                departments=[department_lookup.get(dep_id, f"Department {dep_id}") for dep_id in audit.departments or []],
                start_date=audit.planned_start_date,
                end_date=audit.planned_end_date,
                status=audit.status,
                progress=audit.progress,
                lead_auditor=user_lookup.get(audit.lead_auditor_id, "Unassigned"),
                risk_level=audit.risk_level,
            )
        )

    ai_recommendations = _build_ai_recommendations(filtered)

    return AuditPlanningDashboard(
        calendar_events=calendar_events,
        legend={status.value: colour for status, colour in legend.items()},
        audits=audit_cards,
        summary=summary,
        ai_recommendations=ai_recommendations,
    )


@router.get("", response_model=List[AuditSchema])
def list_audits(
    status: Optional[AuditStatus] = Query(None),
    department: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audits = (
        db.query(AuditModel)
        .options(
            joinedload(AuditModel.sections).joinedload(AuditChecklistSectionModel.questions),
            joinedload(AuditModel.lead_auditor),
        )
        .order_by(AuditModel.created_at.desc())
        .all()
    )

    department_lookup = _collect_department_lookup(db, audits)
    user_lookup = _collect_user_lookup(db, audits)

    filtered = _apply_filters(audits, status, department, search)

    return [_map_audit_to_schema(audit, department_lookup, user_lookup) for audit in filtered]


@router.post("", response_model=AuditSchema, status_code=201)
def create_audit(
    payload: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date = payload.planned_start_date
    end_date = payload.planned_end_date
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    estimated_duration = payload.estimated_duration_hours or _predict_duration_hours(
        payload.audit_type,
        payload.risk_level,
        start_date,
        end_date,
    )

    audit = AuditModel(
        title=payload.title,
        audit_type=payload.audit_type,
        risk_level=payload.risk_level,
        departments=payload.departments,
        scope=payload.scope,
        objective=payload.objective,
        compliance_frameworks=payload.compliance_frameworks,
        planned_start_date=start_date,
        planned_end_date=end_date,
        estimated_duration_hours=estimated_duration,
        lead_auditor_id=payload.lead_auditor_id,
        audit_team_ids=payload.audit_team_ids,
        external_auditors=payload.external_auditors,
        auditee_contact_ids=payload.auditee_contact_ids,
        meeting_room=payload.meeting_room,
        special_requirements=payload.special_requirements,
        notification_settings=payload.notification_settings.model_dump(),
        email_templates=payload.email_templates.model_dump(),
        distribution_list_ids=payload.distribution_list_ids,
        cc_list=payload.cc_list,
        bcc_list=payload.bcc_list,
        launch_option=payload.launch_option,
        resource_allocation=[allocation.model_dump() for allocation in payload.resource_allocation],
        timeline=[entry.model_dump() for entry in payload.timeline],
        created_by_id=current_user.id if current_user else None,
    )
    audit.status = _derive_status(payload.launch_option, start_date)
    audit.progress = _calculate_progress(audit)

    for index, section_payload in enumerate(payload.sections):
        section = AuditChecklistSectionModel(
            title=section_payload.title,
            description=section_payload.description,
            weight=section_payload.weight,
            is_required=section_payload.is_required,
            order_index=section_payload.order_index if section_payload.order_index is not None else index,
        )
        for q_index, question_payload in enumerate(section_payload.questions):
            question = AuditChecklistQuestionModel(
                question_text=question_payload.question_text,
                question_type=question_payload.question_type,
                evidence_required=question_payload.evidence_required,
                scoring_weight=question_payload.scoring_weight,
                risk_impact=question_payload.risk_impact,
                guidance_notes=question_payload.guidance_notes,
                order_index=question_payload.order_index if question_payload.order_index is not None else q_index,
            )
            section.questions.append(question)
        audit.sections.append(section)

    db.add(audit)
    db.commit()
    db.refresh(audit)

    department_lookup = _collect_department_lookup(db, [audit])
    user_lookup = _collect_user_lookup(db, [audit])
    return _map_audit_to_schema(audit, department_lookup, user_lookup)


_BASIC_SCOPE_LIBRARY: Dict[AuditType, str] = {
    AuditType.INTERNAL: "Evaluate internal controls and governance effectiveness across {departments}.",
    AuditType.COMPLIANCE: "Verify regulatory adherence for {departments} with emphasis on policy execution.",
    AuditType.QUALITY: "Assess quality management system alignment with ISO standards for {departments}.",
    AuditType.FINANCIAL: "Validate financial reporting accuracy and control design within {departments}.",
    AuditType.IT_SECURITY: "Assess cybersecurity posture, access controls, and resilience across {departments}.",
    AuditType.RISK_ASSESSMENT: "Benchmark enterprise risk mitigation strategies within {departments}.",
    AuditType.OPERATIONAL: "Optimise operational efficiency and control maturity across {departments}.",
    AuditType.ENVIRONMENTAL: "Evaluate environmental compliance and sustainability controls for {departments}.",
    AuditType.HEALTH_SAFETY: "Validate safety practices, incident readiness, and regulatory conformance for {departments}.",
    AuditType.CUSTOM: "Custom audit engagement tailored to {departments}.",
}

_FRAMEWORK_LIBRARY: Dict[AuditType, List[str]] = {
    AuditType.INTERNAL: ["COSO", "SOX 404"],
    AuditType.COMPLIANCE: ["ISO 37301", "GDPR", "SOX"],
    AuditType.QUALITY: ["ISO 9001", "IATF 16949"],
    AuditType.FINANCIAL: ["IFRS", "SOX", "GAAP"],
    AuditType.IT_SECURITY: ["ISO 27001", "NIST CSF", "SOC 2"],
    AuditType.RISK_ASSESSMENT: ["ISO 31000", "COSO ERM"],
    AuditType.OPERATIONAL: ["Lean", "Six Sigma"],
    AuditType.ENVIRONMENTAL: ["ISO 14001", "EPA Standards"],
    AuditType.HEALTH_SAFETY: ["ISO 45001", "OSHA"],
    AuditType.CUSTOM: ["Custom Framework"],
}


@router.post("/ai/basic-info", response_model=AuditBasicInfoAIResponse)
def ai_basic_info(
    payload: AuditBasicInfoAIRequest,
    current_user: User = Depends(get_current_user),
):
    departments = ", ".join(payload.departments) if payload.departments else "the selected departments"
    base_scope = _BASIC_SCOPE_LIBRARY.get(payload.audit_type, "Review key control areas.")
    scope = base_scope.format(departments=departments)

    objective = """Confirm control design effectiveness, identify remediation priorities, and align stakeholders on risk treatments."""
    if payload.audit_type == AuditType.IT_SECURITY:
        objective = """Validate security hardening, threat monitoring coverage, and incident response readiness."""
    elif payload.audit_type == AuditType.FINANCIAL:
        objective = """Ensure financial statements reflect accurate, complete, and compliant reporting."""
    elif payload.audit_type == AuditType.HEALTH_SAFETY:
        objective = """Protect employee wellbeing through proactive safety control testing and regulatory validation."""

    frameworks = _FRAMEWORK_LIBRARY.get(payload.audit_type, ["Custom Framework"])
    risk_level = RiskLevel.MEDIUM
    if payload.audit_type in {AuditType.IT_SECURITY, AuditType.FINANCIAL}:
        risk_level = RiskLevel.HIGH
    if payload.historical_risks:
        if any("breach" in risk.lower() or "incident" in risk.lower() for risk in payload.historical_risks):
            risk_level = RiskLevel.CRITICAL
        elif any("non-compliance" in risk.lower() for risk in payload.historical_risks):
            risk_level = RiskLevel.HIGH

    rationale = (
        f"Historical data indicates {risk_level.value} risk profile. Suggested frameworks are prioritised for {payload.audit_type.value.replace('_', ' ')} contexts."
    )

    return AuditBasicInfoAIResponse(
        suggested_scope=scope,
        suggested_objective=objective,
        suggested_compliance_frameworks=frameworks,
        predicted_risk_level=risk_level,
        rationale=rationale,
    )


@router.post("/ai/scheduling", response_model=AuditSchedulingAIResponse)
def ai_scheduling(
    payload: AuditSchedulingAIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_days = max(1, (payload.end_date - payload.start_date).days + 1)
    suggested_duration = _predict_duration_hours(payload.audit_type, payload.risk_level, payload.start_date, payload.end_date)
    team_ids = set(payload.team_member_ids or [])
    team_ids.add(payload.lead_auditor_id)

    users = db.query(User).filter(User.id.in_(team_ids)).all() if team_ids else []
    allocation: List[AuditResourceAllocation] = []
    for user in users:
        base_hours = suggested_duration // max(1, len(users))
        role = "Lead Auditor" if user.id == payload.lead_auditor_id else "Team Member"
        allocation.append(
            AuditResourceAllocation(
                user_id=user.id,
                user_name=f"{user.first_name} {user.last_name}".strip(),
                allocated_hours=base_hours,
                role=role,
            )
        )

    resource_conflicts: List[str] = []
    if total_days < 3 and payload.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        resource_conflicts.append("Planned window may be too short for high risk coverage.")
    if len(team_ids) < 2:
        resource_conflicts.append("Add at least one supporting auditor to balance workload.")

    recommended_room = None
    team_size = len(team_ids)
    if team_size >= 6:
        recommended_room = "Executive Boardroom"
    elif team_size >= 3:
        recommended_room = "Collaboration Hub"
    else:
        recommended_room = "Focus Room"

    return AuditSchedulingAIResponse(
        recommended_team=list(team_ids),
        resource_conflicts=resource_conflicts,
        recommended_meeting_room=recommended_room,
        suggested_duration_hours=suggested_duration,
        allocation_plan=allocation,
    )


@router.post("/ai/checklist", response_model=AuditChecklistAIResponse)
def ai_checklist(
    payload: AuditChecklistAIRequest,
    current_user: User = Depends(get_current_user),
):
    sections: List[AuditChecklistSection] = []
    recommendations: List[str] = []

    if payload.audit_type == AuditType.IT_SECURITY:
        sections.append(
            AuditChecklistSection(
                id=0,
                title="Access Management Controls",
                description="Validate privileged access and authentication hardening.",
                weight=30,
                is_required=True,
                order_index=0,
                questions=[
                    AuditChecklistQuestion(
                        id=0,
                        question_text="Are multi-factor authentication controls enforced for administrative access?",
                        question_type=AuditQuestionType.YES_NO,
                        evidence_required=True,
                        scoring_weight=10,
                        risk_impact=RiskLevel.HIGH,
                        guidance_notes="Review identity provider policies and recent access logs.",
                        order_index=0,
                    ),
                    AuditChecklistQuestion(
                        id=0,
                        question_text="Provide evidence of quarterly privileged access reviews.",
                        question_type=AuditQuestionType.EVIDENCE,
                        evidence_required=True,
                        scoring_weight=8,
                        risk_impact=RiskLevel.MEDIUM,
                        guidance_notes="Collect review sign-off documents.",
                        order_index=1,
                    ),
                ],
            )
        )
        recommendations.append("Focus on threat monitoring coverage and vulnerability remediation SLA adherence.")
    else:
        sections.append(
            AuditChecklistSection(
                id=0,
                title="Governance & Leadership",
                description="Confirm governance structure and accountability mechanisms.",
                weight=25,
                is_required=True,
                order_index=0,
                questions=[
                    AuditChecklistQuestion(
                        id=0,
                        question_text="Document leadership oversight cadence and escalation thresholds.",
                        question_type=AuditQuestionType.TEXT,
                        evidence_required=False,
                        scoring_weight=6,
                        risk_impact=RiskLevel.MEDIUM,
                        guidance_notes="Interview stakeholders and review meeting notes.",
                        order_index=0,
                    ),
                    AuditChecklistQuestion(
                        id=0,
                        question_text="Rate the maturity of governance processes (1-5).",
                        question_type=AuditQuestionType.RATING,
                        evidence_required=False,
                        scoring_weight=4,
                        risk_impact=RiskLevel.LOW,
                        guidance_notes="Use organisation maturity model as reference.",
                        order_index=1,
                    ),
                ],
            )
        )
        recommendations.append("Include stakeholder interviews to validate governance maturity claims.")

    if payload.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        recommendations.append("Increase sampling to 100% for high risk control areas.")

    return AuditChecklistAIResponse(sections=sections, recommendations=recommendations)


@router.post("/ai/notifications", response_model=AuditNotificationAIResponse)
def ai_notifications(
    payload: AuditNotificationAIRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    settings = {
        "audit_announcement": True,
        "daily_reminders": payload.audit_type in {AuditType.IT_SECURITY, AuditType.COMPLIANCE},
        "progress_updates": True,
        "completion_notifications": True,
    }

    start_str = payload.start_date.strftime("%d %B %Y")
    end_str = payload.end_date.strftime("%d %B %Y")

    email_templates = {
        "audit_announcement": (
            f"Team,\n\nThe {payload.audit_type.value.replace('_', ' ').title()} will commence on {start_str}. "
            "Please review the scope and be prepared for kickoff."
        ),
        "daily_reminder": (
            "Reminder: Provide daily status updates and upload evidence by 4 PM local time."
        ),
        "completion_notice": (
            f"Audit activities conclude on {end_str}. Ensure all findings and evidence are finalised in the system."
        ),
    }

    cc_list: List[str] = []
    bcc_list: List[str] = []
    if payload.audit_type in {AuditType.FINANCIAL, AuditType.COMPLIANCE}:
        cc_list.append("finance-controller@company.com")
    if payload.audit_type == AuditType.IT_SECURITY:
        cc_list.append("ciso@company.com")
    bcc_list.append("audit-archive@company.com")

    timing_recommendations = [
        "Send announcements at least 10 business days prior to kickoff.",
        "Schedule progress digests every Tuesday and Thursday.",
        "Issue completion notice within 24 hours of final walkthrough.",
    ]

    notification_settings = AuditNotificationSettings.model_validate(settings)
    email_template_models = AuditEmailTemplates.model_validate(email_templates)

    return AuditNotificationAIResponse(
        notification_settings=notification_settings,
        email_templates=email_template_models,
        distribution_list_ids=payload.recipients,
        cc_list=cc_list,
        bcc_list=bcc_list,
        timing_recommendations=timing_recommendations,
    )


@router.post("/ai/review", response_model=AuditReviewAIResponse)
def ai_review(
    payload: AuditReviewAIRequest,
    current_user: User = Depends(get_current_user),
):
    audit = payload.audit
    validation_messages: List[str] = []
    optimisation: List[str] = []

    if audit.planned_end_date <= audit.planned_start_date:
        validation_messages.append("Planned end date must be after the start date.")
    if len(audit.sections) == 0:
        validation_messages.append("Add at least one checklist section to cover audit scope.")
    if len(audit.audit_team_ids) < 1:
        optimisation.append("Add supporting auditors to distribute workload.")

    if audit.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL} and audit.estimated_duration_hours < 24:
        optimisation.append("Extend duration to at least 3 working days for high risk engagements.")

    duration_days = (audit.planned_end_date - audit.planned_start_date).days + 1
    success_probability = 0.75
    if validation_messages:
        success_probability -= 0.25
    if audit.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        success_probability -= 0.05
    if duration_days >= 5:
        success_probability += 0.05
    success_probability = max(0.3, min(0.95, success_probability))

    launch_recommendation = "Launch immediately once resourcing is confirmed."
    if audit.launch_option.lower().startswith("schedule"):
        launch_recommendation = "Schedule kickoff 5 business days before planned start date for readiness."
    elif audit.launch_option.lower().startswith("save") or audit.launch_option.lower().startswith("draft"):
        launch_recommendation = "Maintain as draft until stakeholder sign-off is secured."

    return AuditReviewAIResponse(
        validation_messages=validation_messages or ["Audit configuration passes automated validation."],
        optimisation_opportunities=optimisation,
        predicted_success_probability=round(success_probability, 2),
        launch_timing_recommendation=launch_recommendation,
    )
