import base64
import io
import json
import logging
import re
import secrets
from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Dict, Optional
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import pyotp
import qrcode
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, PasswordResetToken, MFAMethod
from schemas import (
    UserCreate, UserLogin, Token, UserResponse, TokenData,
    PasswordResetRequest, PasswordResetConfirm, MFASetupRequest, 
    MFASetupResponse, MFAVerifyRequest, MFALoginRequest, MFAStatusResponse
)
from email_service import email_service
import os

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/google/callback")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")
MICROSOFT_REDIRECT_URI = os.getenv("MICROSOFT_OAUTH_REDIRECT_URI", "http://localhost:8000/api/auth/oauth/microsoft/callback")
DEFAULT_OAUTH_REDIRECT = os.getenv("OAUTH_DEFAULT_REDIRECT", os.getenv("FRONTEND_URL", "http://localhost:3000/login"))
ADDITIONAL_OAUTH_REDIRECTS = [
    url.strip()
    for url in os.getenv("OAUTH_ALLOWED_REDIRECTS", "").split(",")
    if url.strip()
]

_REDIRECT_CANDIDATES = {
    candidate for candidate in [DEFAULT_OAUTH_REDIRECT, *ADDITIONAL_OAUTH_REDIRECTS] if candidate
}


def _extract_origin(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        parsed = urlparse(url)
    except Exception:
        return None
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return None


ALLOWED_OAUTH_ORIGINS = {
    origin for origin in (_extract_origin(url) for url in _REDIRECT_CANDIDATES) if origin
}
DEFAULT_OAUTH_ORIGIN = _extract_origin(DEFAULT_OAUTH_REDIRECT)
OAUTH_STATE_TTL_SECONDS = 600

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

router = APIRouter()

logger = logging.getLogger(__name__)

_oauth_state_store: Dict[str, Dict[str, Any]] = {}
_oauth_state_lock = Lock()


def _cleanup_expired_oauth_states_locked(reference_time: Optional[datetime] = None) -> None:
    """Remove expired OAuth states from the in-memory store."""
    now = reference_time or datetime.utcnow()
    expired_states = [
        state
        for state, payload in _oauth_state_store.items()
        if not isinstance(payload, dict)
        or not isinstance(payload.get("created_at"), datetime)
        or now - payload["created_at"] > timedelta(seconds=OAUTH_STATE_TTL_SECONDS)
    ]
    for state in expired_states:
        _oauth_state_store.pop(state, None)


def _create_oauth_state(provider: str, redirect_uri: str) -> str:
    state = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    with _oauth_state_lock:
        _cleanup_expired_oauth_states_locked(now)
        _oauth_state_store[state] = {
            "provider": provider,
            "redirect_uri": redirect_uri,
            "created_at": now,
        }
    return state


def _pop_oauth_state(state: Optional[str]) -> Optional[Dict[str, Any]]:
    if not state:
        return None
    with _oauth_state_lock:
        return _oauth_state_store.pop(state, None)


def _resolve_redirect_uri(target: Optional[str]) -> str:
    if target:
        origin = _extract_origin(target)
        if origin and origin in ALLOWED_OAUTH_ORIGINS:
            return target
        if target.startswith('/') and DEFAULT_OAUTH_ORIGIN:
            return f"{DEFAULT_OAUTH_ORIGIN}{target}"
    return DEFAULT_OAUTH_REDIRECT


def _append_query_params(url: str, params: Dict[str, str]) -> str:
    parsed = urlparse(url)
    existing_params = dict(parse_qsl(parsed.query))
    existing_params.update({key: value for key, value in params.items() if value is not None})
    new_query = urlencode(existing_params)
    return urlunparse(parsed._replace(query=new_query))


def _normalize_role_name(role: str) -> str:
    """Normalize role labels to a consistent snake_case key."""
    return role.strip().lower().replace("-", "_").replace(" ", "_")


_ROLE_ALIAS_MAP: dict[str, set[UserRole]] = {}

for _role in UserRole:
    for _alias in {
        _role.value,
        _role.name,
        _role.name.lower(),
        _role.value.replace("_", " "),
        _role.name.replace("_", " "),
    }:
        _ROLE_ALIAS_MAP.setdefault(_normalize_role_name(_alias), set()).add(_role)

for _alias, _roles in {
    "reader": {
        UserRole.VIEWER,
        UserRole.EMPLOYEE,
        UserRole.AUDITOR,
        UserRole.MANAGER,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    },
    "editor": {
        UserRole.MANAGER,
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    },
    "reviewer": {
        UserRole.AUDITOR,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    },
    "admin": {
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
    },
    "super admin": {
        UserRole.SUPER_ADMIN,
    },
}.items():
    _ROLE_ALIAS_MAP.setdefault(_normalize_role_name(_alias), set()).update(_roles)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    # Try to find user by username first
    user = get_user_by_username(db, username)

    # If not found by username and it looks like an email, try email lookup
    if not user and "@" in username:
        user = get_user_by_email(db, username)
    
    # If user found and password is correct
    if user and verify_password(password, user.hashed_password):
        # Check if account is active
        if not user.is_active:
            return None
        return user

    return None


def _generate_unique_username(email: str, db: Session) -> str:
    local_part = email.split('@')[0]
    sanitized = re.sub(r'[^a-zA-Z0-9_.-]', '', local_part) or 'user'
    base = sanitized[:50]
    candidate = base
    suffix = 1
    while get_user_by_username(db, candidate):
        candidate = f"{base}{suffix}"
        suffix += 1
    return candidate[:100]


def _derive_names(profile: Dict[str, Any], email: str) -> tuple[str, str]:
    first_name = profile.get('given_name') or profile.get('first_name')
    last_name = profile.get('family_name') or profile.get('last_name')
    display_name = profile.get('name') or profile.get('displayName')

    if display_name:
        parts = [part for part in display_name.strip().split() if part]
        if parts and not first_name:
            first_name = parts[0]
        if parts and not last_name and len(parts) > 1:
            last_name = ' '.join(parts[1:])

    if not first_name:
        fallback = re.sub(r'[^a-zA-Z]+', ' ', email.split('@')[0]).strip()
        first_name = fallback.split(' ')[0] if fallback else 'User'

    if not last_name:
        last_name = 'User'

    return first_name[:100], last_name[:100]


def _exchange_code_for_tokens(provider: str, code: str) -> Dict[str, Any]:
    try:
        if provider == 'google':
            if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI]):
                raise ValueError('Google OAuth is not configured.')
            token_url = 'https://oauth2.googleapis.com/token'
            data = {
                'code': code,
                'client_id': GOOGLE_CLIENT_ID,
                'client_secret': GOOGLE_CLIENT_SECRET,
                'redirect_uri': GOOGLE_REDIRECT_URI,
                'grant_type': 'authorization_code',
            }
        else:
            if not all([MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI]):
                raise ValueError('Microsoft OAuth is not configured.')
            token_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
            data = {
                'code': code,
                'client_id': MICROSOFT_CLIENT_ID,
                'client_secret': MICROSOFT_CLIENT_SECRET,
                'redirect_uri': MICROSOFT_REDIRECT_URI,
                'grant_type': 'authorization_code',
                'scope': 'openid profile email offline_access User.Read',
            }

        response = requests.post(token_url, data=data, timeout=10)
        response.raise_for_status()
        payload = response.json()
    except requests.exceptions.RequestException as exc:
        raise ValueError('Unable to reach the identity provider.') from exc

    if 'error' in payload:
        description = payload.get('error_description') or payload.get('error')
        raise ValueError(description or 'Failed to exchange authorization code.')

    return payload


