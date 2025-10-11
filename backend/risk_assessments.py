from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Iterable, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_roles
from database import get_db
from models import (
    Country,
    CountryRiskAssessment,
    CountryRiskAssessmentCountry,
    CountryRiskCategoryScore,
    CountryRiskCategoryWeight,
    RiskAssessmentType,
    RiskConfidence,
    RiskLevel,
    RiskScoringScale,
    RiskTrend,
    RiskUpdateSource,
    User,
)
from data.default_countries import DEFAULT_COUNTRY_OPTIONS
from schemas import (
    RiskAssessmentCategoryWeight,
    RiskAssessmentCountryCategoryScore,
    RiskAssessmentCountryDetail,
    RiskAssessmentCountryListResponse,
    RiskAssessmentCountryOption,
    RiskAssessmentCountryResponse,
    RiskAssessmentCountryUpsert,
    RiskAssessmentDashboardResponse,
    RiskAssessmentDetail,
    RiskAssessmentListItem,
    RiskAssessmentMapCountry,
    RiskAssessmentOptionsResponse,
    RiskAssessmentScaleEntry,
    RiskAssessmentSummaryCards,
    RiskAssessmentCreate,
    RiskAssessmentUpdate,
    RiskAssessmentUserOption,
)

router = APIRouter(prefix="/risk-assessments", tags=["Risk Assessments"])


READ_ROLES = ("Reader", "Editor", "Reviewer", "Admin", "Super Admin")
MANAGE_ROLES = ("Editor", "Reviewer", "Admin", "Super Admin")


DEFAULT_CATEGORIES: list[RiskAssessmentCategoryWeight] = [
    RiskAssessmentCategoryWeight(category_key="political", display_name="Political Stability", weight=15, order_index=0),
    RiskAssessmentCategoryWeight(category_key="economic", display_name="Economic Indicators", weight=15, order_index=1),
    RiskAssessmentCategoryWeight(category_key="regulatory", display_name="Regulatory Environment", weight=15, order_index=2),
    RiskAssessmentCategoryWeight(category_key="corruption", display_name="Corruption Index", weight=10, order_index=3),
    RiskAssessmentCategoryWeight(category_key="infrastructure", display_name="Infrastructure Quality", weight=10, order_index=4),
    RiskAssessmentCategoryWeight(category_key="currency", display_name="Currency Stability", weight=10, order_index=5),
    RiskAssessmentCategoryWeight(category_key="trade", display_name="Trade Relations", weight=10, order_index=6),
    RiskAssessmentCategoryWeight(category_key="security", display_name="Security Environment", weight=15, order_index=7),
]

DEFAULT_IMPACT_SCALE = [
    RiskAssessmentScaleEntry(label="Low", description="Limited operational disruption; easily recoverable."),
    RiskAssessmentScaleEntry(label="Medium", description="Manageable disruption with moderate mitigation effort."),
    RiskAssessmentScaleEntry(label="High", description="Significant disruption requiring executive oversight."),
    RiskAssessmentScaleEntry(label="Critical", description="Severe disruption with enterprise-wide implications."),
]

DEFAULT_PROBABILITY_SCALE = [
    RiskAssessmentScaleEntry(label="Unlikely", description="< 20% chance of occurring within assessment period."),
    RiskAssessmentScaleEntry(label="Possible", description="20-40% likelihood within assessment period."),
    RiskAssessmentScaleEntry(label="Likely", description="40-70% likelihood; active monitoring required."),
    RiskAssessmentScaleEntry(label="Almost Certain", description="> 70% likelihood; proactive mitigation mandatory."),
]


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _ensure_scale_entries(raw: Optional[list[dict]]) -> list[RiskAssessmentScaleEntry]:
    if not raw:
        return []
    entries: list[RiskAssessmentScaleEntry] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label", "")).strip()
        description = str(item.get("description", "")).strip()
        if not label:
            continue
        entries.append(RiskAssessmentScaleEntry(label=label, description=description))
    return entries


def _ensure_category_weights(
    categories: Iterable[RiskAssessmentCategoryWeight],
) -> list[RiskAssessmentCategoryWeight]:
    normalised: list[RiskAssessmentCategoryWeight] = []
    seen: set[str] = set()
    for index, category in enumerate(categories):
        key = category.category_key.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        normalised.append(
            RiskAssessmentCategoryWeight(
                category_key=key,
                display_name=category.display_name.strip() or key.replace("_", " ").title(),
                weight=max(0, min(100, category.weight)),
                order_index=category.order_index if category.order_index is not None else index,
                baseline_guidance=category.baseline_guidance,
            )
        )
    return normalised if normalised else DEFAULT_CATEGORIES


