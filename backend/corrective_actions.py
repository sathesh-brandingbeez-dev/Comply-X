from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.corrective_action_ai import generate_action_intelligence
from auth import get_current_user, require_roles
from database import get_db
from models import (
    CorrectiveAction as CorrectiveActionModel,
    CorrectiveActionImpact,
    CorrectiveActionMetric as CorrectiveActionMetricModel,
    CorrectiveActionPriority,
    CorrectiveActionSource,
    CorrectiveActionStatus,
    CorrectiveActionStep as CorrectiveActionStepModel,
    CorrectiveActionStepStatus,
    CorrectiveActionType,
    CorrectiveActionUpdate as CorrectiveActionUpdateModel,
    CorrectiveActionUpdateType,
    CorrectiveActionUrgency,
    CorrectiveActionEvaluationMethod,
    Department,
    User,
)
from schemas import (
    CorrectiveActionAIRequest,
    CorrectiveActionAIResponse,
    CorrectiveActionAttachment,
    CorrectiveActionCreate,
    CorrectiveActionDashboardResponse,
    CorrectiveActionDetail,
    CorrectiveActionListItem,
    CorrectiveActionListResponse,
    CorrectiveActionMetric,
    CorrectiveActionMetricInput,
    CorrectiveActionOptionsResponse,
    CorrectiveActionPriorityLists,
    CorrectiveActionSummaryCards,
    CorrectiveActionAnalytics,
    CorrectiveActionStatusSlice,
    CorrectiveActionDepartmentSlice,
    CorrectiveActionTypeSlice,
    CorrectiveActionCompletionTrendPoint,
    CorrectiveActionStep,
    CorrectiveActionStepInput,
    CorrectiveActionUpdate,
    CorrectiveActionUpdateInput,
    CorrectiveActionUpdatePayload,
    PriorityActionItem,
    CorrectiveActionAIInsights,
)


router = APIRouter(prefix="/corrective-actions", tags=["Corrective Actions"])

READ_ROLES = ("Reader", "Editor", "Reviewer", "Admin", "Super Admin")
MANAGE_ROLES = ("Editor", "Reviewer", "Admin", "Super Admin")


def _generate_action_code(db: Session) -> str:
    year = datetime.utcnow().year
    start = datetime(year, 1, 1)
    end = datetime(year + 1, 1, 1)
    count = (
        db.query(func.count(CorrectiveActionModel.id))
        .filter(CorrectiveActionModel.created_at >= start, CorrectiveActionModel.created_at < end)
        .scalar()
    )
    sequence = (count or 0) + 1
    return f"CA-{year}-{sequence:04d}"


def _serialize_attachment(payload: CorrectiveActionAttachment) -> Dict[str, Optional[str]]:
    return payload.model_dump()


def _step_progress_value(status: CorrectiveActionStepStatus) -> float:
    mapping = {
        CorrectiveActionStepStatus.NOT_STARTED: 0.0,
        CorrectiveActionStepStatus.IN_PROGRESS: 0.5,
        CorrectiveActionStepStatus.COMPLETED: 1.0,
        CorrectiveActionStepStatus.DELAYED: 0.25,
    }
    return mapping.get(status, 0.0)


def _compute_progress_percent(action: CorrectiveActionModel) -> float:
    if not action.steps:
        return action.progress_percent or 0.0
    total = sum(_step_progress_value(step.status) for step in action.steps)
    percent = (total / len(action.steps)) * 100
    return round(min(100.0, max(0.0, percent)), 1)


def _load_user_map(db: Session, user_ids: List[int]) -> Dict[int, str]:
    if not user_ids:
        return {}
    rows = db.query(User.id, User.first_name, User.last_name).filter(User.id.in_(user_ids)).all()
    return {row.id: f"{row.first_name} {row.last_name}".strip() for row in rows}