def _fetch_user_profile(provider: str, tokens: Dict[str, Any]) -> Dict[str, Any]:
    access_token = tokens.get('access_token')
    if not access_token:
        raise ValueError('Missing access token from provider response.')

    headers = {'Authorization': f'Bearer {access_token}'}
    if provider == 'google':
        userinfo_url = 'https://openidconnect.googleapis.com/v1/userinfo'
    else:
        userinfo_url = 'https://graph.microsoft.com/v1.0/me'

    try:
        response = requests.get(userinfo_url, headers=headers, timeout=10)
        response.raise_for_status()
        profile = response.json()
    except requests.exceptions.RequestException as exc:
        raise ValueError('Unable to retrieve profile information from provider.') from exc

    if provider == 'google':
        if not profile.get('email'):
            raise ValueError('Google did not return an email address for this account.')
    else:
        email = profile.get('mail') or profile.get('userPrincipalName')
        if not email:
            raise ValueError('Microsoft did not return an email address for this account.')
        profile['email'] = email
        if profile.get('displayName') and not profile.get('name'):
            profile['name'] = profile['displayName']

    if provider == 'google' and not profile.get('name'):
        combined = ' '.join(filter(None, [profile.get('given_name'), profile.get('family_name')])).strip()
        if combined:
            profile['name'] = combined

    return profile


