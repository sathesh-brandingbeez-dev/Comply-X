from __future__ import annotations

from dataclasses import dataclass
from typing import List

from models import (
    CorrectiveActionEffectivenessRating,
    CorrectiveActionImpact,
    CorrectiveActionPriority,
    CorrectiveActionType,
    CorrectiveActionUrgency,
)
from schemas import (
    CorrectiveActionAIInsights,
    CorrectiveActionAIRequest,
    CorrectiveActionAIResponse,
    CorrectiveActionMetricInput,
    CorrectiveActionStepInput,
)


@dataclass(frozen=True)
class _ScaleWeights:
    priority: int
    impact: int
    urgency: int


_PRIORITY_WEIGHTS = {
    CorrectiveActionPriority.LOW: 1,
    CorrectiveActionPriority.MEDIUM: 2,
    CorrectiveActionPriority.HIGH: 3,
    CorrectiveActionPriority.CRITICAL: 4,
}

_IMPACT_WEIGHTS = {
    CorrectiveActionImpact.LOW: 1,
    CorrectiveActionImpact.MEDIUM: 2,
    CorrectiveActionImpact.HIGH: 3,
    CorrectiveActionImpact.CRITICAL: 4,
}

_URGENCY_WEIGHTS = {
    CorrectiveActionUrgency.LOW: 1,
    CorrectiveActionUrgency.MEDIUM: 2,
    CorrectiveActionUrgency.HIGH: 3,
    CorrectiveActionUrgency.CRITICAL: 4,
}


def _score_from_weights(priority: CorrectiveActionPriority, impact: CorrectiveActionImpact, urgency: CorrectiveActionUrgency) -> _ScaleWeights:
    return _ScaleWeights(
        priority=_PRIORITY_WEIGHTS.get(priority, 1),
        impact=_IMPACT_WEIGHTS.get(impact, 1),
        urgency=_URGENCY_WEIGHTS.get(urgency, 1),
    )


def _estimate_success_probability(weights: _ScaleWeights, controls_strength: float, step_count: int) -> float:
    risk_index = (weights.priority + weights.impact + weights.urgency) / 12.0
    base_success = 0.78 - risk_index * 0.28
    base_success += controls_strength * 0.12
    if step_count <= 2:
        base_success -= 0.05
    elif step_count >= 6:
        base_success -= 0.04
    return max(0.25, min(0.95, base_success))


def _measure_controls_strength(text: str | None) -> float:
    if not text:
        return 0.2
    length = len(text.split())
    keywords = {
        "monitor": 0.1,
        "inspection": 0.08,
        "audit": 0.08,
        "automated": 0.1,
        "training": 0.07,
        "policy": 0.05,
        "procedure": 0.05,
        "mitigation": 0.04,
    }
    score = 0.25 if length > 60 else 0.18 if length > 30 else 0.12
    lower = text.lower()
    for word, weight in keywords.items():
        if word in lower:
            score += weight
    return min(score, 0.65)


def _generate_default_steps(action_type: CorrectiveActionType) -> List[CorrectiveActionStepInput]:
    templates: dict[CorrectiveActionType, List[dict]] = {
        CorrectiveActionType.IMMEDIATE: [
            {
                "description": "Contain the issue and prevent further impact.",
                "resources_required": "Front-line response team",
            },
            {
                "description": "Communicate incident status to stakeholders and leadership.",
                "resources_required": "Communications lead",
            },
            {
                "description": "Verify containment effectiveness and capture evidence.",
                "resources_required": "Quality assurance representative",
            },
        ],
        CorrectiveActionType.SHORT_TERM: [
            {
                "description": "Implement interim corrective controls addressing the root cause.",
                "resources_required": "Process engineer, operations team",
            },
            {
                "description": "Validate effectiveness of interim controls through sampling or observation.",
                "resources_required": "Quality engineer",
            },
        ],
        CorrectiveActionType.LONG_TERM: [
            {
                "description": "Design permanent solution addressing systemic drivers.",
                "resources_required": "Cross-functional design team",
            },
            {
                "description": "Pilot the solution in controlled environment.",
                "resources_required": "Pilot site resources",
            },
            {
                "description": "Roll out solution organisation-wide with change management support.",
                "resources_required": "Change manager, training team",
            },
        ],
        CorrectiveActionType.PREVENTIVE: [
            {
                "description": "Perform preventive risk analysis and scenario testing.",
                "resources_required": "Risk analyst",
            },
            {
                "description": "Update preventive controls and monitoring plans.",
                "resources_required": "Control owner",
            },
        ],
        CorrectiveActionType.IMPROVEMENT: [
            {
                "description": "Identify optimisation opportunities informed by lessons learned.",
                "resources_required": "Continuous improvement lead",
            },
            {
                "description": "Implement improvement roadmap with measurable milestones.",
                "resources_required": "Project manager",
            },
        ],
    }

    defaults = templates.get(action_type, templates[CorrectiveActionType.SHORT_TERM])
    return [CorrectiveActionStepInput(**item) for item in defaults]