def _action_to_detail(action: CorrectiveActionModel, db: Session) -> CorrectiveActionDetail:
    review_team_map = _load_user_map(db, action.review_team_ids or [])
    owner_name = None
    if action.owner:
        owner_name = f"{action.owner.first_name} {action.owner.last_name}".strip()
    approver_name = None
    if action.approver:
        approver_name = f"{action.approver.first_name} {action.approver.last_name}".strip()

    steps = [
        CorrectiveActionStep(
            id=step.id,
            description=step.description,
            responsible_person_id=step.responsible_person_id,
            responsible_person_name=(
                f"{step.responsible_person.first_name} {step.responsible_person.last_name}".strip()
                if step.responsible_person
                else None
            ),
            due_date=step.due_date,
            resources_required=step.resources_required,
            success_criteria=step.success_criteria,
            status=step.status,
            progress_notes=step.progress_notes,
            issues_obstacles=step.issues_obstacles,
            completion_date=step.completion_date,
            evidence=[CorrectiveActionAttachment(**item) for item in (step.evidence or [])],
            order_index=step.order_index,
        )
        for step in sorted(action.steps, key=lambda s: s.order_index)
    ]

    updates = [
        CorrectiveActionUpdate(
            id=update.id,
            update_type=update.update_type,
            description=update.description,
            attachments=[CorrectiveActionAttachment(**item) for item in (update.attachments or [])],
            created_at=update.created_at,
            created_by_id=update.created_by_id,
            created_by_name=(
                f"{update.created_by.first_name} {update.created_by.last_name}".strip()
                if update.created_by
                else None
            ),
        )
        for update in sorted(action.updates, key=lambda u: u.created_at, reverse=True)
    ]

    metrics = [
        CorrectiveActionMetric(
            id=metric.id,
            metric_name=metric.metric_name,
            target_value=metric.target_value,
            actual_value=metric.actual_value,
            measurement_method=metric.measurement_method,
            measurement_date=metric.measurement_date,
        )
        for metric in action.metrics
    ]

    ai_payload = action.ai_recommendations or {}
    ai_insights = None
    if action.ai_effectiveness_score or ai_payload:
        priority_recommendation = ai_payload.get("priority_recommendation")
        if isinstance(priority_recommendation, str):
            try:
                priority_recommendation = CorrectiveActionPriority(priority_recommendation)
            except ValueError:
                priority_recommendation = None
        ai_insights = CorrectiveActionAIInsights(
            effectiveness_score=action.ai_effectiveness_score,
            predicted_rating=action.effectiveness_rating,
            risk_score=action.ai_risk_score,
            prioritized_level=priority_recommendation,
            success_probability=ai_payload.get("success_probability"),
            resource_recommendations=ai_payload.get("resource_recommendations", []),
            escalation_recommendations=ai_payload.get("escalation_recommendations", []),
            timeline_advice=ai_payload.get("timeline_advice"),
        )

    return CorrectiveActionDetail(
        id=action.id,
        action_code=action.action_code,
        title=action.title,
        action_type=action.action_type,
        source_reference=action.source_reference,
        reference_id=action.reference_id,
        department_ids=list(action.department_ids or []),
        priority=action.priority,
        impact=action.impact,
        urgency=action.urgency,
        problem_statement=action.problem_statement,
        root_cause=action.root_cause,
        contributing_factors=action.contributing_factors,
        impact_assessment=action.impact_assessment,
        current_controls=action.current_controls,
        evidence_files=[CorrectiveActionAttachment(**item) for item in (action.evidence_files or [])],
        corrective_action_description=action.corrective_action_description,
        overall_due_date=action.overall_due_date,
        action_owner_id=action.action_owner_id,
        action_owner_name=owner_name,
        review_team_ids=list(action.review_team_ids or []),
        review_team=list(review_team_map.values()),
        budget_required=action.budget_required,
        approval_required=action.approval_required,
        approver_id=action.approver_id,
        approver_name=approver_name,
        status=action.status,
        progress_percent=action.progress_percent,
        evaluation_due_date=action.evaluation_due_date,
        evaluation_method=action.evaluation_method,
        effectiveness_rating=action.effectiveness_rating,
        evaluation_comments=action.evaluation_comments,
        further_actions_required=action.further_actions_required,
        follow_up_actions=action.follow_up_actions,
        ai_insights=ai_insights,
        steps=steps,
        updates=updates,
        metrics=metrics,
        last_updated_at=action.updated_at,
        created_at=action.created_at,
    )


def _serialize_list_item(action: CorrectiveActionModel) -> CorrectiveActionListItem:
    owner_name = None
    if action.owner:
        owner_name = f"{action.owner.first_name} {action.owner.last_name}".strip()
    return CorrectiveActionListItem(
        id=action.id,
        action_code=action.action_code,
        title=action.title,
        status=action.status,
        priority=action.priority,
        impact=action.impact,
        urgency=action.urgency,
        due_date=action.overall_due_date,
        progress_percent=action.progress_percent,
        owner_name=owner_name,
        effectiveness_score=action.ai_effectiveness_score,
    )