def _get_or_create_user_from_profile(provider: str, profile: Dict[str, Any], db: Session) -> User:
    email = profile.get('email')
    if not email:
        raise ValueError('Email address is required to sign in.')

    user = get_user_by_email(db, email)
    avatar_url = profile.get('picture') if provider == 'google' else None
    first_name, last_name = _derive_names(profile, email)

    if user:
        updated = False
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            updated = True
        if not user.is_verified:
            user.is_verified = True
            updated = True
        if not user.is_active:
            user.is_active = True
            updated = True
        if not user.first_name and first_name:
            user.first_name = first_name
            updated = True
        if not user.last_name and last_name:
            user.last_name = last_name
            updated = True

        if updated:
            db.commit()
            db.refresh(user)

        return user

    username = _generate_unique_username(email, db)
    random_password = secrets.token_urlsafe(32)
    hashed_password = get_password_hash(random_password)

    new_user = User(
        email=email,
        username=username,
        first_name=first_name,
        last_name=last_name,
        hashed_password=hashed_password,
        role=UserRole.EMPLOYEE,
        is_active=True,
        is_verified=True,
        avatar_url=avatar_url,
        areas_of_responsibility=json.dumps([]),
        timezone='UTC',
        notifications_email=True,
        notifications_sms=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_username(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

def require_role(required_roles: list[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


def require_roles(*roles: str):
    """Accepts human friendly role labels and resolves them to system roles."""
    resolved_roles: set[UserRole] = set()

    for role_name in roles:
        if not role_name:
            continue
        normalized = _normalize_role_name(role_name)
        resolved_roles.update(_ROLE_ALIAS_MAP.get(normalized, set()))

    if not resolved_roles:
        resolved_roles = set(UserRole)

    sorted_roles = sorted(resolved_roles, key=lambda role: role.value)
    return require_role(sorted_roles)

def generate_reset_token() -> str:
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)

def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate backup codes for MFA"""
    return [secrets.token_hex(4).upper() for _ in range(count)]

def verify_totp(secret: str, token: str) -> bool:
    """Verify TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)

def generate_qr_code(secret: str, user_email: str) -> str:
    """Generate QR code for TOTP setup"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_email,
        issuer_name="Comply-X"
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    # Convert to base64 image
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    # Convert to base64
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

@router.get("/oauth/{provider}/authorize")
async def oauth_authorize(provider: str, redirect_uri: Optional[str] = None):
    provider_normalized = provider.lower()
    if provider_normalized not in {"google", "microsoft"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider")

    resolved_redirect = _resolve_redirect_uri(redirect_uri)

    if provider_normalized == "google":
        if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI]):
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth is not configured")
        state = _create_oauth_state(provider_normalized, resolved_redirect)
        params = {
            "client_id": GOOGLE_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
            "include_granted_scopes": "true",
        }
        authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    else:
        if not all([MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI]):
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Microsoft OAuth is not configured")
        state = _create_oauth_state(provider_normalized, resolved_redirect)
        params = {
            "client_id": MICROSOFT_CLIENT_ID,
            "response_type": "code",
            "redirect_uri": MICROSOFT_REDIRECT_URI,
            "response_mode": "query",
            "scope": "openid profile email offline_access User.Read",
            "state": state,
            "prompt": "select_account",
        }
        authorization_url = f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?{urlencode(params)}"

    return {"authorization_url": authorization_url}


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    db: Session = Depends(get_db),
):
    provider_normalized = provider.lower()
    if provider_normalized not in {"google", "microsoft"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported provider")

    state_payload = _pop_oauth_state(state)
    frontend_redirect = _resolve_redirect_uri(state_payload.get("redirect_uri") if state_payload else None)

    if not state_payload:
        message = "The sign-in session has expired. Please start again."
        return RedirectResponse(url=_append_query_params(frontend_redirect, {"oauth_error": message}))

    if state_payload.get("provider") != provider_normalized:
        message = "The sign-in request is invalid. Please try again."
        return RedirectResponse(url=_append_query_params(frontend_redirect, {"oauth_error": message}))

    if error or error_description:
        message = error_description or error or "Authentication was cancelled."
        return RedirectResponse(url=_append_query_params(frontend_redirect, {"oauth_error": message}))

    if not code:
        return RedirectResponse(url=_append_query_params(frontend_redirect, {"oauth_error": "Missing authorization code."}))

    try:
        token_payload = _exchange_code_for_tokens(provider_normalized, code)
        profile = _fetch_user_profile(provider_normalized, token_payload)
        user = _get_or_create_user_from_profile(provider_normalized, profile, db)
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)

        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        redirect_url = _append_query_params(frontend_redirect, {"oauth_token": access_token})
        return RedirectResponse(url=redirect_url)
    except ValueError as exc:
        db.rollback()
        logger.warning("OAuth callback failed for provider %s: %s", provider_normalized, exc)
        return RedirectResponse(url=_append_query_params(frontend_redirect, {"oauth_error": str(exc)}))
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.exception("Unexpected error during OAuth callback for provider %s", provider_normalized)
        return RedirectResponse(
            url=_append_query_params(
                frontend_redirect,
                {"oauth_error": "Unexpected authentication error. Please try again."},
            )
        )


@router.post("/register",
             response_model=UserResponse,
             summary="Register New User",
             description="Create a new user account with the provided information. Email and username must be unique.",
             responses={
                 200: {"description": "User created successfully"},
                 400: {"description": "Email already registered or username already taken"},
             })
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password,
        role=user_data.role,
        phone=user_data.phone,
        position=user_data.position,
        employee_id=getattr(user_data, 'employee_id', None),
        areas_of_responsibility=json.dumps(getattr(user_data, 'areas_of_responsibility', [])),
        timezone=getattr(user_data, 'timezone', 'UTC'),
        notifications_email=getattr(user_data, 'notifications_email', True),
        notifications_sms=getattr(user_data, 'notifications_sms', False)
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return UserResponse.model_validate(db_user)

@router.post("/login", 
             response_model=Token,
             summary="User Login",
             description="Authenticate user with username and password. Returns JWT access token and user information.",
             responses={
                 200: {"description": "Login successful"},
                 401: {"description": "Incorrect username/password or account disabled"},
             })
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", 
            response_model=UserResponse,
            summary="Get Current User",
            description="Get information about the currently authenticated user.",
            responses={
                200: {"description": "Current user information"},
                401: {"description": "Not authenticated"},
            })
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.get("/users", 
            response_model=list[UserResponse],
            summary="List All Users",
            description="Get a list of all users in the system. Requires Admin or Manager role.",
            responses={
                200: {"description": "List of users"},
                401: {"description": "Not authenticated"},
                403: {"description": "Insufficient permissions"},
            })
async def get_users(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER])),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return [UserResponse.model_validate(user) for user in users]

@router.post("/password-reset/request",
             summary="Request Password Reset",
             description="Send password reset email to user")
async def request_password_reset(
    request_data: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    # Find user by email
    user = get_user_by_email(db, request_data.email)
    if not user:
        # Don't reveal if email exists - security best practice
        return {"message": "If the email exists in our system, a password reset link has been sent"}
    
    # Check if user is active
    if not user.is_active:
        return {"message": "If the email exists in our system, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    
    # Save token to database
    db_token = PasswordResetToken(
        user_id=user.id,
        token=reset_token,
        expires_at=expires_at,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    db.add(db_token)
    db.commit()
    
    # Send email
    reset_url = os.getenv("FRONTEND_URL", "http://localhost:3000") + "/reset-password"
    await email_service.send_password_reset_email(
        to_email=user.email,
        reset_token=reset_token,
        user_name=f"{user.first_name} {user.last_name}",
        reset_url=reset_url
    )
    
    return {"message": "If the email exists in our system, a password reset link has been sent"}

@router.post("/password-reset/confirm",
             summary="Confirm Password Reset",
             description="Reset password using token from email")
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    request: Request,
    db: Session = Depends(get_db)
):
    # Find valid token
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == reset_data.token,
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()
    
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    user.updated_at = datetime.utcnow()
    
    # Mark token as used
    token_record.is_used = True
    token_record.used_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password has been successfully reset"}

@router.get("/mfa/status",
            response_model=MFAStatusResponse,
            summary="Get MFA Status",
            description="Check if MFA is enabled for current user")
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    methods = db.query(MFAMethod).filter(
        MFAMethod.user_id == current_user.id,
        MFAMethod.is_enabled == True
    ).all()
    
    return MFAStatusResponse(
        enabled=len(methods) > 0,
        methods=[method.method_type for method in methods]
    )

@router.post("/mfa/setup",
             response_model=MFASetupResponse,
             summary="Setup MFA",
             description="Initialize MFA setup with QR code and backup codes")
async def setup_mfa(
    setup_data: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify password
    if not verify_password(setup_data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Check if TOTP already enabled
    existing_totp = db.query(MFAMethod).filter(
        MFAMethod.user_id == current_user.id,
        MFAMethod.method_type == "totp",
        MFAMethod.is_enabled == True
    ).first()
    
    if existing_totp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )
    
    # Generate secret and backup codes
    secret = pyotp.random_base32()
    backup_codes = generate_backup_codes()
    qr_code = generate_qr_code(secret, current_user.email)
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )

@router.post("/mfa/verify",
             summary="Verify and Enable MFA",
             description="Verify MFA setup and enable it")
async def verify_and_enable_mfa(
    verify_data: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify TOTP code
    if not verify_totp(verify_data.secret, verify_data.verification_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Disable any existing TOTP methods
    db.query(MFAMethod).filter(
        MFAMethod.user_id == current_user.id,
        MFAMethod.method_type == "totp"
    ).update({"is_enabled": False})
    
    # Save new TOTP method
    totp_method = MFAMethod(
        user_id=current_user.id,
        method_type="totp",
        is_primary=True,
        is_enabled=True,
        secret_key=verify_data.secret,
        backup_codes=json.dumps(verify_data.backup_codes)
    )
    db.add(totp_method)
    
    # Enable MFA for user
    current_user.mfa_enabled = True
    db.commit()
    
    # Send confirmation email
    await email_service.send_mfa_setup_email(
        to_email=current_user.email,
        user_name=f"{current_user.first_name} {current_user.last_name}"
    )
    
    return {"message": "MFA has been successfully enabled"}

@router.post("/mfa/disable",
             summary="Disable MFA",
             description="Disable MFA for current user")
async def disable_mfa(
    password_data: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify password
    if not verify_password(password_data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Disable all MFA methods
    db.query(MFAMethod).filter(
        MFAMethod.user_id == current_user.id
    ).update({"is_enabled": False})
    
    # Disable MFA for user
    current_user.mfa_enabled = False
    db.commit()
    
    return {"message": "MFA has been successfully disabled"}

@router.post("/mfa/login",
             response_model=Token,
             summary="MFA Login",
             description="Login with MFA verification")
async def mfa_login(
    login_data: MFALoginRequest,
    db: Session = Depends(get_db)
):
    # Authenticate user with username/password
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled"
        )
    
    # Check if MFA is enabled
    if not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account"
        )
    
    # Get TOTP method
    totp_method = db.query(MFAMethod).filter(
        MFAMethod.user_id == user.id,
        MFAMethod.method_type == "totp",
        MFAMethod.is_enabled == True
    ).first()
    
    if not totp_method:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA configuration error"
        )
    
    # Verify MFA code (try TOTP first, then backup codes)
    mfa_valid = False
    
    # Try TOTP
    if verify_totp(totp_method.secret_key, login_data.mfa_code):
        mfa_valid = True
    else:
        # Try backup codes
        if totp_method.backup_codes:
            backup_codes = json.loads(totp_method.backup_codes)
            if login_data.mfa_code.upper() in backup_codes:
                mfa_valid = True
                # Remove used backup code
                backup_codes.remove(login_data.mfa_code.upper())
                totp_method.backup_codes = json.dumps(backup_codes)
                db.commit()
    
    if not mfa_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    totp_method.last_used_at = datetime.utcnow()
    db.commit()
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )