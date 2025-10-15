from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.user_management_ai import generate_user_management_intelligence
from auth import (
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
    require_roles,
)
from database import get_db
from models import Department, PermissionLevel, User, UserRole
from schemas import (
    UserManagementAIRequest,
    UserManagementAIResponse,
    UserManagementActivity,
    UserManagementAnalytics,
    UserManagementCreate,
    UserManagementDashboardResponse,
    UserManagementDepartmentOption,
    UserManagementDepartmentSlice,
    UserManagementDetail,
    UserManagementGrowthTrendPoint,
    UserManagementListItem,
    UserManagementListResponse,
    UserManagementManagerOption,
    UserManagementOnboardingStep,
    UserManagementOptionsResponse,
    UserManagementPriorityLists,
    UserManagementPriorityUser,
    UserManagementRoleSlice,
    UserManagementStatusSlice,
    UserManagementSummaryCards,
    UserManagementUpdate,
)

router = APIRouter(prefix="/user-management", tags=["User Management"])

READ_ROLES = ("manager", "admin", "super admin")
MANAGE_ROLES = ("admin", "super admin")


def _month_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, 1)


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    return datetime(year, month, 1)


def _safe_percentage(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round((part / whole) * 100, 1)


def _format_full_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip()


def _status_label(user: User) -> str:
    if not user.is_active:
        return "Inactive"
    if not user.is_verified:
        return "Pending Verification"
    return "Active"


def _parse_responsibility_payload(user: User) -> Tuple[List[str], List[Dict[str, object]]]:
    raw = user.areas_of_responsibility
    if not raw:
        return [], []
    try:
        decoded = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return [], []

    if isinstance(decoded, dict):
        responsibilities = decoded.get("responsibilities", [])
        plan = decoded.get("onboarding_plan", [])
    elif isinstance(decoded, list):
        responsibilities = decoded
        plan = []
    else:
        responsibilities = []
        plan = []

    # Ensure list types
    responsibilities = [str(item) for item in responsibilities if isinstance(item, str)]
    plan_items: List[Dict[str, object]] = []
    for step in plan or []:
        if isinstance(step, dict) and step.get("title"):
            plan_items.append(step)
    return responsibilities, plan_items


def _pack_responsibility_payload(responsibilities: Iterable[str], plan: Iterable[Dict[str, object]]) -> str:
    payload = {
        "responsibilities": [str(item) for item in responsibilities],
        "onboarding_plan": list(plan),
    }
    return json.dumps(payload)


def _compute_user_risk_score(user: User) -> float:
    score = 40.0
    if not user.is_verified:
        score += 12
    if not user.mfa_enabled:
        score += 10
    if not user.is_active:
        score += 8
    if user.last_login is None:
        score += 16
    else:
        days_since = (datetime.utcnow() - user.last_login).days
        if days_since > 120:
            score += 18
        elif days_since > 60:
            score += 12
        elif days_since > 30:
            score += 6
    if user.permission_level in {PermissionLevel.ADMIN, PermissionLevel.SUPER_ADMIN}:
        score += 6
    return round(min(100.0, max(0.0, score)), 1)


def _onboarding_steps_from_plan(
    user: User,
    plan: Iterable[Dict[str, object]],
) -> List[UserManagementOnboardingStep]:
    steps: List[UserManagementOnboardingStep] = []
    base_date = user.created_at.date() if user.created_at else date.today()
    for item in plan:
        title = str(item.get("title", "")).strip()
        if not title:
            continue
        due_in_days = item.get("due_in_days")
        due_date = None
        if isinstance(due_in_days, (int, float)):
            due_date = base_date + timedelta(days=int(due_in_days))
        notes = item.get("notes")
        owner = item.get("owner_role") or item.get("owner")
        status = str(item.get("status", "Planned")).strip() or "Planned"
        steps.append(
            UserManagementOnboardingStep(
                title=title,
                status=status,
                due_date=due_date,
                owner=str(owner) if owner else None,
                notes=str(notes) if notes else None,
            )
        )
    return steps


def _generate_default_plan(user: User, responsibilities: List[str]) -> List[UserManagementOnboardingStep]:
    experience = "mid"
    if user.position and "senior" in user.position.lower():
        experience = "senior"
    elif user.position and any(keyword in user.position.lower() for keyword in ("assistant", "junior", "associate")):
        experience = "junior"

    ai_payload = UserManagementAIRequest(
        role=user.role,
        department=user.user_department.name if user.user_department else None,
        responsibilities=responsibilities,
        experience_level=experience,
        requires_mfa=not user.mfa_enabled,
        remote_worker=False,
        tool_stack=["Comply-X Core"],
    )
    ai_response: UserManagementAIResponse = generate_user_management_intelligence(ai_payload)
    planned_steps: List[Dict[str, object]] = []
    for step in ai_response.recommended_steps:
        planned_steps.append(step.model_dump())
    return _onboarding_steps_from_plan(user, planned_steps)


def _build_activity_timeline(user: User) -> List[UserManagementActivity]:
    timeline: List[UserManagementActivity] = []
    if user.created_at:
        timeline.append(
            UserManagementActivity(
                timestamp=user.created_at,
                activity_type="Account Created",
                description=f"{_format_full_name(user)} account provisioned",
            )
        )
    if user.is_verified and user.created_at:
        timeline.append(
            UserManagementActivity(
                timestamp=user.created_at + timedelta(minutes=5),
                activity_type="Verification",
                description="Identity verification completed",
            )
        )
    if user.last_login:
        timeline.append(
            UserManagementActivity(
                timestamp=user.last_login,
                activity_type="Login",
                description="Last successful login recorded",
            )
        )
    if not user.is_active and user.updated_at:
        timeline.append(
            UserManagementActivity(
                timestamp=user.updated_at,
                activity_type="Account Suspended",
                description="Account marked inactive",
            )
        )
    return sorted(timeline, key=lambda item: item.timestamp, reverse=True)


def _compute_engagement_scores(user: User, plan: List[UserManagementOnboardingStep]) -> Tuple[float, float, str]:
    score = 70.0
    if user.last_login:
        days = (datetime.utcnow() - user.last_login).days
        if days <= 7:
            score += 15
        elif days <= 30:
            score += 8
        elif days <= 90:
            score -= 4
        else:
            score -= 12
    else:
        score -= 15

    if user.is_active:
        score += 6
    else:
        score -= 8

    if user.mfa_enabled:
        score += 3
    else:
        score -= 4

    completed_steps = sum(1 for step in plan if step.status.lower() == "completed")
    if plan:
        score += (completed_steps / len(plan)) * 10

    score = max(20.0, min(95.0, score))
    attrition_risk = max(5.0, min(95.0, 100.0 - score + (0 if user.is_active else 10)))

    if attrition_risk < 35:
        risk_level = "Low"
    elif attrition_risk < 65:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    return round(score, 1), round(attrition_risk, 1), risk_level


def _calculate_onboarding_progress(user: User, plan: List[UserManagementOnboardingStep]) -> float:
    completed = 0
    total = 3  # verification, mfa, first login
    completed += 1 if user.is_verified else 0
    completed += 1 if user.mfa_enabled else 0
    completed += 1 if user.last_login else 0

    for step in plan:
        total += 1
        if step.status.lower() == "completed":
            completed += 1
    if total == 0:
        return 0.0
    return round((completed / total) * 100, 1)


def _access_insights(user: User, responsibilities: List[str]) -> List[str]:
    insights: List[str] = []
    role_label = user.role.value.replace("_", " ").title()
    permission_label = user.permission_level.value.replace("_", " ").title()
    insights.append(f"{role_label} with {permission_label} permissions.")
    insights.append(
        "Multi-factor authentication is "
        + ("enabled." if user.mfa_enabled else "not enabled – prioritise enrollment.")
    )
    if responsibilities:
        insights.append(
            "Primary focus areas: " + ", ".join(responsibilities[:3])
            + ("." if len(responsibilities) <= 3 else ", and more.")
        )
    if user.last_login:
        insights.append(
            f"Last login { (datetime.utcnow() - user.last_login).days } days ago."
        )
    else:
        insights.append("User has not logged in yet.")
    return insights


def _user_to_priority_user(user: User) -> UserManagementPriorityUser:
    return UserManagementPriorityUser(
        id=user.id,
        full_name=_format_full_name(user),
        role=user.role,
        department=user.user_department.name if user.user_department else None,
        last_login=user.last_login,
        risk_score=_compute_user_risk_score(user),
        mfa_enabled=user.mfa_enabled,
        status=_status_label(user),
    )


def _user_to_list_item(user: User) -> UserManagementListItem:
    return UserManagementListItem(
        id=user.id,
        full_name=_format_full_name(user),
        email=user.email,
        role=user.role or UserRole.EMPLOYEE,
        department=user.user_department.name if user.user_department else None,
        status=_status_label(user),
        last_login=user.last_login,
        created_at=user.created_at or datetime.utcnow(),
        risk_score=_compute_user_risk_score(user),
        mfa_enabled=bool(user.mfa_enabled),
    )


def _user_to_detail(
    user: User,
    db: Session,
    override_plan: Optional[List[Dict[str, object]]] = None,
) -> UserManagementDetail:
    responsibilities, stored_plan = _parse_responsibility_payload(user)
    if override_plan is not None:
        stored_plan = list(override_plan)

    onboarding_steps = _onboarding_steps_from_plan(user, stored_plan)
    if not onboarding_steps:
        onboarding_steps = _generate_default_plan(user, responsibilities)

    engagement_score, attrition_risk, risk_level = _compute_engagement_scores(user, onboarding_steps)
    onboarding_progress = _calculate_onboarding_progress(user, onboarding_steps)

    manager_name = None
    if user.reporting_manager:
        manager_name = _format_full_name(user.reporting_manager)

    return UserManagementDetail(
        id=user.id,
        full_name=_format_full_name(user),
        email=user.email,
        role=user.role or UserRole.EMPLOYEE,
        department=user.user_department.name if user.user_department else None,
        manager=manager_name,
        permission_level=user.permission_level or PermissionLevel.READER,
        is_active=bool(user.is_active),
        is_verified=bool(user.is_verified),
        mfa_enabled=bool(user.mfa_enabled),
        phone=user.phone,
        position=user.position,
        created_at=user.created_at or user.updated_at or datetime.utcnow(),
        updated_at=user.updated_at or user.created_at or datetime.utcnow(),
        last_login=user.last_login,
        areas_of_responsibility=responsibilities,
        onboarding_progress=onboarding_progress,
        onboarding_steps=onboarding_steps,
        engagement_score=engagement_score,
        attrition_risk=attrition_risk,
        risk_level=risk_level,
        activity_timeline=_build_activity_timeline(user),
        access_insights=_access_insights(user, responsibilities),
    )


@router.get("/dashboard", response_model=UserManagementDashboardResponse)
def get_user_management_dashboard(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    inactive_users = db.query(func.count(User.id)).filter(User.is_active.is_(False)).scalar() or 0
    pending_verification = (
        db.query(func.count(User.id))
        .filter(User.is_verified.is_(False))
        .scalar()
        or 0
    )
    new_this_month = 0
    avg_tenure_days = 0.0
    if total_users:
        start_of_month = _month_start(datetime.utcnow())
        new_this_month = (
            db.query(func.count(User.id))
            .filter(User.created_at >= start_of_month)
            .scalar()
            or 0
        )
        created_dates = [row[0] for row in db.query(User.created_at).all() if row[0]]
        if created_dates:
            days = [(datetime.utcnow() - dt).days for dt in created_dates]
            avg_tenure_days = sum(days) / len(days)

    mfa_enabled_count = db.query(func.count(User.id)).filter(User.mfa_enabled.is_(True)).scalar() or 0
    mfa_enabled_rate = _safe_percentage(mfa_enabled_count, total_users)

    summary = UserManagementSummaryCards(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        pending_verification=pending_verification,
        new_this_month=new_this_month,
        average_tenure_days=round(avg_tenure_days, 1) if avg_tenure_days else 0.0,
        mfa_enabled_rate=mfa_enabled_rate,
    )

    status_distribution = [
        UserManagementStatusSlice(status="Active", count=active_users, percentage=_safe_percentage(active_users, total_users)),
        UserManagementStatusSlice(status="Inactive", count=inactive_users, percentage=_safe_percentage(inactive_users, total_users)),
        UserManagementStatusSlice(status="Pending Verification", count=pending_verification, percentage=_safe_percentage(pending_verification, total_users)),
    ]

    role_rows = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .order_by(func.count(User.id).desc())
        .all()
    )
    role_distribution = [
        UserManagementRoleSlice(role=row[0], count=row[1]) for row in role_rows
    ]

    department_rows = (
        db.query(Department.id, Department.name, func.count(User.id))
        .outerjoin(User, User.department_id == Department.id)
        .group_by(Department.id, Department.name)
        .order_by(func.count(User.id).desc())
        .all()
    )
    department_distribution = [
        UserManagementDepartmentSlice(
            department_id=row[0],
            department_name=row[1] or "Unassigned",
            count=row[2],
        )
        for row in department_rows
    ]

    # Include unassigned users if not already captured
    unassigned_count = (
        db.query(func.count(User.id))
        .filter(User.department_id.is_(None))
        .scalar()
        or 0
    )
    if unassigned_count and not any(slice.department_id is None for slice in department_distribution):
        department_distribution.append(
            UserManagementDepartmentSlice(
                department_id=None,
                department_name="Unassigned",
                count=unassigned_count,
            )
        )

    trend_points: List[UserManagementGrowthTrendPoint] = []
    current_month_start = _month_start(datetime.utcnow())
    for offset in range(5, -1, -1):
        period_start = _add_months(current_month_start, -offset)
        period_end = _add_months(period_start, 1)
        count = (
            db.query(func.count(User.id))
            .filter(User.created_at >= period_start, User.created_at < period_end)
            .scalar()
            or 0
        )
        trend_points.append(
            UserManagementGrowthTrendPoint(
                period=period_start.strftime("%b %Y"),
                user_count=count,
            )
        )

    analytics = UserManagementAnalytics(
        status_distribution=status_distribution,
        role_distribution=role_distribution,
        department_distribution=department_distribution,
        growth_trend=trend_points,
    )

    key_roles = (
        db.query(User)
        .filter(User.role.in_([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]))
        .order_by(User.last_login.is_(None).desc(), User.last_login.asc())
        .limit(8)
        .all()
    )
    inactive_accounts = (
        db.query(User)
        .filter(User.is_active.is_(False))
        .order_by(User.updated_at.desc())
        .limit(8)
        .all()
    )
    pending_accounts = (
        db.query(User)
        .filter(User.is_verified.is_(False))
        .order_by(User.created_at.asc())
        .limit(8)
        .all()
    )
    recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(8)
        .all()
    )

    priority_lists = UserManagementPriorityLists(
        key_roles=[_user_to_priority_user(user) for user in key_roles],
        inactive_accounts=[_user_to_priority_user(user) for user in inactive_accounts],
        pending_verification=[_user_to_priority_user(user) for user in pending_accounts],
        recently_added=[_user_to_priority_user(user) for user in recent_users],
    )

    dominant_role = UserRole.EMPLOYEE
    if role_distribution:
        dominant_role = max(role_distribution, key=lambda slice: slice.count).role

    dominant_department = None
    if department_distribution:
        dominant_department = max(department_distribution, key=lambda slice: slice.count).department_name

    ai_request = UserManagementAIRequest(
        role=dominant_role,
        department=dominant_department,
        responsibilities=["Access governance", "Policy adherence"],
        experience_level="mid",
        requires_mfa=mfa_enabled_rate < 75,
        remote_worker=False,
        tool_stack=["Comply-X"],
    )
    ai_summary = generate_user_management_intelligence(ai_request).insights

    return UserManagementDashboardResponse(
        summary=summary,
        analytics=analytics,
        priority_lists=priority_lists,
        ai_summary=ai_summary,
        last_refreshed=datetime.utcnow(),
    )


