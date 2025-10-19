# Comply-X

## Email service configuration

Transactional emails (password reset, MFA verification codes, etc.) use SMTP
credentials provided through environment variables. Copy `.env.example` to
`.env`, fill in your SMTP values, and export them before starting the backend.

More detailed instructions are available in
[`backend/SETUP_EMAIL_SERVICE.md`](backend/SETUP_EMAIL_SERVICE.md).
