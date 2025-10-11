from __future__ import annotations

from statistics import mean
from typing import Dict, Iterable, List, Sequence

from models import RiskAssessmentType, RiskConfidence, RiskLevel, RiskTrend


def _score_to_level(score: float | None) -> RiskLevel:
    if score is None:
        return RiskLevel.MEDIUM
    if score >= 76:
        return RiskLevel.CRITICAL
    if score >= 51:
        return RiskLevel.HIGH
    if score >= 26:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _aggregate_confidence(confidences: Iterable[RiskConfidence]) -> RiskConfidence:
    levels = [confidence for confidence in confidences if confidence is not None]
    if not levels:
        return RiskConfidence.MEDIUM
    if any(confidence == RiskConfidence.LOW for confidence in levels):
        return RiskConfidence.LOW
    if all(confidence == RiskConfidence.HIGH for confidence in levels):
        return RiskConfidence.HIGH
    return RiskConfidence.MEDIUM


def score_country(
    *,
    categories: Sequence[Dict[str, object]],
    recent_events: Sequence[str] | None = None,
    macro_indicators: Dict[str, float] | None = None,
) -> Dict[str, object]:
    weighted_scores: List[float] = []
    weights: List[int] = []
    confidences: List[RiskConfidence] = []
    deteriorating_count = 0
    improving_count = 0

    for category in categories:
        score = category.get("score")
        if score is None:
            continue
        try:
            value = float(score)
        except (TypeError, ValueError):
            continue
        weight = category.get("weight") or 0
        try:
            weight_value = int(weight)
        except (TypeError, ValueError):
            weight_value = 0
        weighted_scores.append(value * max(weight_value, 1))
        weights.append(max(weight_value, 1))

        confidence_value = category.get("confidence")
        if isinstance(confidence_value, RiskConfidence):
            confidences.append(confidence_value)
        elif isinstance(confidence_value, str):
            try:
                confidences.append(RiskConfidence(confidence_value))
            except ValueError:
                pass

        trend_value = category.get("trend")
        if isinstance(trend_value, RiskTrend):
            if trend_value == RiskTrend.DETERIORATING:
                deteriorating_count += 1
            elif trend_value == RiskTrend.IMPROVING:
                improving_count += 1
        elif isinstance(trend_value, str):
            try:
                trend_enum = RiskTrend(trend_value)
            except ValueError:
                trend_enum = None
            if trend_enum == RiskTrend.DETERIORATING:
                deteriorating_count += 1
            elif trend_enum == RiskTrend.IMPROVING:
                improving_count += 1

    if weighted_scores and weights:
        overall_score = sum(weighted_scores) / sum(weights)
    elif weighted_scores:
        overall_score = mean(weighted_scores)
    else:
        overall_score = None

    risk_level = _score_to_level(overall_score)
    confidence = _aggregate_confidence(confidences)

    if deteriorating_count > improving_count:
        predicted_trend = RiskTrend.DETERIORATING
    elif improving_count > deteriorating_count:
        predicted_trend = RiskTrend.IMPROVING
    else:
        predicted_trend = RiskTrend.STABLE

    alerts: List[str] = []
    insights: List[str] = []

    if risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        alerts.append("Prioritise mitigation planning for high-risk exposure.")
    if predicted_trend == RiskTrend.DETERIORATING:
        alerts.append("Trend indicates rising risk — escalate monitoring frequency.")
    if confidence == RiskConfidence.LOW:
        alerts.append("Confidence is low. Collect more evidence to validate the assessment.")

    if recent_events:
        insights.append(
            f"Recent events referenced ({len(recent_events)}) are influencing the risk outlook."
        )
    if macro_indicators:
        elevated = [name for name, value in macro_indicators.items() if value is not None and value > 0]
        if elevated:
            insights.append(
                "Positive indicator variance detected in: " + ", ".join(sorted(elevated))
            )

    if not insights:
        insights.append("Risk posture evaluated using provided category scores and weights.")

    return {
        "overall_score": overall_score,
        "risk_level": risk_level,
        "predicted_trend": predicted_trend,
        "confidence": confidence,
        "insights": insights,
        "alerts": alerts,
    }


def forecast_trend(
    *,
    historical_scores: Sequence[float],
    recent_events: Sequence[str] | None = None,
) -> Dict[str, object]:
    if historical_scores:
        latest = historical_scores[-1]
        baseline = mean(historical_scores)
        direction = latest - baseline
    else:
        latest = 50.0
        baseline = 50.0
        direction = 0.0

    projected_score = max(0.0, min(100.0, latest + direction * 0.4))
    projected_level = _score_to_level(projected_score)
    if direction > 2:
        predicted_trend = RiskTrend.DETERIORATING
    elif direction < -2:
        predicted_trend = RiskTrend.IMPROVING
    else:
        predicted_trend = RiskTrend.STABLE

    alerts: List[str] = []
    if projected_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
        alerts.append("Projected risk remains elevated; ensure executive visibility.")
    if recent_events:
        alerts.append("Incorporate qualitative review of recent events to validate projection.")

    narrative = (
        f"Projected score of {projected_score:.1f} suggests {projected_level.value} exposure with a"
        f" {predicted_trend.value} trend compared to historical average of {baseline:.1f}."
    )

    return {
        "projected_score": projected_score,
        "projected_level": projected_level,
        "predicted_trend": predicted_trend,
        "narrative": narrative,
        "alerts": alerts,
    }


def suggest_weights(
    *,
    assessment_type: RiskAssessmentType,
    categories: Sequence[str],
    industry: str | None = None,
) -> Dict[str, object]:
    base_weights: Dict[str, int] = {}
    remaining = 100
    category_list = [category.lower() for category in categories]

    priority_map = {
        RiskAssessmentType.COMPLIANCE: {
            "regulatory": 25,
            "corruption": 20,
            "political": 15,
        },
        RiskAssessmentType.OPERATIONAL: {
            "infrastructure": 20,
            "security": 20,
            "economic": 15,
        },
        RiskAssessmentType.ECONOMIC: {
            "economic": 30,
            "currency": 20,
            "trade": 20,
        },
        RiskAssessmentType.POLITICAL: {
            "political": 30,
            "security": 20,
            "regulatory": 15,
        },
    }

    priority = priority_map.get(assessment_type, {})

    for category in category_list:
        if category in priority and remaining > 0:
            weight = min(priority[category], remaining)
            base_weights[category] = weight
            remaining -= weight

    distributed = remaining // max(len(category_list) or 1, 1)
    for category in category_list:
        base_weights.setdefault(category, 0)
        base_weights[category] += distributed
    remainder = remaining - distributed * len(category_list)
    index = 0
    while remainder > 0 and category_list:
        key = category_list[index % len(category_list)]
        base_weights[key] += 1
        remainder -= 1
        index += 1

    guidance: List[str] = []
    if industry:
        guidance.append(f"Weights tuned for {industry} industry context.")
    guidance.append(
        f"{assessment_type.value.title()} assessment prioritises categories with higher systemic exposure."
    )

    weights = [
        {
            "category_key": category,
            "display_name": category.replace("_", " ").title(),
            "weight": base_weights.get(category, 0),
            "order_index": idx,
        }
        for idx, category in enumerate(category_list)
    ]

    return {"weights": weights, "guidance": guidance}
