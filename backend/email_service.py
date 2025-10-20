import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "Comply-X")

        required_settings = {
            "SMTP_SERVER": self.smtp_server,
            "SMTP_USERNAME": self.smtp_username,
            "SMTP_PASSWORD": self.smtp_password,
            "FROM_EMAIL": self.from_email,
        }

        self.is_configured = all(required_settings.values())

        if not self.is_configured:
            missing = [key for key, value in required_settings.items() if not value]
            logger.warning(
                "Email service is not fully configured. Missing settings: %s",
                ", ".join(missing),
            )
        
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email with HTML content"""
        if not self.is_configured:
            logger.error("Cannot send email because SMTP settings are not fully configured.")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text part if provided
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML part
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Connect to server and send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        user_name: str,
        reset_url: str
    ) -> bool:
        """Send password reset email"""
        subject = "Reset Your Comply-X Password"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ 
                    display: inline-block; 
                    background-color: #3b82f6; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold;
                    margin: 20px 0;
                }}
                .warning {{ background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    
                    <p>We received a request to reset your password for your Comply-X account. If you made this request, click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}?token={reset_token}" class="button">Reset My Password</a>
                    </div>
                    
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                        {reset_url}?token={reset_token}
                    </p>
                    
                    <div class="warning">
                        <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
                    </div>
                    
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    
                    <p>For security reasons, please don't share this email with anyone.</p>
                    
                    <p>Best regards,<br>The Comply-X Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; 2024 Comply-X. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hi {user_name},
        
        We received a request to reset your password for your Comply-X account.
        
        To reset your password, please visit this link:
        {reset_url}?token={reset_token}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, please ignore this email.
        
        Best regards,
        The Comply-X Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)
    
    async def send_mfa_setup_email(
        self,
        to_email: str,
        user_name: str
    ) -> bool:
        """Send MFA setup confirmation email"""
        subject = "Multi-Factor Authentication Enabled"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MFA Enabled</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .success {{ background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔒 MFA Enabled Successfully</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    
                    <div class="success">
                        <strong>Great news!</strong> Multi-Factor Authentication has been successfully enabled on your Comply-X account.
                    </div>
                    
                    <p>Your account is now more secure with an additional layer of protection. From now on, you'll need to:</p>
                    
                    <ul>
                        <li>Enter your username and password</li>
                        <li>Provide a verification code from your authenticator app</li>
                    </ul>
                    
                    <p><strong>Important reminders:</strong></p>
                    <ul>
                        <li>Keep your authenticator app safe and backed up</li>
                        <li>Don't share your verification codes with anyone</li>
                        <li>Contact support if you lose access to your authenticator</li>
                    </ul>
                    
                    <p>If you didn't enable MFA on your account, please contact support immediately.</p>
                    
                    <p>Best regards,<br>The Comply-X Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>&copy; 2024 Comply-X. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self.send_email(to_email, subject, html_content)

    async def send_registration_verification_email(
        self,
        to_email: str,
        verification_code: str,
        user_name: Optional[str] = None
    ) -> bool:
        """Send the initial email verification code during registration."""

        recipient_name = user_name or "there"
        subject = "Verify your Comply-X account"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"utf-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Email Verification</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 24px; }}
                .card {{ background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); overflow: hidden; }}
                .header {{ background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; padding: 24px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 0.5px; }}
                .content {{ padding: 32px 28px; }}
                .code-box {{
                    font-size: 36px;
                    letter-spacing: 8px;
                    font-weight: 700;
                    color: #065f46;
                    text-align: center;
                    background-color: #dcfce7;
                    border-radius: 10px;
                    padding: 18px 0;
                    margin: 24px 0;
                    border: 1px solid #bbf7d0;
                }}
                .footer {{ text-align: center; font-size: 14px; color: #6b7280; padding: 16px 24px 24px; }}
            </style>
        </head>
        <body>
            <div class=\"container\">
                <div class=\"card\">
                    <div class=\"header\">
                        <h1>Confirm your email</h1>
                    </div>
                    <div class=\"content\">
                        <p>Hi {recipient_name},</p>
                        <p>Thank you for registering with Comply-X. Enter the verification code below to complete your account setup:</p>
                        <div class=\"code-box\">{verification_code}</div>
                        <p>This code will expire in 30 minutes. If you didn't start this registration, you can safely ignore this email.</p>
                        <p>Welcome aboard!<br>The Comply-X Team</p>
                    </div>
                    <div class=\"footer\">
                        <p>This is an automated message, please do not reply.</p>
                        <p>&copy; {datetime.utcnow().year} Comply-X. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {recipient_name},

        Your Comply-X verification code is: {verification_code}

        This code will expire in 30 minutes. If you did not start this registration, you can ignore this email.

        Welcome aboard,
        The Comply-X Team
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_mfa_verification_email(
        self,
        to_email: str,
        verification_code: str,
        user_name: Optional[str] = None
    ) -> bool:
        """Send MFA verification code email to the user."""

        recipient_name = user_name or "there"
        subject = "Your Comply-X verification code"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"utf-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Verification Code</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 24px; }}
                .card {{ background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.1); overflow: hidden; }}
                .header {{ background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; padding: 24px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 0.5px; }}
                .content {{ padding: 32px 28px; }}
                .code-box {{
                    font-size: 36px;
                    letter-spacing: 8px;
                    font-weight: 700;
                    color: #1f2937;
                    text-align: center;
                    background-color: #eef2ff;
                    border-radius: 10px;
                    padding: 18px 0;
                    margin: 24px 0;
                    border: 1px solid #c7d2fe;
                }}
                .info {{ background-color: #eff6ff; padding: 18px 20px; border-radius: 10px; border-left: 4px solid #2563eb; margin-bottom: 24px; }}
                .info strong {{ color: #1d4ed8; }}
                .footer {{ text-align: center; font-size: 14px; color: #6b7280; padding: 16px 24px 24px; }}
            </style>
        </head>
        <body>
            <div class=\"container\">
                <div class=\"card\">
                    <div class=\"header\">
                        <h1>Account Verification</h1>
                    </div>
                    <div class=\"content\">
                        <p>Hi {recipient_name},</p>
                        <p>Your verification code for Comply-X is:</p>
                        <div class=\"code-box\">{verification_code}</div>
                        <div class=\"info\">
                            <strong>Security tip:</strong> This code will expire in 10 minutes. Do not share it with anyone.
                        </div>
                        <p>If you did not request this verification code, please secure your account immediately or contact our support team.</p>
                        <p>Stay secure,<br>The Comply-X Team</p>
                    </div>
                    <div class=\"footer\">
                        <p>This is an automated message, please do not reply.</p>
                        <p>&copy; {datetime.utcnow().year} Comply-X. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Hi {recipient_name},

        Your Comply-X verification code is: {verification_code}

        This code will expire in 10 minutes. If you did not request this code, please secure your account.

        Stay secure,
        The Comply-X Team
        """

        return await self.send_email(to_email, subject, html_content, text_content)

# Global email service instance
email_service = EmailService()
