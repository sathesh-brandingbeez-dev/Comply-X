"""AI-assisted helpers for adaptive authentication flows."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth/ai", tags=["auth-ai"])


class LoginEvaluationRequest(BaseModel):
    identifier: str = Field(..., description="Username or email attempting to sign in")
    timezone: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None, description="Approximate location or IP derived region")
    device_label: Optional[str] = Field(default=None, description="User supplied device fingerprint")
    login_hour: Optional[int] = Field(default=None, ge=0, le=23)


class LoginEvaluationResponse(BaseModel):
    risk_level: str
    require_mfa: bool
    recommended_action: str
    personalised_message: str


@router.post("/evaluate-login", response_model=LoginEvaluationResponse, summary="Assess login risk")
async def evaluate_login(payload: LoginEvaluationRequest) -> LoginEvaluationResponse:
    hour = payload.login_hour
    if hour is None:
        hour = datetime.utcnow().hour

    risk_score = 0
    reasons = []

    # Late-night or unusual hours often require step-up authentication.
    if hour < 6 or hour > 22:
        risk_score += 2
        reasons.append("unusual login hour")

    # Unknown device indicator.
    if not payload.device_label:
        risk_score += 1
        reasons.append("new device")

    # Missing timezone/location data raises mild suspicion but not blocking.
    if not payload.timezone:
        risk_score += 1
        reasons.append("timezone unknown")

    if payload.location and any(keyword in payload.location.lower() for keyword in ("vpn", "proxy")):
        risk_score += 2
        reasons.append("network anonymiser detected")

    if risk_score >= 4:
        risk_level = "high"
        require_mfa = True
        action = "Initiate multi-factor authentication and send security alert."
    elif risk_score >= 2:
        risk_level = "medium"
        require_mfa = True
        action = "Prompt for MFA verification before completing sign-in."
    else:
        risk_level = "low"
        require_mfa = False
        action = "Proceed with standard sign-in workflow."

    if reasons:
        personalised_message = (
            "We've spotted "
            + ", ".join(reasons)
            + ". We'll apply adaptive protections to keep the account safe."
        )
    else:
        personalised_message = (
            "Welcome back! We'll fast-track your access based on your trusted login pattern."
        )

    return LoginEvaluationResponse(
        risk_level=risk_level,
        require_mfa=require_mfa,
        recommended_action=action,
        personalised_message=personalised_message,
    )
