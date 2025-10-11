from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Sequence

from models import Incident, IncidentSeverity
from schemas import (
    IncidentDuplicateDetectionResponse,
    IncidentDuplicateMatch,
    IncidentInvestigationInsightsRequest,
    IncidentInvestigationInsightsResponse,
    IncidentResourceSuggestionResponse,
    IncidentClassificationRequest,
    IncidentClassificationResponse,
    IncidentSeverityAssessmentResponse,
    IncidentTrendForecastRequest,
    IncidentTrendForecastResponse,
    IncidentTrendPoint,
)


@dataclass
class InvestigationTimelineRecommendation:
    target_resolution_date: date
    timeline_guidance: List[str]
    priority_rationale: str


def _normalise_text(text: str | None) -> List[str]:
    if not text:
        return []
    cleaned = ''.join(ch.lower() if ch.isalnum() else ' ' for ch in text)
    tokens = [token for token in cleaned.split() if len(token) > 2]
    return tokens


def _next_month_label(latest_label: str | None) -> str:
    if not latest_label:
        return datetime.utcnow().strftime("%b %Y")
    try:
        parsed = datetime.strptime(latest_label, "%b %Y")
    except ValueError:
        return datetime.utcnow().strftime("%b %Y")
    month = parsed.month + 1
    year = parsed.year
    if month > 12:
        month = 1
        year += 1
    return datetime(year, month, 1).strftime("%b %Y")


def forecast_incident_trend(request: IncidentTrendForecastRequest) -> IncidentTrendForecastResponse:
    history = request.history or []
    projections: List[IncidentTrendPoint] = []

    counts = [max(0, point.open_count) for point in history]
    prev_label = None

    for point in history:
        projections.append(
            IncidentTrendPoint(
                period=point.period,
                open_count=point.open_count,
                resolved_count=point.resolved_count,
                predicted_count=point.predicted_count,
            )
        )
        prev_label = point.period

    if counts:
        last = counts[-1]
        trend = last - counts[-2] if len(counts) >= 2 else last
        smoothing = trend * 0.6
        predicted = max(0, int(round(last + smoothing)))
    else:
        predicted = 2

    next_label = _next_month_label(prev_label)
    projections.append(
        IncidentTrendPoint(
            period=next_label,
            open_count=predicted,
            resolved_count=0,
            predicted_count=predicted,
        )
    )

    alerts: List[str] = []
    if counts and predicted > counts[-1]:
        alerts.append("Incident volume is projected to rise. Prepare response teams accordingly.")
    elif counts and predicted < counts[-1]:
        alerts.append("Projected decline indicates mitigation efforts are effective.")

    narrative = (
        f"Based on the last {len(counts)} months, incident volume is projected at {predicted} cases for {next_label}."
        if counts
        else "Limited history available. Projection derived from default baseline."
    )

    confidence = 0.65 if counts and len(counts) >= 3 else 0.45

    return IncidentTrendForecastResponse(
        projections=projections,
        narrative=narrative,
        confidence=confidence,
        alerts=alerts,
    )