def _serialise_category_weight(model: CountryRiskCategoryWeight) -> RiskAssessmentCategoryWeight:
    return RiskAssessmentCategoryWeight(
        category_key=model.category_key,
        display_name=model.display_name,
        weight=model.weight,
        order_index=model.order_index,
        baseline_guidance=model.baseline_guidance,
    )


def _serialise_country(country: CountryRiskAssessmentCountry) -> RiskAssessmentCountryDetail:
    return RiskAssessmentCountryDetail(
        id=country.id,
        country_code=country.country_code,
        country_name=country.country_name,
        overall_score=country.overall_score,
        risk_level=country.risk_level,
        trend=country.trend,
        confidence=country.confidence,
        last_updated=country.last_updated,
        update_source=country.update_source,
        evidence=country.evidence,
        comments=country.comments,
        next_review_date=country.next_review_date,
        ai_generated=country.ai_generated,
        category_scores=[
            RiskAssessmentCountryCategoryScore(
                id=score.id,
                category_key=score.category_key,
                category_name=score.category_name,
                score=score.score,
                trend=score.trend,
                confidence=score.confidence,
                evidence=score.evidence,
                last_updated=score.last_updated,
                update_source=score.update_source,
            )
            for score in sorted(country.category_scores, key=lambda item: item.category_name)
        ],
    )


def _serialise_list_item(assessment: CountryRiskAssessment) -> RiskAssessmentListItem:
    high_risk_count = sum(
        1 for country in assessment.countries if country.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}
    )
    return RiskAssessmentListItem(
        id=assessment.id,
        title=assessment.title,
        assessment_type=assessment.assessment_type,
        assessment_framework=assessment.assessment_framework,
        status=assessment.status,
        period_start=assessment.period_start,
        period_end=assessment.period_end,
        update_frequency=assessment.update_frequency,
        country_count=len(assessment.countries),
        high_risk_countries=high_risk_count,
        updated_at=assessment.updated_at,
    )


def _serialise_detail(assessment: CountryRiskAssessment) -> RiskAssessmentDetail:
    return RiskAssessmentDetail(
        **_serialise_list_item(assessment).model_dump(),
        scoring_scale=assessment.scoring_scale,
        custom_scoring_scale=assessment.custom_scoring_scale,
        impact_scale=_ensure_scale_entries(assessment.impact_scale),
        probability_scale=_ensure_scale_entries(assessment.probability_scale),
        categories=[_serialise_category_weight(category) for category in assessment.categories],
        assigned_assessor_id=assessment.assigned_assessor_id,
        review_team_ids=assessment.review_team_ids or [],
        ai_configuration=assessment.ai_configuration or {},
        countries=[_serialise_country(country) for country in assessment.countries],
    )


def _calculate_summary(assessment: CountryRiskAssessment) -> RiskAssessmentSummaryCards:
    countries = assessment.countries
    total = len(countries)
    high_risk = sum(1 for country in countries if country.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL})
    window_start = datetime.utcnow() - timedelta(days=30)
    recent_changes = sum(
        1
        for country in countries
        if country.last_updated and country.last_updated >= window_start
    )
    return RiskAssessmentSummaryCards(
        total_countries_assessed=total,
        high_risk_countries=high_risk,
        recent_risk_changes=recent_changes,
        next_assessment_due=assessment.period_end,
    )


