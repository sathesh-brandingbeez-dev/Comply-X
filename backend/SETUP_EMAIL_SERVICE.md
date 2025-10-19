# Email Service Configuration

The Comply-X backend sends transactional emails (password reset, MFA verification codes, etc.) through the `EmailService` class in `backend/email_service.py`. By default the service expects SMTP credentials to be supplied through environment variables. Without them the email service is disabled and email delivery attempts will fail with a clear log message.

## Required environment variables

| Variable        | Description                                                     |
|-----------------|-----------------------------------------------------------------|
| `SMTP_SERVER`   | Hostname or IP of your SMTP relay                               |
| `SMTP_PORT`     | (Optional) Port of the SMTP relay. Defaults to `587` for STARTTLS |
| `SMTP_USERNAME` | Username/account used to authenticate with the SMTP relay       |
| `SMTP_PASSWORD` | Password or app-specific password for the SMTP account          |
| `FROM_EMAIL`    | Email address that should appear in the `From` header           |
| `FROM_NAME`     | (Optional) Friendly display name for the sender                 |

Copy `.env.example` to `.env` and populate each value with the credentials from your email provider:

```bash
cp .env.example .env
```

Then export the variables before starting the backend. For local development with `uvicorn` you can run:

```bash
export $(grep -v '^#' .env | xargs)
uvicorn backend.main:app --reload
```

In production deployments configure the runtime environment (e.g. Render, Docker, Kubernetes) to expose the same variables.

## Choosing the sender address

The `FROM_EMAIL` value controls which email address the recipients will see as the sender. This must be a mailbox that is authorised by your SMTP provider. Many providers require domain verification or SPF/DKIM records before they will deliver messages on behalf of a custom domain.

If you do not have a custom domain, you can use the SMTP provider's native email address (for example, a Gmail account with an app password). Keep in mind that consumer inbox providers often rate-limit or block transactional traffic, so a dedicated provider such as SendGrid, Mailgun, Postmark, or AWS SES is recommended for production usage.

## Verifying delivery

After the variables are set, trigger any email flow (such as requesting a password reset or enabling MFA). Check the backend logs for a confirmation similar to:

```
Email sent successfully to user@example.com
```

If delivery fails you'll see a descriptive error message, such as missing credentials or an SMTP authentication error. Use that information to adjust the configuration.
