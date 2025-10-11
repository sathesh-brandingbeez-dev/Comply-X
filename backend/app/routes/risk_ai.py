from __future__ import annotations

from fastapi import APIRouter, Depends

from app.ai.risk_ai import forecast_trend, score_country, suggest_weights
from auth import require_roles
from schemas import (
    RiskAIScoreCountryRequest,
    RiskAIScoreCountryResponse,
    RiskAITrendForecastRequest,
    RiskAITrendForecastResponse,
    RiskAIWeightSuggestionRequest,
    RiskAIWeightSuggestionResponse,
)

router = APIRouter(prefix="/risk-assessments/ai", tags=["Risk Assessment AI"])

READ_ROLES = ("Reader", "Editor", "Reviewer", "Admin", "Super Admin")
MANAGE_ROLES = ("Editor", "Reviewer", "Admin", "Super Admin")


@router.post("/score-country", response_model=RiskAIScoreCountryResponse)
def ai_score_country(
    payload: RiskAIScoreCountryRequest,
    _: object = Depends(require_roles(*READ_ROLES)),
) -> RiskAIScoreCountryResponse:
    result = score_country(
        categories=[category.model_dump() for category in payload.categories],
        recent_events=payload.recent_events,
        macro_indicators=payload.macro_indicators,
    )
    return RiskAIScoreCountryResponse(**result)


@router.post("/forecast-trend", response_model=RiskAITrendForecastResponse)
def ai_forecast_trend(
    payload: RiskAITrendForecastRequest,
    _: object = Depends(require_roles(*READ_ROLES)),
) -> RiskAITrendForecastResponse:
    result = forecast_trend(
        historical_scores=payload.historical_scores,
        recent_events=payload.recent_events,
    )
    return RiskAITrendForecastResponse(**result)


@router.post("/suggest-weights", response_model=RiskAIWeightSuggestionResponse)
def ai_suggest_weights(
    payload: RiskAIWeightSuggestionRequest,
    _: object = Depends(require_roles(*MANAGE_ROLES)),
) -> RiskAIWeightSuggestionResponse:
    result = suggest_weights(
        assessment_type=payload.assessment_type,
        categories=payload.categories,
        industry=payload.industry,
    )
    return RiskAIWeightSuggestionResponse(**result)