def _build_map_entries(
    assessment: CountryRiskAssessment,
    *,
    risk_type: Optional[str],
    data_source: Optional[str],
) -> list[RiskAssessmentMapCountry]:
    entries: list[RiskAssessmentMapCountry] = []
    risk_key = (risk_type or "overall").lower()
    allowed_sources: Optional[set[RiskUpdateSource]] = None
    if data_source:
        ds = data_source.lower()
        if ds == "internal":
            allowed_sources = {RiskUpdateSource.MANUAL, RiskUpdateSource.AI_ANALYSIS}
        elif ds == "external":
            allowed_sources = {RiskUpdateSource.EXTERNAL_DATA}
    for country in assessment.countries:
        if allowed_sources and country.update_source and country.update_source not in allowed_sources:
            continue
        overall_score = country.overall_score
        risk_level = country.risk_level
        trend = country.trend
        confidence = country.confidence
        if risk_key != "overall":
            matching = next(
                (score for score in country.category_scores if score.category_key == risk_key),
                None,
            )
            if matching:
                overall_score = matching.score
                trend = matching.trend
                confidence = matching.confidence
        entries.append(
            RiskAssessmentMapCountry(
                country_code=country.country_code,
                country_name=country.country_name,
                overall_score=overall_score,
                risk_level=risk_level,
                trend=trend,
                confidence=confidence,
                update_source=country.update_source,
            )
        )
    return entries


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/options", response_model=RiskAssessmentOptionsResponse)
def get_risk_assessment_options(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READ_ROLES)),
) -> RiskAssessmentOptionsResponse:
    countries = (
        db.query(Country)
        .filter(Country.is_active.is_(True))
        .order_by(Country.name.asc())
        .all()
    )
    users = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.first_name.asc(), User.last_name.asc())
        .all()
    )
    # When the customer has not yet loaded their own countries we fall back to a
    # comprehensive ISO list so that the risk workflow still functions out of the box.
    merged_countries: dict[str, RiskAssessmentCountryOption] = {}

    for country in countries:
        if not country.code or not country.name:
            continue
        merged_countries[country.code.upper()] = RiskAssessmentCountryOption(
            code=country.code.upper(),
            name=country.name,
        )

    for entry in DEFAULT_COUNTRY_OPTIONS:
        code = entry["code"].upper()
        if code not in merged_countries:
            merged_countries[code] = RiskAssessmentCountryOption(code=code, name=entry["name"])

    country_options = sorted(merged_countries.values(), key=lambda option: option.name)
    user_options = [
        RiskAssessmentUserOption(
            id=user.id,
            name=f"{user.first_name} {user.last_name}",
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            department=user.user_department.name if user.user_department else None,
        )
        for user in users
    ]
    defaults = {
        "categories": [category.model_dump() for category in DEFAULT_CATEGORIES],
        "impact_scale": [entry.model_dump() for entry in DEFAULT_IMPACT_SCALE],
        "probability_scale": [entry.model_dump() for entry in DEFAULT_PROBABILITY_SCALE],
        "scoring_scales": [scale.value for scale in RiskScoringScale],
        "assessment_types": [atype.value for atype in RiskAssessmentType],
        "update_frequencies": ["Monthly", "Quarterly", "Annually", "As Needed"],
    }
    return RiskAssessmentOptionsResponse(
        countries=country_options,
        users=user_options,
        defaults=defaults,
    )


@router.post("", response_model=RiskAssessmentDetail, status_code=status.HTTP_201_CREATED)
def create_risk_assessment(
    payload: RiskAssessmentCreate,
    db: Session = Depends(get_db),
    user=Depends(require_roles(*MANAGE_ROLES)),
) -> RiskAssessmentDetail:
    assessor = db.query(User).filter(User.id == payload.assigned_assessor_id).first()
    if not assessor:
        raise HTTPException(status_code=404, detail="Assigned assessor not found")

    requested_codes = {code.strip().upper() for code in payload.country_codes if code.strip()}
    if not requested_codes:
        raise HTTPException(status_code=400, detail="At least one country must be selected")

    countries = (
        db.query(Country)
        .filter(func.upper(Country.code).in_(requested_codes))
        .all()
    )
    mapped_names = {country.code.upper(): country.name for country in countries}
    default_country_names = {entry["code"].upper(): entry["name"] for entry in DEFAULT_COUNTRY_OPTIONS}

    category_models = _ensure_category_weights(payload.categories or DEFAULT_CATEGORIES)

    assessment = CountryRiskAssessment(
        title=payload.title,
        assessment_type=payload.assessment_type,
        assessment_framework=payload.assessment_framework,
        period_start=payload.period_start,
        period_end=payload.period_end,
        update_frequency=payload.update_frequency,
        scoring_scale=payload.scoring_scale,
        custom_scoring_scale=payload.custom_scoring_scale,
        impact_scale=[entry.model_dump() for entry in (payload.impact_scale or DEFAULT_IMPACT_SCALE)],
        probability_scale=[entry.model_dump() for entry in (payload.probability_scale or DEFAULT_PROBABILITY_SCALE)],
        assigned_assessor_id=payload.assigned_assessor_id,
        review_team_ids=payload.review_team_ids,
        ai_configuration=payload.ai_configuration or {},
        created_by_id=user.id,
        status="in_progress",
    )
    db.add(assessment)
    db.flush()

    for idx, category in enumerate(category_models):
        db.add(
            CountryRiskCategoryWeight(
                assessment_id=assessment.id,
                category_key=category.category_key,
                display_name=category.display_name,
                weight=category.weight,
                order_index=idx,
                baseline_guidance=category.baseline_guidance,
            )
        )

    db.flush()

    for code in requested_codes:
        name = mapped_names.get(code) or default_country_names.get(code) or code
        country_entry = CountryRiskAssessmentCountry(
            assessment_id=assessment.id,
            country_code=code,
            country_name=name,
            overall_score=None,
            risk_level=None,
            trend=None,
            confidence=None,
            next_review_date=payload.period_end,
            update_source=RiskUpdateSource.MANUAL,
            ai_generated=False,
        )
        db.add(country_entry)
        db.flush()
        for category in category_models:
            db.add(
                CountryRiskCategoryScore(
                    country_entry_id=country_entry.id,
                    category_key=category.category_key,
                    category_name=category.display_name,
                )
            )

    db.commit()
    db.refresh(assessment)
    return _serialise_detail(assessment)


