"""Routes for AI-assisted registration guidance."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

from app.ai.registration_ai import build_recommendations, get_personalised_examples

router = APIRouter(prefix="/registration/ai", tags=["registration-ai"])


class RegistrationInsightsRequest(BaseModel):
    industry: Optional[str] = Field(default=None, description="Selected industry")
    country: Optional[str] = Field(default=None, description="Company headquarters country code")
    company_size: Optional[str] = Field(default=None, description="Declared company size segment")


class RegistrationInsightsResponse(BaseModel):
    recommended_modules: List[str]
    suggested_departments: List[str]
    framework_recommendations: List[str]
    estimated_setup_days: int
    suggested_review_cycles: int
    personalised_examples: List[str]


class PersonalisationResponse(BaseModel):
    headline: str
    subheadline: str
    personalised_examples: List[str]


@router.post("/insights", response_model=RegistrationInsightsResponse, summary="Generate registration AI insights")
async def generate_registration_insights(payload: RegistrationInsightsRequest) -> Dict[str, object]:
    """Return AI-style recommendations tailored to the visitor's selections."""

    insights = build_recommendations(payload.industry, payload.country, payload.company_size)
    return insights


@router.get("/personalise", response_model=PersonalisationResponse, summary="Personalise landing page messaging")
async def personalise_landing_page(
    industry: Optional[str] = Query(default=None),
    country: Optional[str] = Query(default=None),
) -> PersonalisationResponse:
    examples = get_personalised_examples(industry, country)
    if not examples:
        raise HTTPException(status_code=404, detail="Unable to generate personalised content")

    headline = "Smart Compliance Management Platform"
    subheadline = "Streamline your compliance processes with AI-powered automation"
    return PersonalisationResponse(
        headline=headline,
        subheadline=subheadline,
        personalised_examples=examples,
    )
