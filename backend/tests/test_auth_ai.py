import asyncio

from app.routes import auth_ai
from app.routes.auth_ai import LoginEvaluationRequest


def test_evaluate_login_handles_unexpected_datetime_failure(monkeypatch):
    """If datetime.utcnow raises, the endpoint should still respond gracefully."""

    class BrokenDateTime:
        @staticmethod
        def utcnow():  # pragma: no cover - executed via the test
            raise RuntimeError("boom")

    monkeypatch.setattr(auth_ai, "datetime", BrokenDateTime)

    response = asyncio.run(
        auth_ai.evaluate_login(LoginEvaluationRequest(identifier="user@example.com"))
    )

    assert response.risk_level == "low"
    assert response.require_mfa is False
    assert "standard sign-in" in response.recommended_action.lower()


def test_evaluate_login_recovers_from_invalid_login_hour(monkeypatch):
    """Non-integer login hours should not cause server errors."""

    payload = LoginEvaluationRequest(identifier="tester", login_hour=12)

    # Simulate an invalid value arriving at runtime (e.g. cast from client or future change)
    payload.login_hour = "not-a-number"  # type: ignore[assignment]

    response = asyncio.run(auth_ai.evaluate_login(payload))

    assert response.risk_level in {"low", "medium", "high"}
    assert isinstance(response.personalised_message, str) and response.personalised_message