@router.get("", response_model=List[RiskAssessmentListItem])
def list_risk_assessments(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READ_ROLES)),
    assessment_type: Optional[RiskAssessmentType] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
) -> List[RiskAssessmentListItem]:
    query = db.query(CountryRiskAssessment)
    if assessment_type:
        query = query.filter(CountryRiskAssessment.assessment_type == assessment_type)
    if status_filter:
        query = query.filter(CountryRiskAssessment.status == status_filter)
    assessments = (
        query.order_by(CountryRiskAssessment.updated_at.desc()).limit(limit).all()
    )
    return [_serialise_list_item(assessment) for assessment in assessments]


@router.get("/dashboard", response_model=RiskAssessmentDashboardResponse)
def risk_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READ_ROLES)),
    assessment_id: Optional[int] = Query(None),
    risk_type: Optional[str] = Query(None, description="overall, political, economic, compliance, operational, etc."),
    data_source: Optional[str] = Query(None, description="internal, external, combined"),
) -> RiskAssessmentDashboardResponse:
    query = db.query(CountryRiskAssessment)
    if assessment_id:
        query = query.filter(CountryRiskAssessment.id == assessment_id)
    assessment = (
        query.order_by(CountryRiskAssessment.updated_at.desc()).first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="No risk assessments available")

    map_entries = _build_map_entries(assessment, risk_type=risk_type, data_source=data_source)
    summary = _calculate_summary(assessment)
    country_panels = [_serialise_country(country) for country in assessment.countries]

    ai_alerts: list[str] = []
    for country in assessment.countries:
        if country.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            ai_alerts.append(
                f"{country.country_name} flagged as {country.risk_level.value.title()} risk; ensure mitigation plan review."
            )
        if country.trend == RiskTrend.DETERIORATING:
            ai_alerts.append(
                f"{country.country_name} risk trend deteriorating. Investigate new incidents or regulatory changes."
            )

    return RiskAssessmentDashboardResponse(
        map_countries=map_entries,
        summary=summary,
        country_panels=country_panels,
        ai_alerts=ai_alerts[:6],
        last_refreshed=datetime.utcnow(),
    )