def _generate_default_metrics(action_type: CorrectiveActionType) -> List[CorrectiveActionMetricInput]:
    metrics: dict[CorrectiveActionType, List[dict]] = {
        CorrectiveActionType.IMMEDIATE: [
            {
                "metric_name": "Containment completion time",
                "target_value": "< 24 hours",
                "measurement_method": "Response log review",
            },
            {
                "metric_name": "Residual impact incidents",
                "target_value": "0",
                "measurement_method": "Incident tracker",
            },
        ],
        CorrectiveActionType.SHORT_TERM: [
            {
                "metric_name": "Interim control effectiveness",
                "target_value": ">= 90% pass rate",
                "measurement_method": "Sampling inspection",
            },
        ],
        CorrectiveActionType.LONG_TERM: [
            {
                "metric_name": "Permanent control adoption",
                "target_value": "100% of target areas",
                "measurement_method": "Implementation audit",
            },
            {
                "metric_name": "Post-implementation defects",
                "target_value": "< 2 per month",
                "measurement_method": "Quality monitoring",
            },
        ],
        CorrectiveActionType.PREVENTIVE: [
            {
                "metric_name": "Risk indicator trend",
                "target_value": "Downward trend over 3 months",
                "measurement_method": "Risk dashboard",
            },
        ],
        CorrectiveActionType.IMPROVEMENT: [
            {
                "metric_name": "Process efficiency gain",
                "target_value": ">= 10% improvement",
                "measurement_method": "Process KPI review",
            },
        ],
    }
    defaults = metrics.get(action_type, metrics[CorrectiveActionType.SHORT_TERM])
    return [CorrectiveActionMetricInput(**item) for item in defaults]


def _timeline_guidance(weights: _ScaleWeights) -> str:
    total = weights.priority + weights.impact + weights.urgency
    if total >= 11:
        return "Escalate for executive visibility. Daily progress reviews recommended."
    if total >= 8:
        return "Maintain twice-weekly progress checkpoints with risk owners."
    if total >= 5:
        return "Weekly updates appropriate with functional managers."
    return "Bi-weekly tracking sufficient; monitor for changes in risk profile."


def generate_action_intelligence(payload: CorrectiveActionAIRequest) -> CorrectiveActionAIResponse:
    weights = _score_from_weights(payload.priority, payload.impact, payload.urgency)
    controls_strength = _measure_controls_strength(payload.current_controls)
    success_probability = _estimate_success_probability(weights, controls_strength, len(payload.existing_steps))
    effectiveness_score = round(success_probability * 100, 1)

    risk_score = round(((weights.priority * 0.4) + (weights.impact * 0.35) + (weights.urgency * 0.25)) / 4 * 100, 1)
    prioritized_level = (
        CorrectiveActionPriority.CRITICAL
        if risk_score >= 80
        else CorrectiveActionPriority.HIGH
        if risk_score >= 60
        else payload.priority
    )

    resource_recommendations: List[str] = []
    if weights.priority >= 3 or weights.impact >= 3:
        resource_recommendations.append("Assign dedicated cross-functional response team with decision authority.")
    if weights.urgency >= 3:
        resource_recommendations.append("Secure expedited access to critical resources and approvals.")
    if controls_strength < 0.3:
        resource_recommendations.append("Augment monitoring and interim controls to stabilise environment.")
    if not resource_recommendations:
        resource_recommendations.append("Maintain current resource allocation with periodic effectiveness reviews.")

    escalation_recommendations: List[str] = []
    if risk_score >= 75:
        escalation_recommendations.append("Notify executive sponsor and schedule standing update cadence.")
    if weights.urgency >= 3:
        escalation_recommendations.append("Define rapid escalation channel for emerging blockers or delays.")
    if weights.impact >= 3 and "customer" in payload.problem_statement.lower():
        escalation_recommendations.append("Engage customer success leadership to manage external communications.")
    if not escalation_recommendations:
        escalation_recommendations.append("Escalate only if milestones slip by more than 3 days.")

    insights = CorrectiveActionAIInsights(
        effectiveness_score=effectiveness_score,
        predicted_rating=(
            CorrectiveActionEffectivenessRating.EFFECTIVE
            if effectiveness_score >= 75
            else CorrectiveActionEffectivenessRating.PARTIALLY_EFFECTIVE
            if effectiveness_score >= 55
            else CorrectiveActionEffectivenessRating.NOT_EFFECTIVE
        ),
        risk_score=risk_score,
        prioritized_level=prioritized_level,
        success_probability=round(success_probability, 2),
        resource_recommendations=resource_recommendations,
        escalation_recommendations=escalation_recommendations,
        timeline_advice=_timeline_guidance(weights),
    )

    recommended_steps: List[CorrectiveActionStepInput] = []
    if not payload.existing_steps:
        recommended_steps = _generate_default_steps(payload.action_type)
    else:
        # Suggest an additional verification step when timeline is aggressive
        if weights.urgency >= 3:
            recommended_steps.append(
                CorrectiveActionStepInput(
                    description="Schedule interim effectiveness review to validate accelerated milestones.",
                    resources_required="Action owner, quality assurance",
                )
            )
        if controls_strength < 0.3:
            recommended_steps.append(
                CorrectiveActionStepInput(
                    description="Introduce temporary monitoring control until permanent measures stabilise.",
                    resources_required="Risk owner",
                )
            )

    recommended_metrics = _generate_default_metrics(payload.action_type)

    return CorrectiveActionAIResponse(
        insights=insights,
        recommended_steps=recommended_steps,
        recommended_metrics=recommended_metrics,
    )


__all__ = ["generate_action_intelligence"]
