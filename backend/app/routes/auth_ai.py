"""AI-assisted helpers for adaptive authentication flows."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import User

logger = logging.getLogger(__name__)

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
async def evaluate_login(
    payload: LoginEvaluationRequest,
    db: Session = Depends(get_db),
) -> LoginEvaluationResponse:
    """Return an adaptive authentication recommendation for a login attempt."""

    try:
        hour = payload.login_hour
        if hour is not None:
            try:
                hour = int(hour)
            except (TypeError, ValueError):
                logger.warning(
                    "Received non-integer login_hour %r for identifier %s; falling back to current UTC hour.",
                    payload.login_hour,
                    payload.identifier,
                )
                hour = None

        if hour is None:
            hour = datetime.utcnow().hour
        else:
            if hour < 0 or hour > 23:
                logger.warning(
                    "Received out-of-range login_hour %s for identifier %s; clamping to valid range.",
                    hour,
                    payload.identifier,
                )
                hour = max(0, min(23, hour))

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

        identifier = (payload.identifier or "").strip()
        user: Optional[User] = None
        if identifier:
            if "@" in identifier:
                user = db.query(User).filter(User.email == identifier).first()
            if not user:
                user = db.query(User).filter(User.username == identifier).first()

        if user and user.mfa_enabled:
            require_mfa = True
            if risk_level == "low":
                risk_level = "medium"
            action = "Enter the verification code sent to your email to finish signing in."
            personalised_message = (
                "Multi-factor authentication is enabled for this account. "
                "We've sent a verification code to your email."
            )
        else:
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

    except Exception:  # pragma: no cover - defensive fallback for unexpected runtime errors
        logger.exception(
            "Adaptive login risk evaluation failed for identifier %s. Falling back to safe defaults.",
            payload.identifier,
        )
        return LoginEvaluationResponse(
            risk_level="low",
            require_mfa=False,
            recommended_action="Proceed with standard sign-in workflow.",
            personalised_message=(
                "We're temporarily unable to personalise this login check, so we'll continue with the standard sign-in experience."
            ),
        )