@router.get("/{assessment_id}", response_model=RiskAssessmentDetail)
def get_risk_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READ_ROLES)),
) -> RiskAssessmentDetail:
    assessment = (
        db.query(CountryRiskAssessment)
        .filter(CountryRiskAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    return _serialise_detail(assessment)


@router.put("/{assessment_id}", response_model=RiskAssessmentDetail)
def update_risk_assessment(
    assessment_id: int,
    payload: RiskAssessmentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*MANAGE_ROLES)),
) -> RiskAssessmentDetail:
    assessment = (
        db.query(CountryRiskAssessment)
        .filter(CountryRiskAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")

    assessment.title = payload.title
    assessment.assessment_type = payload.assessment_type
    assessment.assessment_framework = payload.assessment_framework
    assessment.period_start = payload.period_start
    assessment.period_end = payload.period_end
    assessment.update_frequency = payload.update_frequency
    assessment.scoring_scale = payload.scoring_scale
    assessment.custom_scoring_scale = payload.custom_scoring_scale
    assessment.impact_scale = [entry.model_dump() for entry in payload.impact_scale]
    assessment.probability_scale = [entry.model_dump() for entry in payload.probability_scale]
    assessment.review_team_ids = payload.review_team_ids
    assessment.ai_configuration = payload.ai_configuration or {}

    new_categories = _ensure_category_weights(payload.categories)

    existing = {category.category_key: category for category in assessment.categories}
    for category in assessment.categories:
        key = category.category_key
        updated = next((item for item in new_categories if item.category_key == key), None)
        if updated:
            category.display_name = updated.display_name
            category.weight = updated.weight
            category.order_index = updated.order_index
            category.baseline_guidance = updated.baseline_guidance
    for updated in new_categories:
        if updated.category_key not in existing:
            db.add(
                CountryRiskCategoryWeight(
                    assessment_id=assessment.id,
                    category_key=updated.category_key,
                    display_name=updated.display_name,
                    weight=updated.weight,
                    order_index=updated.order_index,
                    baseline_guidance=updated.baseline_guidance,
                )
            )
    db.flush()

    db.commit()
    db.refresh(assessment)
    return _serialise_detail(assessment)


@router.get("/{assessment_id}/countries", response_model=RiskAssessmentCountryListResponse)
def list_assessment_countries(
    assessment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*READ_ROLES)),
) -> RiskAssessmentCountryListResponse:
    assessment = (
        db.query(CountryRiskAssessment)
        .filter(CountryRiskAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")
    countries = [_serialise_country(country) for country in assessment.countries]
    return RiskAssessmentCountryListResponse(countries=countries)


@router.post("/{assessment_id}/countries", response_model=RiskAssessmentCountryResponse)
def upsert_assessment_country(
    assessment_id: int,
    payload: RiskAssessmentCountryUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(*MANAGE_ROLES)),
) -> RiskAssessmentCountryResponse:
    assessment = (
        db.query(CountryRiskAssessment)
        .filter(CountryRiskAssessment.id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found")

    code = payload.country_code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Country code is required")

    country_entry = next((country for country in assessment.countries if country.country_code == code), None)
    if not country_entry:
        country_entry = CountryRiskAssessmentCountry(
            assessment_id=assessment.id,
            country_code=code,
            country_name=payload.country_name or code,
        )
        db.add(country_entry)
        db.flush()
        for category in assessment.categories:
            db.add(
                CountryRiskCategoryScore(
                    country_entry_id=country_entry.id,
                    category_key=category.category_key,
                    category_name=category.display_name,
                )
            )

    if payload.country_name:
        country_entry.country_name = payload.country_name
    country_entry.overall_score = payload.overall_score
    country_entry.risk_level = payload.risk_level
    country_entry.trend = payload.trend
    country_entry.confidence = payload.confidence
    country_entry.update_source = payload.update_source or country_entry.update_source
    country_entry.evidence = payload.evidence
    country_entry.comments = payload.comments
    country_entry.next_review_date = payload.next_review_date
    country_entry.ai_generated = payload.ai_generated
    country_entry.last_updated = datetime.utcnow()

    scores_map = {score.category_key: score for score in country_entry.category_scores}
    for item in payload.category_scores:
        record = scores_map.get(item.category_key)
        if record:
            record.category_name = item.category_name or record.category_name
            record.score = item.score
            record.trend = item.trend
            record.confidence = item.confidence
            record.evidence = item.evidence
            record.update_source = item.update_source or record.update_source
            record.last_updated = datetime.utcnow()
        else:
            db.add(
                CountryRiskCategoryScore(
                    country_entry_id=country_entry.id,
                    category_key=item.category_key,
                    category_name=item.category_name or item.category_key.replace("_", " ").title(),
                    score=item.score,
                    trend=item.trend,
                    confidence=item.confidence,
                    evidence=item.evidence,
                    update_source=item.update_source,
                    last_updated=datetime.utcnow(),
                )
            )

    db.commit()
    db.refresh(country_entry)
    return _serialise_country(country_entry)