@router.get("/options", response_model=UserManagementOptionsResponse)
def get_user_management_options(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    departments = (
        db.query(Department)
        .order_by(Department.name.asc())
        .all()
    )
    manager_roles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]
    managers = (
        db.query(User)
        .filter(User.role.in_(manager_roles))
        .order_by(User.first_name.asc(), User.last_name.asc())
        .all()
    )
    timezones = [
        "UTC",
        "America/New_York",
        "Europe/London",
        "Europe/Berlin",
        "Asia/Singapore",
        "Australia/Sydney",
    ]
    return UserManagementOptionsResponse(
        roles=list(UserRole),
        permission_levels=list(PermissionLevel),
        departments=[
            UserManagementDepartmentOption(id=dept.id, name=dept.name)
            for dept in departments
        ],
        managers=[
            UserManagementManagerOption(
                id=manager.id,
                full_name=_format_full_name(manager),
                role=manager.role,
            )
            for manager in managers
        ],
        timezones=timezones,
    )


@router.get("", response_model=UserManagementListResponse)
def list_users(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    items = [_user_to_list_item(user) for user in users]
    return UserManagementListResponse(items=items, total=len(items))


@router.get("/{user_id}", response_model=UserManagementDetail)
def get_user_detail(
    user_id: int,
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _user_to_detail(user, db)


@router.post("", response_model=UserManagementDetail, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserManagementCreate,
    _: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    if not payload.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")

    if get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if get_user_by_username(db, payload.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    responsibility_payload = _pack_responsibility_payload(
        payload.areas_of_responsibility,
        [step.model_dump() for step in payload.onboarding_steps],
    )

    new_user = User(
        email=payload.email,
        username=payload.username,
        first_name=payload.first_name,
        last_name=payload.last_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        department_id=payload.department_id,
        permission_level=payload.permission_level,
        phone=payload.phone,
        position=payload.position,
        employee_id=payload.employee_id,
        reporting_manager_id=payload.reporting_manager_id,
        areas_of_responsibility=responsibility_payload,
        timezone=payload.timezone or "UTC",
        notifications_email=payload.notifications_email,
        notifications_sms=payload.notifications_sms,
        is_active=payload.is_active,
        is_verified=payload.is_verified,
        mfa_enabled=payload.mfa_enabled,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return _user_to_detail(new_user, db, override_plan=[step.model_dump() for step in payload.onboarding_steps])


@router.patch("/{user_id}", response_model=UserManagementDetail)
def update_user(
    user_id: int,
    payload: UserManagementUpdate,
    _: User = Depends(require_roles(*MANAGE_ROLES)),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.role is not None:
        user.role = payload.role
    if payload.department_id is not None:
        user.department_id = payload.department_id
    if payload.permission_level is not None:
        user.permission_level = payload.permission_level
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.position is not None:
        user.position = payload.position
    if payload.reporting_manager_id is not None:
        user.reporting_manager_id = payload.reporting_manager_id
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    if payload.mfa_enabled is not None:
        user.mfa_enabled = payload.mfa_enabled
    if payload.areas_of_responsibility is not None:
        _, plan = _parse_responsibility_payload(user)
        user.areas_of_responsibility = _pack_responsibility_payload(payload.areas_of_responsibility, plan)

    db.commit()
    db.refresh(user)

    return _user_to_detail(user, db)


@router.post("/ai/assist", response_model=UserManagementAIResponse)
def ai_assist_user_management(
    payload: UserManagementAIRequest,
    _: User = Depends(require_roles(*READ_ROLES)),
):
    return generate_user_management_intelligence(payload)