def suggest_resource_allocation(
    *,
    severity_distribution: Dict[IncidentSeverity, int],
    open_incidents: int,
) -> IncidentResourceSuggestionResponse:
    critical = severity_distribution.get(IncidentSeverity.CRITICAL, 0)
    high = severity_distribution.get(IncidentSeverity.HIGH, 0)
    medium = severity_distribution.get(IncidentSeverity.MEDIUM, 0)

    base = max(2, open_incidents // 3 + critical * 3 + high * 2)
    if medium > 4:
        base += 1

    shift_guidance = "Maintain 24/7 coverage" if critical else "Extended business hours coverage recommended"
    specialist_support: List[str] = []

    if critical or high:
        specialist_support.append("Engage senior incident commander")
    if severity_distribution.get(IncidentSeverity.LOW, 0) > 5:
        specialist_support.append("Rotate junior responders for low severity triage")
    if critical >= 2:
        specialist_support.append("Coordinate with executive crisis team")

    return IncidentResourceSuggestionResponse(
        recommended_headcount=base,
        shift_guidance=shift_guidance,
        specialist_support=specialist_support,
    )


def auto_classify_incident(
    payload: IncidentClassificationRequest,
) -> IncidentClassificationResponse:
    tokens = set(_normalise_text(payload.title) + _normalise_text(payload.description))
    candidate_categories = {
        "injury": "Injury",
        "evacu": "Hazard Observation",
        "breach": "Cybersecurity",
        "malware": "Cybersecurity",
        "password": "Access Control",
        "regulator": "Regulatory",
        "policy": "Policy",
        "audit": "Regulatory",
        "spill": "Spill",
        "emission": "Emissions",
        "waste": "Waste",
        "defect": "Product Defect",
        "customer": "Customer Experience",
        "complaint": "Customer Experience",
        "outage": "Network",
        "downtime": "Service Availability",
        "vendor": "Supplier Non-Conformance",
    }

    for token, category in candidate_categories.items():
        if any(token in word for word in tokens):
            return IncidentClassificationResponse(
                suggested_category=category,
                rationale=f"Detected keyword '{token}' associated with {category}",
            )

    type_defaults = {
        "safety incident": "Hazard Observation",
        "security breach": "Cybersecurity",
        "compliance violation": "Regulatory",
        "environmental incident": "Spill",
        "quality issue": "Process Deviation",
        "it system failure": "Service Availability",
        "process failure": "Procedure",
        "customer complaint": "Customer Experience",
    }
    default_category = type_defaults.get(payload.incident_type.lower(), "General")
    return IncidentClassificationResponse(
        suggested_category=default_category,
        rationale="No direct keyword match found; using default category mapping",
    )


def assess_incident_severity(
    *,
    description: str,
    impact_assessment: str | None,
    immediate_actions: str | None,
) -> IncidentSeverityAssessmentResponse:
    tokens = _normalise_text(description) + _normalise_text(impact_assessment)
    high_risk_keywords = {"injury", "breach", "fire", "shutdown", "exposure", "lawsuit"}
    medium_keywords = {"delay", "outage", "service", "deviation", "noncompliance"}

    score = 0
    if any(word in tokens for word in high_risk_keywords):
        score += 2
    if any(word in tokens for word in medium_keywords):
        score += 1

    if impact_assessment and "financial" in impact_assessment.lower():
        score += 1
    if impact_assessment and "regulator" in impact_assessment.lower():
        score += 1

    if immediate_actions and "evacu" in immediate_actions.lower():
        score += 2

    if score >= 4:
        severity = IncidentSeverity.CRITICAL
        indicators = ["High impact keywords detected", "Emergency actions referenced"]
        confidence = 0.75
    elif score == 3:
        severity = IncidentSeverity.HIGH
        indicators = ["Significant operational disruption referenced"]
        confidence = 0.7
    elif score == 2:
        severity = IncidentSeverity.MEDIUM
        indicators = ["Moderate risk indicators detected"]
        confidence = 0.6
    else:
        severity = IncidentSeverity.LOW
        indicators = ["No high-risk indicators detected"]
        confidence = 0.55

    return IncidentSeverityAssessmentResponse(
        recommended_severity=severity,
        confidence=confidence,
        indicators=indicators,
    )


def recommend_escalation_path(*, severity: IncidentSeverity, department_id: int | None) -> List[str]:
    path = ["Notify department manager"]
    if severity in {IncidentSeverity.HIGH, IncidentSeverity.CRITICAL}:
        path.append("Alert executive leadership")
    if severity == IncidentSeverity.CRITICAL:
        path.append("Engage crisis management team")
        path.append("Prepare external communication draft")
    if department_id:
        path.append(f"Inform department {department_id} compliance liaison")
    return path


def detect_duplicate_incidents(
    *,
    incident: Incident,
    existing_incidents: Sequence[Incident],
) -> IncidentDuplicateDetectionResponse:
    current_tokens = set(_normalise_text(incident.title) + _normalise_text(incident.detailed_description))
    matches: List[IncidentDuplicateMatch] = []

    for other in existing_incidents:
        other_tokens = set(_normalise_text(other.title) + _normalise_text(other.detailed_description))
        if not other_tokens:
            continue
        overlap = current_tokens.intersection(other_tokens)
        union = current_tokens.union(other_tokens) or {"_"}
        similarity = len(overlap) / len(union)
        time_delta = abs((incident.occurred_at - other.occurred_at).total_seconds())
        if similarity >= 0.35 or time_delta < 3600 * 12:
            matches.append(
                IncidentDuplicateMatch(
                    incident_id=other.id,
                    incident_code=other.incident_code,
                    title=other.title,
                    similarity=round(similarity, 2),
                    occurred_at=other.occurred_at,
                )
            )

    matches.sort(key=lambda item: item.similarity, reverse=True)
    return IncidentDuplicateDetectionResponse(matches=matches[:5])


def recommend_investigation_timeline(
    *,
    incident_type: str,
    severity: IncidentSeverity,
    occurred_at: datetime,
) -> InvestigationTimelineRecommendation:
    base_days = {
        IncidentSeverity.CRITICAL: 2,
        IncidentSeverity.HIGH: 5,
        IncidentSeverity.MEDIUM: 10,
        IncidentSeverity.LOW: 15,
    }[severity]

    if "environment" in incident_type.lower():
        base_days = max(3, base_days - 1)
    if "security" in incident_type.lower() or "breach" in incident_type.lower():
        base_days = max(2, base_days - 2)

    target_date = occurred_at.date() + timedelta(days=base_days)
    guidance = [
        "Kick-off investigation briefing within 4 hours",
        "Document evidence collection with timestamps",
        "Hold daily stand-up until containment achieved" if severity in {IncidentSeverity.HIGH, IncidentSeverity.CRITICAL} else "Provide progress updates twice weekly",
        "Coordinate with legal and compliance for reporting obligations" if "compliance" in incident_type.lower() else "Share interim findings with stakeholders",
    ]

    rationale = (
        "Accelerated response mandated by severity level"
        if severity in {IncidentSeverity.HIGH, IncidentSeverity.CRITICAL}
        else "Standard resolution window based on historical closure times"
    )

    return InvestigationTimelineRecommendation(
        target_resolution_date=target_date,
        timeline_guidance=guidance,
        priority_rationale=rationale,
    )


def suggest_root_cause_factors(
    payload: IncidentInvestigationInsightsRequest,
) -> IncidentInvestigationInsightsResponse:
    description_tokens = set(_normalise_text(payload.description))
    contributing_tokens = set(_normalise_text(payload.contributing_factors))

    recommended_methods = ["5 Whys", "Fishbone Analysis"]
    if payload.severity in {IncidentSeverity.HIGH, IncidentSeverity.CRITICAL}:
        recommended_methods.append("Fault Tree Analysis")

    suggested_primary: str | None = None
    factors: List[str] = []

    if "training" in description_tokens or "training" in contributing_tokens:
        factors.append("Human factors – insufficient training or awareness")
        suggested_primary = suggested_primary or "Human error due to inadequate training"
    if "procedure" in description_tokens:
        factors.append("Process design – procedure unclear or outdated")
        suggested_primary = suggested_primary or "Process gap in documented procedure"
    if "system" in description_tokens or "software" in description_tokens:
        factors.append("System failure – software instability detected")
    if "vendor" in contributing_tokens:
        factors.append("External dependency – supplier performance issue")

    if not factors:
        factors.append("Collect additional data from witnesses and system logs")

    timeline_guidance = [
        "Validate interim containment effectiveness within 24 hours",
        "Schedule root cause workshop with cross-functional team",
        "Prepare corrective action draft aligned with severity",
    ]

    return IncidentInvestigationInsightsResponse(
        recommended_rca_methods=recommended_methods,
        suggested_primary_cause=suggested_primary,
        contributing_factors=factors,
        timeline_guidance=timeline_guidance,
    )