@router.get("/options", response_model=CorrectiveActionOptionsResponse)
async def get_corrective_action_options(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    departments = db.query(Department).order_by(Department.name).all()
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.first_name, User.last_name).all()

    return CorrectiveActionOptionsResponse(
        action_types=list(CorrectiveActionType),
        source_references=list(CorrectiveActionSource),
        priority_levels=list(CorrectiveActionPriority),
        impact_levels=list(CorrectiveActionImpact),
        urgency_levels=list(CorrectiveActionUrgency),
        evaluation_methods=list(CorrectiveActionEvaluationMethod),
        step_statuses=list(CorrectiveActionStepStatus),
        update_types=list(CorrectiveActionUpdateType),
        departments=[{"id": dept.id, "name": dept.name, "code": dept.code} for dept in departments],
        users=[
            {
                "id": user.id,
                "name": f"{user.first_name} {user.last_name}".strip(),
                "role": user.role.value,
            }
            for user in users
        ],
    )


@router.post("/ai/assist", response_model=CorrectiveActionAIResponse)
async def ai_assist_corrective_action(
    payload: CorrectiveActionAIRequest,
    _: User = Depends(require_roles(*READ_ROLES)),
):
    return generate_action_intelligence(payload)


@router.post("", response_model=CorrectiveActionDetail, status_code=status.HTTP_201_CREATED)
async def create_corrective_action(
    payload: CorrectiveActionCreate,
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    if not payload.department_ids:
        raise HTTPException(status_code=400, detail="At least one department must be selected.")

    if payload.approval_required and not payload.approver_id:
        raise HTTPException(status_code=400, detail="Approver is required when approval is needed.")

    action_code = _generate_action_code(db)

    action = CorrectiveActionModel(
        action_code=action_code,
        title=payload.title,
        action_type=payload.action_type,
        source_reference=payload.source_reference,
        reference_id=payload.reference_id,
        department_ids=list(payload.department_ids),
        priority=payload.priority,
        impact=payload.impact,
        urgency=payload.urgency,
        problem_statement=payload.problem_statement,
        root_cause=payload.root_cause,
        contributing_factors=payload.contributing_factors,
        impact_assessment=payload.impact_assessment,
        current_controls=payload.current_controls,
        evidence_files=[_serialize_attachment(file) for file in (payload.evidence_files or [])],
        corrective_action_description=payload.corrective_action_description,
        overall_due_date=payload.overall_due_date,
        action_owner_id=payload.action_owner_id,
        review_team_ids=list(payload.review_team_ids or []),
        budget_required=payload.budget_required,
        approval_required=payload.approval_required,
        approver_id=payload.approver_id,
        evaluation_due_date=payload.evaluation_due_date,
        evaluation_method=payload.evaluation_method,
        created_by_id=current_user.id,
    )

    db.add(action)
    db.flush()

    for index, step_payload in enumerate(payload.steps or []):
        step = CorrectiveActionStepModel(
            action_id=action.id,
            order_index=index,
            description=step_payload.description,
            responsible_person_id=step_payload.responsible_person_id,
            due_date=step_payload.due_date,
            resources_required=step_payload.resources_required,
            success_criteria=step_payload.success_criteria,
            status=step_payload.status,
            progress_notes=step_payload.progress_notes,
            issues_obstacles=step_payload.issues_obstacles,
            completion_date=step_payload.completion_date,
            evidence=[_serialize_attachment(item) for item in (step_payload.evidence or [])],
        )
        db.add(step)

    for metric_payload in payload.success_metrics or []:
        metric = CorrectiveActionMetricModel(
            action_id=action.id,
            metric_name=metric_payload.metric_name,
            target_value=metric_payload.target_value,
            actual_value=metric_payload.actual_value,
            measurement_method=metric_payload.measurement_method,
            measurement_date=metric_payload.measurement_date,
        )
        db.add(metric)

    ai_response = generate_action_intelligence(
        CorrectiveActionAIRequest(
            action_type=payload.action_type,
            priority=payload.priority,
            impact=payload.impact,
            urgency=payload.urgency,
            problem_statement=payload.problem_statement,
            root_cause=payload.root_cause,
            impact_assessment=payload.impact_assessment,
            current_controls=payload.current_controls,
            existing_steps=payload.steps or [],
        )
    )

    action.ai_effectiveness_score = ai_response.insights.effectiveness_score
    action.ai_risk_score = ai_response.insights.risk_score
    action.effectiveness_rating = ai_response.insights.predicted_rating
    action.ai_recommendations = {
        "resource_recommendations": ai_response.insights.resource_recommendations,
        "escalation_recommendations": ai_response.insights.escalation_recommendations,
        "timeline_advice": ai_response.insights.timeline_advice,
        "priority_recommendation": ai_response.insights.prioritized_level.value if ai_response.insights.prioritized_level else None,
        "success_probability": ai_response.insights.success_probability,
    }

    base_step_count = len(payload.steps or [])
    for offset, extra_step in enumerate(ai_response.recommended_steps):
        step = CorrectiveActionStepModel(
            action_id=action.id,
            order_index=base_step_count + offset,
            description=extra_step.description,
            responsible_person_id=extra_step.responsible_person_id,
            due_date=extra_step.due_date,
            resources_required=extra_step.resources_required,
            success_criteria=extra_step.success_criteria,
            status=extra_step.status,
            progress_notes=extra_step.progress_notes,
            issues_obstacles=extra_step.issues_obstacles,
            completion_date=extra_step.completion_date,
            evidence=[_serialize_attachment(item) for item in (extra_step.evidence or [])],
        )
        db.add(step)

    for metric in ai_response.recommended_metrics:
        db.add(
            CorrectiveActionMetricModel(
                action_id=action.id,
                metric_name=metric.metric_name,
                target_value=metric.target_value,
                actual_value=metric.actual_value,
                measurement_method=metric.measurement_method,
                measurement_date=metric.measurement_date,
            )
        )

    db.commit()
    db.refresh(action)

    action.progress_percent = _compute_progress_percent(action)
    db.commit()
    db.refresh(action)

    return _action_to_detail(action, db)


@router.get("", response_model=CorrectiveActionListResponse)
async def list_corrective_actions(
    status_filter: Optional[CorrectiveActionStatus] = Query(default=None, alias="status"),
    assigned_to_me: bool = False,
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(CorrectiveActionModel)

    if status_filter:
        query = query.filter(CorrectiveActionModel.status == status_filter)

    actions = query.order_by(CorrectiveActionModel.overall_due_date.asc()).all()

    if assigned_to_me:
        actions = [
            action
            for action in actions
            if action.action_owner_id == current_user.id
            or (current_user.id in (action.review_team_ids or []))
        ]
    return CorrectiveActionListResponse(items=[_serialize_list_item(action) for action in actions], total=len(actions))


@router.get("/dashboard", response_model=CorrectiveActionDashboardResponse)
async def corrective_actions_dashboard(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    actions = db.query(CorrectiveActionModel).all()

    today = date.today()
    effectiveness_scores = [score for score in (action.ai_effectiveness_score for action in actions) if score is not None]
    summary = CorrectiveActionSummaryCards(
        total_actions=len(actions),
        open_actions=sum(
            1
            for action in actions
            if action.status in (CorrectiveActionStatus.OPEN, CorrectiveActionStatus.IN_PROGRESS)
        ),
        overdue_actions=sum(
            1
            for action in actions
            if action.overall_due_date
            and action.overall_due_date < today
            and action.status not in (CorrectiveActionStatus.COMPLETED, CorrectiveActionStatus.CLOSED)
        ),
        completed_this_month=sum(
            1
            for action in actions
            if action.status == CorrectiveActionStatus.COMPLETED
            and action.updated_at
            and action.updated_at.year == today.year
            and action.updated_at.month == today.month
        ),
        average_effectiveness=(
            round(sum(effectiveness_scores) / len(effectiveness_scores), 1)
            if effectiveness_scores
            else None
        ),
    )

    if today.month == 1:
        prev_month = 12
        prev_year = today.year - 1
    else:
        prev_month = today.month - 1
        prev_year = today.year

    last_month_total = sum(
        1
        for action in actions
        if action.created_at
        and action.created_at.year == prev_year
        and action.created_at.month == prev_month
    )
    if last_month_total:
        summary.trend_delta = round(((summary.total_actions - last_month_total) / last_month_total) * 100, 1)
        summary.trend_direction = "up" if summary.trend_delta > 0 else "down" if summary.trend_delta < 0 else "steady"

    status_distribution = [
        CorrectiveActionStatusSlice(status=status, count=sum(1 for action in actions if action.status == status))
        for status in CorrectiveActionStatus
    ]

    department_counts: Dict[int, int] = {}
    for action in actions:
        for dept_id in action.department_ids or []:
            department_counts[dept_id] = department_counts.get(dept_id, 0) + 1
    dept_ids = list(department_counts.keys())
    departments = (
        db.query(Department.id, Department.name).filter(Department.id.in_(dept_ids)).all()
        if dept_ids
        else []
    )
    department_names = {dept.id: dept.name for dept in departments}
    department_distribution = [
        CorrectiveActionDepartmentSlice(
            department_id=dept_id,
            department_name=department_names.get(dept_id, "Unknown"),
            count=count,
        )
        for dept_id, count in department_counts.items()
    ]

    type_distribution = [
        CorrectiveActionTypeSlice(
            action_type=action_type,
            count=sum(1 for action in actions if action.action_type == action_type),
        )
        for action_type in CorrectiveActionType
    ]

    trend_points: List[CorrectiveActionCompletionTrendPoint] = []
    history: Dict[str, Dict[str, int]] = {}
    for action in actions:
        if action.updated_at and action.status == CorrectiveActionStatus.COMPLETED:
            label = action.updated_at.strftime("%b %Y")
            history.setdefault(label, {"completed": 0, "predicted": 0})
            history[label]["completed"] += 1
    sorted_labels = sorted(history.keys(), key=lambda label: datetime.strptime(label, "%b %Y"))
    for label in sorted_labels:
        trend_points.append(
            CorrectiveActionCompletionTrendPoint(
                period=label,
                completed_count=history[label]["completed"],
                predicted_count=history[label]["completed"],
            )
        )
    if trend_points:
        last_point = trend_points[-1]
        predicted = max(0, round(last_point.completed_count * 1.1))
        next_period = (datetime.strptime(last_point.period, "%b %Y") + timedelta(days=32)).replace(day=1)
        trend_points.append(
            CorrectiveActionCompletionTrendPoint(
                period=next_period.strftime("%b %Y"),
                completed_count=0,
                predicted_count=predicted,
            )
        )

    analytics = CorrectiveActionAnalytics(
        status_distribution=status_distribution,
        department_distribution=department_distribution,
        type_distribution=type_distribution,
        completion_trend=trend_points,
    )

    def to_priority_item(action: CorrectiveActionModel) -> PriorityActionItem:
        return PriorityActionItem(
            id=action.id,
            action_code=action.action_code,
            title=action.title,
            priority=action.priority,
            impact=action.impact,
            urgency=action.urgency,
            status=action.status,
            due_date=action.overall_due_date,
            days_to_due=(action.overall_due_date - today).days if action.overall_due_date else None,
            progress_percent=action.progress_percent,
            owner_name=(
                f"{action.owner.first_name} {action.owner.last_name}".strip() if action.owner else None
            ),
            risk_score=action.ai_risk_score,
        )

    high_priority = [
        to_priority_item(action)
        for action in actions
        if action.priority in (CorrectiveActionPriority.HIGH, CorrectiveActionPriority.CRITICAL)
        and action.status in (CorrectiveActionStatus.OPEN, CorrectiveActionStatus.IN_PROGRESS)
    ]
    overdue = [
        to_priority_item(action)
        for action in actions
        if action.overall_due_date and action.overall_due_date < today and action.status not in (CorrectiveActionStatus.COMPLETED, CorrectiveActionStatus.CLOSED)
    ]
    due_this_week = [
        to_priority_item(action)
        for action in actions
        if action.overall_due_date
        and 0 <= (action.overall_due_date - today).days <= 7
        and action.status in (CorrectiveActionStatus.OPEN, CorrectiveActionStatus.IN_PROGRESS)
    ]
    recently_completed = [
        to_priority_item(action)
        for action in actions
        if action.status == CorrectiveActionStatus.COMPLETED and action.updated_at and (today - action.updated_at.date()).days <= 14
    ]

    priority_lists = CorrectiveActionPriorityLists(
        high_priority=sorted(high_priority, key=lambda item: item.risk_score or 0, reverse=True),
        overdue=sorted(overdue, key=lambda item: item.days_to_due or -999),
        due_this_week=sorted(due_this_week, key=lambda item: item.days_to_due or 999),
        recently_completed=sorted(recently_completed, key=lambda item: item.due_date or today, reverse=True),
    )

    ai_highlights: List[str] = []
    if high_priority:
        ai_highlights.append(
            f"AI prioritised {len(high_priority)} actions requiring immediate attention based on risk scores."
        )
    if summary.average_effectiveness:
        ai_highlights.append(
            f"Predicted effectiveness across actions is {summary.average_effectiveness}% indicating overall {('strong' if summary.average_effectiveness >= 75 else 'moderate')} control maturity."
        )

    return CorrectiveActionDashboardResponse(
        summary=summary,
        analytics=analytics,
        priority_lists=priority_lists,
        ai_highlights=ai_highlights,
        last_refreshed=datetime.utcnow(),
    )


@router.get("/{action_id}", response_model=CorrectiveActionDetail)
async def get_corrective_action(
    action_id: int,
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    action = db.get(CorrectiveActionModel, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")
    action.progress_percent = _compute_progress_percent(action)
    db.commit()
    db.refresh(action)
    return _action_to_detail(action, db)


@router.put("/{action_id}", response_model=CorrectiveActionDetail)
async def update_corrective_action(
    action_id: int,
    payload: CorrectiveActionUpdatePayload,
    _: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    action = db.get(CorrectiveActionModel, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    previous_status = action.status

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "evidence_files" and value is not None:
            setattr(action, field, [_serialize_attachment(item) for item in value])
        elif field == "review_team_ids" and value is not None:
            setattr(action, field, list(value))
        else:
            setattr(action, field, value)

    action.progress_percent = _compute_progress_percent(action)
    if payload.status and payload.status != previous_status:
        action.last_status_change = datetime.utcnow()

    db.commit()
    db.refresh(action)
    return _action_to_detail(action, db)


@router.post("/{action_id}/updates", response_model=CorrectiveActionUpdate)
async def add_corrective_action_update(
    action_id: int,
    payload: CorrectiveActionUpdateInput,
    current_user: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    action = db.get(CorrectiveActionModel, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Corrective action not found")

    update = CorrectiveActionUpdateModel(
        action_id=action.id,
        update_type=payload.update_type,
        description=payload.description,
        attachments=[_serialize_attachment(item) for item in (payload.attachments or [])],
        created_by_id=current_user.id,
    )
    db.add(update)
    action.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(update)
    db.refresh(action)

    return CorrectiveActionUpdate(
        id=update.id,
        update_type=update.update_type,
        description=update.description,
        attachments=[CorrectiveActionAttachment(**item) for item in (update.attachments or [])],
        created_at=update.created_at,
        created_by_id=update.created_by_id,
        created_by_name=f"{current_user.first_name} {current_user.last_name}".strip(),
    )


@router.patch("/{action_id}/steps/{step_id}", response_model=CorrectiveActionStep)
async def update_corrective_action_step(
    action_id: int,
    step_id: int,
    payload: CorrectiveActionStepInput,
    _: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    step = db.query(CorrectiveActionStepModel).filter_by(id=step_id, action_id=action_id).first()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "evidence":
            setattr(step, field, [_serialize_attachment(item) for item in (value or [])])
        else:
            setattr(step, field, value)
    step.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(step)

    action = step.action
    action.progress_percent = _compute_progress_percent(action)
    db.commit()
    db.refresh(action)

    return CorrectiveActionStep(
        id=step.id,
        description=step.description,
        responsible_person_id=step.responsible_person_id,
        responsible_person_name=(
            f"{step.responsible_person.first_name} {step.responsible_person.last_name}".strip()
            if step.responsible_person
            else None
        ),
        due_date=step.due_date,
        resources_required=step.resources_required,
        success_criteria=step.success_criteria,
        status=step.status,
        progress_notes=step.progress_notes,
        issues_obstacles=step.issues_obstacles,
        completion_date=step.completion_date,
        evidence=[CorrectiveActionAttachment(**item) for item in (step.evidence or [])],
        order_index=step.order_index,
    )


@router.patch("/{action_id}/metrics/{metric_id}", response_model=CorrectiveActionMetric)
async def update_corrective_action_metric(
    action_id: int,
    metric_id: int,
    payload: CorrectiveActionMetricInput,
    _: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    metric = db.query(CorrectiveActionMetricModel).filter_by(id=metric_id, action_id=action_id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(metric, field, value)
    db.commit()
    db.refresh(metric)

    return CorrectiveActionMetric(
        id=metric.id,
        metric_name=metric.metric_name,
        target_value=metric.target_value,
        actual_value=metric.actual_value,
        measurement_method=metric.measurement_method,
        measurement_date=metric.measurement_date,
    )


__all__ = ["router"]
