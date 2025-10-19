from __future__ import annotations
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Enum,
    Float,
    Index,
    Date,
    JSON,
    Table,
)
from sqlalchemy.orm import relationship, declarative_base
from database import Base
from datetime import datetime
import enum
from typing import Optional
from enum import Enum as PyEnum, EnumMeta

# Base = declarative_base()

# try:
#     from models import Base  # type: ignore
# except Exception:
#     from database import Base  # type: ignore


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    AUDITOR = "auditor"
    EMPLOYEE = "employee"
    VIEWER = "viewer"

# Enhanced permission levels as requested
LEGACY_PERMISSION_LEVEL_MAP: dict[str, "PermissionLevel"] = {}


class PermissionLevel(str, enum.Enum):
    """Five-tier permission model with legacy compatibility."""

    READER = "reader"
    EDITOR = "editor"
    REVIEWER = "reviewer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

    @classmethod
    def _missing_(cls, value: object) -> "PermissionLevel | None":
        """Gracefully map legacy enum values stored in the database."""

        if isinstance(value, str):
            mapped = LEGACY_PERMISSION_LEVEL_MAP.get(value.lower())
            if mapped:
                return mapped
        return None


LEGACY_PERMISSION_LEVEL_MAP.update(
    {
        "view_only": PermissionLevel.READER,
        "link_access": PermissionLevel.READER,
        "edit_access": PermissionLevel.EDITOR,
        "admin_access": PermissionLevel.ADMIN,
    }
)


def _permission_level_values(enum_cls: type[PermissionLevel] | PermissionLevel) -> list[str]:
    """Return the canonical database values for :class:`PermissionLevel`."""

    actual_enum: EnumMeta | type[PermissionLevel]
    if isinstance(enum_cls, EnumMeta):
        actual_enum = enum_cls
    else:
        actual_enum = enum_cls.__class__

    return [member.value for member in actual_enum]


def PermissionLevelEnum(**kwargs) -> Enum:
    """Factory for SQLAlchemy ``Enum`` that understands legacy values."""

    sa_enum = Enum(
        PermissionLevel,
        values_callable=_permission_level_values,
        native_enum=False,
        validate_strings=True,
        name="permissionlevel",
        **kwargs,
    )

    object_lookup = getattr(sa_enum, "_object_lookup", None)
    if not isinstance(object_lookup, dict):
        object_lookup = {}
        setattr(sa_enum, "_object_lookup", object_lookup)
    object_lookup.setdefault(None, None)

    valid_lookup = getattr(sa_enum, "_valid_lookup", None)
    if not isinstance(valid_lookup, dict):
        valid_lookup = {}
        setattr(sa_enum, "_valid_lookup", valid_lookup)
    valid_lookup.setdefault(None, None)

    extended_values = list(getattr(sa_enum, "enums", []))

    def _register(value: str, member: PermissionLevel) -> None:
        if value not in extended_values:
            extended_values.append(value)
        if isinstance(object_lookup, dict):
            object_lookup[value] = member
        if isinstance(valid_lookup, dict):
            valid_lookup.setdefault(member, value)
            valid_lookup[value] = value

    for member in PermissionLevel:
        _register(member.name, member)

    for legacy_value, member in LEGACY_PERMISSION_LEVEL_MAP.items():
        _register(legacy_value, member)
        _register(legacy_value.upper(), member)

    sa_enum.enums = extended_values

    return sa_enum

class AccessLevel(str, enum.Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class IncidentStatus(str, enum.Enum):
    OPEN = "Open"
    UNDER_INVESTIGATION = "Under Investigation"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class IncidentSeverity(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class IncidentPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class InvestigationActivityType(str, enum.Enum):
    INTERVIEW = "Interview"
    EVIDENCE_COLLECTION = "Evidence Collection"
    ANALYSIS = "Analysis"
    SITE_VISIT = "Site Visit"
    EXPERT_CONSULTATION = "Expert Consultation"
    TESTING = "Testing"
    RESEARCH = "Research"
    OTHER = "Other"

class CorrectiveActionType(str, enum.Enum):
    IMMEDIATE = "Immediate Action"
    SHORT_TERM = "Short-term Corrective Action"
    LONG_TERM = "Long-term Corrective Action"
    PREVENTIVE = "Preventive Action"
    IMPROVEMENT = "Improvement Action"


class CorrectiveActionSource(str, enum.Enum):
    INCIDENT_REPORT = "Incident Report"
    AUDIT_FINDING = "Audit Finding"
    RISK_ASSESSMENT = "Risk Assessment"
    CUSTOMER_COMPLAINT = "Customer Complaint"
    MANAGEMENT_REVIEW = "Management Review"
    FMEA = "FMEA"
    OTHER = "Other"


class CorrectiveActionPriority(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class CorrectiveActionImpact(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class CorrectiveActionUrgency(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class CorrectiveActionStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CLOSED = "Closed"
    CANCELLED = "Cancelled"


class CorrectiveActionStepStatus(str, enum.Enum):
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    DELAYED = "Delayed"


class CorrectiveActionUpdateType(str, enum.Enum):
    PROGRESS_UPDATE = "Progress Update"
    ISSUE_REPORT = "Issue Report"
    RESOURCE_CHANGE = "Resource Change"
    TIMELINE_CHANGE = "Timeline Change"
    ESCALATION = "Escalation"
    REVIEW = "Review"
    COMMENT = "Comment"


class CorrectiveActionEvaluationMethod(str, enum.Enum):
    METRICS_REVIEW = "Metrics review"
    AUDIT = "Audit"
    SURVEY = "Survey"
    OTHER = "Other"


class CorrectiveActionEffectivenessRating(str, enum.Enum):
    EFFECTIVE = "Effective"
    PARTIALLY_EFFECTIVE = "Partially Effective"
    NOT_EFFECTIVE = "Not Effective"

# Organizational Hierarchy Models

class Group(Base):
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    code = Column(String(20), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    companies = relationship("Company", back_populates="group")
    created_by = relationship("User", back_populates="created_groups")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200), nullable=True)
    code = Column(String(20), nullable=False)
    registration_number = Column(String(50), nullable=True)
    tax_id = Column(String(50), nullable=True)
    
    # Parent relationship
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    
    # Company details
    address = Column(Text, nullable=True)
    website = Column(String(200), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    industry = Column(String(100), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    group = relationship("Group", back_populates="companies")
    countries = relationship("Country", back_populates="company")
    created_by = relationship("User", back_populates="created_companies")

class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(3), nullable=False)  # ISO country code
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    # Country details
    timezone = Column(String(50), default="UTC")
    currency = Column(String(3), nullable=True)  # ISO currency code
    language = Column(String(10), default="en", nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships  
    company = relationship("Company", back_populates="countries")
    sites = relationship("Site", back_populates="country")
    created_by = relationship("User", back_populates="created_countries")

class Site(Base):
    __tablename__ = "sites"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False)
    
    # Site details
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state_province = Column(String(100), nullable=True) 
    postal_code = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Site type and capacity
    site_type = Column(String(50), nullable=True)  # office, warehouse, factory, etc.
    capacity = Column(Integer, nullable=True)  # max employees/users
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    country = relationship("Country", back_populates="sites")
    departments = relationship("Department", back_populates="site")
    created_by = relationship("User", back_populates="created_sites")

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    parent_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    
    # Department details
    description = Column(Text, nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    budget = Column(Float, nullable=True)
    cost_center = Column(String(50), nullable=True)
    
    # Confidentiality settings for sensitive departments
    is_confidential = Column(Boolean, default=False)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.INTERNAL)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    site = relationship("Site", back_populates="departments")
    parent_department = relationship("Department", remote_side=[id])
    child_departments = relationship("Department", remote_side=[parent_department_id], overlaps="parent_department")
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_departments")
    users = relationship("User", foreign_keys="User.department_id", back_populates="user_department")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_departments")


class RegistrationSubmission(Base):
    __tablename__ = "registration_submissions"

    id = Column(Integer, primary_key=True, index=True)
    setup_mode = Column(String(20), default="guided", nullable=False)

    # Company overview
    company_name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=False)
    company_size = Column(String(50), nullable=False)
    country = Column(String(100), nullable=False)
    time_zone = Column(String(100), nullable=False)
    website = Column(String(255), nullable=True)

    # Administrator contact
    admin_first_name = Column(String(100), nullable=False)
    admin_last_name = Column(String(100), nullable=False)
    admin_email = Column(String(255), nullable=False)
    admin_phone = Column(String(50), nullable=True)
    admin_job_title = Column(String(100), nullable=False)
    admin_department = Column(String(100), nullable=False)
    admin_password_hash = Column(String(255), nullable=False)

    # Structured payloads captured as JSON for downstream workflows
    ai_recommendations = Column(JSON, nullable=True)
    department_payload = Column(JSON, nullable=True)
    framework_payload = Column(JSON, nullable=True)
    quick_options = Column(JSON, nullable=True)
     # "metadata" is reserved by SQLAlchemy's Declarative base, so use a
    # descriptive alias for the stored JSON payload.
    submission_metadata = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

# Device and MFA Models

class UserDevice(Base):
    __tablename__ = "user_devices"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    device_name = Column(String(200), nullable=False)
    device_type = Column(String(50), nullable=False)  # mobile, desktop, tablet
    device_id = Column(String(255), nullable=False, unique=True)  # unique device fingerprint
    device_os = Column(String(100), nullable=True)
    browser = Column(String(100), nullable=True)
    
    # Device verification
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Device status
    is_trusted = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="devices")

class MFAMethod(Base):
    __tablename__ = "mfa_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    method_type = Column(String(20), nullable=False)  # sms, email, totp, backup_codes
    is_primary = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    
    # Method-specific data (encrypted)
    secret_key = Column(String(255), nullable=True)  # For TOTP
    phone_number = Column(String(20), nullable=True)  # For SMS
    email_address = Column(String(255), nullable=True)  # For Email
    backup_codes = Column(Text, nullable=True)  # JSON array of backup codes
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="mfa_methods")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False)
    permission_level = Column(
        PermissionLevelEnum(), default=PermissionLevel.READER, nullable=False
    )
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Organizational hierarchy relationships
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    reporting_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Profile information
    phone = Column(String(20), nullable=True)
    position = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Professional Information (from wizard)
    employee_id = Column(String(50), nullable=True)
    
    # Compliance Role & Permissions (from wizard)
    areas_of_responsibility = Column(Text, nullable=True)  # JSON array as text
    
    # Security and MFA
    mfa_enabled = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Additional Settings (from wizard)
    timezone = Column(String(50), default="America/New_York")
    notifications_email = Column(Boolean, default=True)
    notifications_sms = Column(Boolean, default=False)
    
    # Relationships
    user_department = relationship("Department", foreign_keys=[department_id], back_populates="users")
    reporting_manager = relationship("User", remote_side=[id])
    direct_reports = relationship("User", remote_side=[reporting_manager_id], overlaps="reporting_manager")
    devices = relationship("UserDevice", back_populates="user")
    mfa_methods = relationship("MFAMethod", back_populates="user")
    
    # Organization creation relationships
    created_groups = relationship("Group", back_populates="created_by")
    created_companies = relationship("Company", back_populates="created_by")
    created_countries = relationship("Country", back_populates="created_by")
    created_sites = relationship("Site", back_populates="created_by")
    created_departments = relationship("Department", foreign_keys="Department.created_by_id", back_populates="created_by")
    managed_departments = relationship("Department", foreign_keys="Department.manager_id", back_populates="manager")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    module = Column(String(50), nullable=False)  # document, audit, incident, etc.
    action = Column(String(50), nullable=False)  # create, read, update, delete

class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole), nullable=False)
    permission_level = Column(PermissionLevelEnum(), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)
    
    permission = relationship("Permission")

class PermissionLevelAccess(Base):
    __tablename__ = "permission_level_access"
    
    id = Column(Integer, primary_key=True, index=True)
    permission_level = Column(PermissionLevelEnum(), nullable=False, index=True)
    module = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    allowed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# Document Management Models

class DocumentStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    EXPIRED = "expired"


class DocumentType(str, enum.Enum):
    POLICY = "policy"
    PROCEDURE = "procedure"
    FORM = "form"
    TEMPLATE = "template"
    REPORT = "report"
    MANUAL = "manual"
    CERTIFICATE = "certificate"
    REGULATION = "regulation"
    AUDIT_REPORT = "audit_report"
    RISK_ASSESSMENT = "risk_assessment"
    INCIDENT_REPORT = "incident_report"
    TRAINING_MATERIAL = "training_material"
    OTHER = "other"


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    document_type = Column(Enum(DocumentType), nullable=False, index=True)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.DRAFT, index=True)
    access_level = Column(Enum(AccessLevel), default=AccessLevel.INTERNAL, index=True)
    
    # File information
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=False)  # SHA-256 hash for integrity
    
    # Metadata
    keywords = Column(Text, nullable=True)  # JSON array of keywords
    category = Column(String(100), nullable=True, index=True)
    subcategory = Column(String(100), nullable=True)
    tags = Column(Text, nullable=True)  # JSON array of tags
    
    # Relationships
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    modified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    
    # Version control
    version = Column(String(20), default="1.0", nullable=False)
    is_current_version = Column(Boolean, default=True, index=True)
    parent_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    # Compliance specific
    compliance_framework = Column(String(100), nullable=True)  # ISO, SOX, GDPR, etc.
    retention_period_months = Column(Integer, nullable=True)
    review_frequency_months = Column(Integer, nullable=True)
    next_review_date = Column(DateTime, nullable=True, index=True)
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])
    modified_by = relationship("User", foreign_keys=[modified_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    parent_document = relationship("Document", remote_side=[id])
    child_documents = relationship("Document", remote_side=[parent_document_id], overlaps="parent_document")
    
    # Search optimization
    __table_args__ = (
        Index('idx_document_search', 'title', 'category', 'document_type'),
        Index('idx_document_dates', 'created_at', 'expires_at', 'next_review_date'),
    )


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version = Column(String(20), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    
    # Change tracking
    change_summary = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    created_by = relationship("User")


# Add back_populates to Document model
Document.versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")


class DocumentAccess(Base):
    __tablename__ = "document_access"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(Enum(UserRole), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    permission_level = Column(PermissionLevelEnum(), nullable=True)
    
    # Permissions
    can_read = Column(Boolean, default=True)
    can_download = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)
    
    granted_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    document = relationship("Document")
    user = relationship("User", foreign_keys=[user_id])
    department = relationship("Department")
    granted_by = relationship("User", foreign_keys=[granted_by_id])


class DocumentAuditLog(Base):
    __tablename__ = "document_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    action = Column(String(50), nullable=False, index=True)  # CREATE, READ, UPDATE, DELETE, DOWNLOAD, APPROVE
    details = Column(Text, nullable=True)  # JSON with additional details
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(500), nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    document = relationship("Document")
    user = relationship("User")


class DocumentCategory(Base):
    __tablename__ = "document_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("document_categories.id"), nullable=True)
    color = Column(String(7), nullable=True)  # Hex color code
    icon = Column(String(50), nullable=True)  # Icon name/class
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    parent = relationship("DocumentCategory", remote_side=[id])
    children = relationship("DocumentCategory", remote_side=[parent_id], overlaps="parent")
    created_by = relationship("User")


class DocumentReview(Base):
    __tablename__ = "document_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    status = Column(String(20), nullable=False)  # PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Review assignment
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    
    # Relationships
    document = relationship("Document")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

# Document Assignment Models

class DocumentAssignment(Base):
    __tablename__ = "document_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_to_role = Column(Enum(UserRole), nullable=True)
    
    assignment_type = Column(String(20), nullable=False)  # REVIEW, APPROVE, UPDATE, READ
    priority = Column(String(10), default="MEDIUM")  # HIGH, MEDIUM, LOW
    status = Column(String(20), default="PENDING")  # PENDING, IN_PROGRESS, COMPLETED, OVERDUE
    
    # Assignment details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    
    # Scheduling
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    document = relationship("Document")
    assigned_to_user = relationship("User", foreign_keys=[assigned_to_user_id])
    assigned_to_department = relationship("Department")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

class DocumentSchedule(Base):
    __tablename__ = "document_schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Scheduling information
    release_date = Column(DateTime, nullable=True)
    effective_date = Column(DateTime, nullable=True)
    retirement_date = Column(DateTime, nullable=True)
    
    # Status tracking
    readiness_status = Column(String(20), default="DRAFT")  # DRAFT, READY, SCHEDULED, PUBLISHED, RETIRED
    readiness_notes = Column(Text, nullable=True)
    
    # Responsible parties
    responsible_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    responsible_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    document = relationship("Document")
    responsible_department = relationship("Department")
    responsible_user = relationship("User", foreign_keys=[responsible_user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

# Cross-Department Document Tagging

class CrossDepartmentTag(Base):
    __tablename__ = "cross_department_tags"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    
    tag_type = Column(String(50), nullable=False)  # SHARED, REFERENCE, COLLABORATIVE, etc.
    access_level = Column(PermissionLevelEnum(), default=PermissionLevel.READER)
    
    tagged_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tagged_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationships
    document = relationship("Document")
    department = relationship("Department")
    tagged_by = relationship("User")

# Questionnaire Builder Models

class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SINGLE_CHOICE = "single_choice"
    TEXT = "text"
    TEXTAREA = "textarea"
    RATING = "rating"
    YES_NO = "yes_no"
    DATE = "date"
    DATETIME = "datetime"
    NUMBER = "number"
    EMAIL = "email"
    FILE_UPLOAD = "file_upload"
    SIGNATURE = "signature"
    MATRIX = "matrix"


class QuestionnaireType(str, enum.Enum):
    ASSESSMENT = "assessment"
    SURVEY = "survey"
    CHECKLIST = "checklist"
    EVALUATION = "evaluation"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskTrend(str, enum.Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DETERIORATING = "deteriorating"


class RiskConfidence(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskUpdateSource(str, enum.Enum):
    MANUAL = "manual"
    EXTERNAL_DATA = "external_data"
    AI_ANALYSIS = "ai_analysis"


class RiskAssessmentType(str, enum.Enum):
    COMPREHENSIVE = "comprehensive"
    POLITICAL = "political"
    ECONOMIC = "economic"
    COMPLIANCE = "compliance"
    OPERATIONAL = "operational"
    CUSTOM = "custom"


class RiskScoringScale(str, enum.Enum):
    ONE_TO_FIVE = "1-5"
    ONE_TO_TEN = "1-10"
    ONE_TO_HUNDRED = "1-100"
    CUSTOM = "custom"


class AuditType(str, enum.Enum):
    INTERNAL = "internal_audit"
    COMPLIANCE = "compliance_audit"
    QUALITY = "quality_audit"
    FINANCIAL = "financial_audit"
    IT_SECURITY = "it_security_audit"
    RISK_ASSESSMENT = "risk_assessment_audit"
    OPERATIONAL = "operational_audit"
    ENVIRONMENTAL = "environmental_audit"
    HEALTH_SAFETY = "health_safety_audit"
    CUSTOM = "custom_template"


class AuditStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"


class AuditQuestionType(str, enum.Enum):
    YES_NO = "yes_no"
    MULTIPLE_CHOICE = "multiple_choice"
    TEXT = "text"
    RATING = "rating"
    EVIDENCE = "evidence"

class QuestionnaireStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    ARCHIVED = "archived"

class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    questionnaire_type = Column(Enum(QuestionnaireType), default=QuestionnaireType.ASSESSMENT)
    status = Column(Enum(QuestionnaireStatus), default=QuestionnaireStatus.DRAFT)
    
    # Configuration
    allow_anonymous = Column(Boolean, default=False)
    allow_multiple_responses = Column(Boolean, default=False)
    show_progress = Column(Boolean, default=True)
    randomize_questions = Column(Boolean, default=False)
    
    # Scheduling
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    
    # Access control
    access_level = Column(Enum(AccessLevel), default=AccessLevel.INTERNAL)
    target_roles = Column(Text, nullable=True)  # JSON array of roles
    target_departments = Column(Text, nullable=True)  # JSON array of department IDs
    
    # Integration
    linked_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    trigger_on_document_access = Column(Boolean, default=False)
    
    # Metadata
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User")
    linked_document = relationship("Document")
    questions = relationship("Question", back_populates="questionnaire", cascade="all, delete-orphan")
    responses = relationship("QuestionnaireResponse", back_populates="questionnaire")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(QuestionType), nullable=False)
    is_required = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False)
    
    # Question configuration
    options = Column(Text, nullable=True)  # JSON array for multiple choice
    min_value = Column(Integer, nullable=True)  # For rating/number questions
    max_value = Column(Integer, nullable=True)  # For rating/number questions
    placeholder = Column(String(255), nullable=True)
    help_text = Column(Text, nullable=True)
    validation_rules = Column(Text, nullable=True)  # JSON definition of validation / logic
    scoring_weight = Column(Float, nullable=True)
    risk_level = Column(Enum(RiskLevel), nullable=True)
    ai_metadata = Column(Text, nullable=True)  # Cache for AI insights like suggestions/quality
    matrix_config = Column(Text, nullable=True)
    
    # Conditional logic
    conditional_question_id = Column(Integer, ForeignKey("questions.id"), nullable=True)
    conditional_operator = Column(String(20), nullable=True)  # equals, not_equals, contains, etc.
    conditional_value = Column(String(500), nullable=True)
    show_if_condition_met = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    questionnaire = relationship("Questionnaire", back_populates="questions")
    conditional_question = relationship("Question", remote_side=[id])
    answers = relationship("Answer", back_populates="question")

class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    respondent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous
    
    # Response metadata
    session_id = Column(String(255), nullable=False, unique=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Completion tracking
    is_complete = Column(Boolean, default=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)
    
    # Relationships
    questionnaire = relationship("Questionnaire", back_populates="responses")
    respondent = relationship("User")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")

class Answer(Base):
    __tablename__ = "answers"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    response_id = Column(Integer, ForeignKey("questionnaire_responses.id"), nullable=False)
    
    # Answer data
    answer_text = Column(Text, nullable=True)
    answer_number = Column(Float, nullable=True)
    answer_date = Column(DateTime, nullable=True)
    answer_boolean = Column(Boolean, nullable=True)
    selected_options = Column(Text, nullable=True)  # JSON array for multiple choice
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    question = relationship("Question", back_populates="answers")
    response = relationship("QuestionnaireResponse", back_populates="answers")

class QuestionnaireAnalytics(Base):
    __tablename__ = "questionnaire_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    questionnaire_id = Column(Integer, ForeignKey("questionnaires.id"), nullable=False)
    
    # Response metrics
    total_responses = Column(Integer, default=0)
    completed_responses = Column(Integer, default=0)
    average_completion_time = Column(Integer, nullable=True)  # seconds
    completion_rate = Column(Float, nullable=True)  # percentage
    
    # Engagement metrics
    unique_visitors = Column(Integer, default=0)
    bounce_rate = Column(Float, nullable=True)  # percentage
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    questionnaire = relationship("Questionnaire")

# Password Reset Models

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    used_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Relationships
    user = relationship("User")



# FMEA Models
class FMEAType(str, enum.Enum):
    PROCESS = "Process FMEA (PFMEA)"
    DESIGN = "Design FMEA (DFMEA)"
    SYSTEM = "System FMEA (SFMEA)"
    SERVICE = "Service FMEA"
    SOFTWARE = "Software FMEA"


class FMEAStatus(str, enum.Enum):
    ACTIVE = "Active"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"


class ActionStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    OVERDUE = "Overdue"
    CANCELLED = "Cancelled"


class FMEA(Base):
    __tablename__ = "fmeas"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    fmea_type = Column(Enum(FMEAType), nullable=False)
    process_or_product_name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    departments_csv = Column(Text, nullable=True)  # store names/ids as CSV; adapt to your Department model later
    team_lead_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_date = Column(Date, nullable=False)
    standard = Column(String(50), nullable=True)  # e.g. "AIAG-VDA", "IEC 60812", "Custom"
    scope = Column(Text, nullable=False)
    assumptions = Column(Text, nullable=True)

    # Rating scale configuration (configurable 1-10 scale; you can extend with label tables if needed)
    severity_min = Column(Integer, default=1)
    severity_max = Column(Integer, default=10)
    occurrence_min = Column(Integer, default=1)
    occurrence_max = Column(Integer, default=10)
    detection_min = Column(Integer, default=1)
    detection_max = Column(Integer, default=10)

    status = Column(Enum(FMEAStatus), default=FMEAStatus.ACTIVE, nullable=False)

    highest_rpn = Column(Integer, default=0)
    actions_count = Column(Integer, default=0)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("FMEAItem", back_populates="fmea", cascade="all, delete-orphan")
    actions = relationship("FMEAAction", back_populates="fmea", cascade="all, delete-orphan")
    team_members = relationship("FMEATeamMember", back_populates="fmea", cascade="all, delete-orphan")


class FMEATeamMember(Base):
    __tablename__ = "fmea_team_members"

    id = Column(Integer, primary_key=True)
    fmea_id = Column(Integer, ForeignKey("fmeas.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(100), nullable=True)  # optional: "Engineer", "QA", etc.

    fmea = relationship("FMEA", back_populates="team_members")


class FMEAItem(Base):
    __tablename__ = "fmea_items"

    id = Column(Integer, primary_key=True, index=True)
    fmea_id = Column(Integer, ForeignKey("fmeas.id", ondelete="CASCADE"), nullable=False)

    item_function = Column(String(255), nullable=False)
    failure_mode = Column(String(255), nullable=False)
    effects = Column(Text, nullable=True)
    severity = Column(Integer, nullable=False)
    causes = Column(Text, nullable=True)
    occurrence = Column(Integer, nullable=False)
    current_controls = Column(Text, nullable=True)
    detection = Column(Integer, nullable=False)

    rpn = Column(Integer, nullable=False)  # S * O * D

    recommended_actions = Column(Text, nullable=True)
    responsibility_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_date = Column(Date, nullable=True)
    actions_taken = Column(Text, nullable=True)

    # Post-mitigation values
    new_severity = Column(Integer, nullable=True)
    new_occurrence = Column(Integer, nullable=True)
    new_detection = Column(Integer, nullable=True)
    new_rpn = Column(Integer, nullable=True)

    status = Column(String(30), default="Open", nullable=False)  # Open, In Progress, Completed

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    fmea = relationship("FMEA", back_populates="items")


class FMEAAction(Base):
    __tablename__ = "fmea_actions"

    id = Column(Integer, primary_key=True)
    fmea_id = Column(Integer, ForeignKey("fmeas.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("fmea_items.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ActionStatus), default=ActionStatus.OPEN, nullable=False)
    due_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    fmea = relationship("FMEA", back_populates="actions")



# --- Incident Management Models ---


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    incident_type = Column(String(100), nullable=False)
    incident_category = Column(String(100), nullable=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    location_path = Column(JSON, nullable=True)

    occurred_at = Column(DateTime, nullable=False, index=True)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    severity = Column(Enum(IncidentSeverity), nullable=False)
    priority = Column(Enum(IncidentPriority), default=IncidentPriority.MEDIUM, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False, index=True)

    impact_assessment = Column(Text, nullable=False)
    immediate_actions = Column(Text, nullable=True)

    detailed_description = Column(Text, nullable=False)
    what_happened = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=True)
    contributing_factors = Column(Text, nullable=True)

    people_involved_ids = Column(JSON, nullable=True)
    witness_ids = Column(JSON, nullable=True)
    equipment_involved = Column(Text, nullable=True)

    immediate_notification_ids = Column(JSON, nullable=True)
    escalation_path = Column(JSON, nullable=True)
    external_notifications = Column(JSON, nullable=True)
    public_disclosure_required = Column(Boolean, default=False, nullable=False)

    resolved_at = Column(DateTime, nullable=True)
    is_overdue = Column(Boolean, default=False, nullable=False)

    ai_metadata = Column(JSON, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department")
    created_by = relationship("User", backref="reported_incidents", foreign_keys=[created_by_id])
    attachments = relationship(
        "IncidentAttachment",
        cascade="all, delete-orphan",
        back_populates="incident",
    )
    investigation = relationship(
        "IncidentInvestigation",
        cascade="all, delete-orphan",
        back_populates="incident",
        uselist=False,
    )


class IncidentAttachment(Base):
    __tablename__ = "incident_attachments"

    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)

    file_name = Column(String(255), nullable=False)
    file_url = Column(String(512), nullable=True)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)

    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    evidence_metadata = Column(JSON, nullable=True)

    incident = relationship("Incident", back_populates="attachments")
    uploaded_by = relationship("User", backref="incident_attachments")


class IncidentInvestigation(Base):
    __tablename__ = "incident_investigations"

    id = Column(Integer, primary_key=True)
    incident_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False)
    priority = Column(Enum(IncidentPriority), default=IncidentPriority.MEDIUM, nullable=False)

    assigned_investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    investigation_team_ids = Column(JSON, nullable=True)

    target_resolution_date = Column(Date, nullable=True)
    actual_resolution_date = Column(Date, nullable=True)

    rca_method = Column(String(100), nullable=True)
    primary_root_cause = Column(Text, nullable=True)
    rca_notes = Column(Text, nullable=True)
    ai_guidance = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    incident = relationship("Incident", back_populates="investigation")
    assigned_investigator = relationship(
        "User",
        backref="assigned_incident_investigations",
        foreign_keys=[assigned_investigator_id],
    )
    activities = relationship(
        "IncidentInvestigationActivity",
        cascade="all, delete-orphan",
        back_populates="investigation",
    )
    root_cause_factors = relationship(
        "IncidentRootCauseFactor",
        cascade="all, delete-orphan",
        back_populates="investigation",
    )


class IncidentInvestigationActivity(Base):
    __tablename__ = "incident_investigation_activities"

    id = Column(Integer, primary_key=True)
    investigation_id = Column(
        Integer,
        ForeignKey("incident_investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    activity_time = Column(DateTime, nullable=False, index=True)
    activity_type = Column(Enum(InvestigationActivityType), nullable=False)
    investigator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    description = Column(Text, nullable=True)
    findings = Column(Text, nullable=True)
    evidence_url = Column(String(512), nullable=True)
    follow_up_required = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    investigation = relationship("IncidentInvestigation", back_populates="activities")
    investigator = relationship("User", backref="incident_investigation_activities")


class IncidentRootCauseFactor(Base):
    __tablename__ = "incident_root_cause_factors"

    id = Column(Integer, primary_key=True)
    investigation_id = Column(
        Integer,
        ForeignKey("incident_investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    impact_level = Column(Enum(IncidentSeverity), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    investigation = relationship("IncidentInvestigation", back_populates="root_cause_factors")


class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id = Column(Integer, primary_key=True, index=True)
    action_code = Column(String(32), nullable=False, unique=True, index=True)

    title = Column(String(200), nullable=False)
    action_type = Column(Enum(CorrectiveActionType), nullable=False)
    source_reference = Column(Enum(CorrectiveActionSource), nullable=False)
    reference_id = Column(String(200), nullable=True)

    department_ids = Column(JSON, nullable=False, default=list)
    priority = Column(Enum(CorrectiveActionPriority), nullable=False, default=CorrectiveActionPriority.MEDIUM)
    impact = Column(Enum(CorrectiveActionImpact), nullable=False, default=CorrectiveActionImpact.MEDIUM)
    urgency = Column(Enum(CorrectiveActionUrgency), nullable=False, default=CorrectiveActionUrgency.MEDIUM)

    problem_statement = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=False)
    contributing_factors = Column(Text, nullable=True)
    impact_assessment = Column(Text, nullable=False)
    current_controls = Column(Text, nullable=True)
    evidence_files = Column(JSON, nullable=True, default=list)

    corrective_action_description = Column(Text, nullable=False)

    overall_due_date = Column(Date, nullable=False)
    action_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_team_ids = Column(JSON, nullable=True, default=list)
    budget_required = Column(Float, nullable=True)
    approval_required = Column(Boolean, default=False, nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    status = Column(Enum(CorrectiveActionStatus), nullable=False, default=CorrectiveActionStatus.OPEN)
    progress_percent = Column(Float, nullable=False, default=0.0)

    evaluation_due_date = Column(Date, nullable=True)
    evaluation_method = Column(Enum(CorrectiveActionEvaluationMethod), nullable=True)
    effectiveness_rating = Column(Enum(CorrectiveActionEffectivenessRating), nullable=True)
    evaluation_comments = Column(Text, nullable=True)
    further_actions_required = Column(Boolean, nullable=True)
    follow_up_actions = Column(Text, nullable=True)

    ai_effectiveness_score = Column(Float, nullable=True)
    ai_risk_score = Column(Float, nullable=True)
    ai_recommendations = Column(JSON, nullable=True, default=dict)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_status_change = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", foreign_keys=[action_owner_id], backref="owned_corrective_actions")
    approver = relationship("User", foreign_keys=[approver_id], backref="approved_corrective_actions")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_corrective_actions")

    steps = relationship(
        "CorrectiveActionStep",
        back_populates="action",
        cascade="all, delete-orphan",
        order_by="CorrectiveActionStep.order_index",
    )
    updates = relationship(
        "CorrectiveActionUpdate",
        back_populates="action",
        cascade="all, delete-orphan",
        order_by="CorrectiveActionUpdate.created_at",
    )
    metrics = relationship(
        "CorrectiveActionMetric",
        back_populates="action",
        cascade="all, delete-orphan",
    )


class CorrectiveActionStep(Base):
    __tablename__ = "corrective_action_steps"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("corrective_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=False)
    responsible_person_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(Date, nullable=True)
    resources_required = Column(Text, nullable=True)
    success_criteria = Column(Text, nullable=True)
    status = Column(Enum(CorrectiveActionStepStatus), nullable=False, default=CorrectiveActionStepStatus.NOT_STARTED)
    progress_notes = Column(Text, nullable=True)
    issues_obstacles = Column(Text, nullable=True)
    evidence = Column(JSON, nullable=True, default=list)
    completion_date = Column(Date, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    action = relationship("CorrectiveAction", back_populates="steps")
    responsible_person = relationship("User", foreign_keys=[responsible_person_id], backref="corrective_action_steps")


class CorrectiveActionUpdate(Base):
    __tablename__ = "corrective_action_updates"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("corrective_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    update_type = Column(Enum(CorrectiveActionUpdateType), nullable=False)
    description = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    action = relationship("CorrectiveAction", back_populates="updates")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="corrective_action_updates")


class CorrectiveActionMetric(Base):
    __tablename__ = "corrective_action_metrics"

    id = Column(Integer, primary_key=True, index=True)
    action_id = Column(Integer, ForeignKey("corrective_actions.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_name = Column(String(200), nullable=False)
    target_value = Column(String(100), nullable=True)
    actual_value = Column(String(100), nullable=True)
    measurement_method = Column(String(100), nullable=True)
    measurement_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    action = relationship("CorrectiveAction", back_populates="metrics")


# --- Calendar & Project Timeline Models ---

# If Base/User already exist in your models.py, import/reuse them:
# from .models import User  # ensure not circular; adapt import as needed

class EventTypeEnum(PyEnum):
    AUDIT = "Audit"
    RISK_ASSESSMENT = "Risk Assessment"
    TRAINING = "Training Session"
    COMPLIANCE_REVIEW = "Compliance Review"
    DOCUMENT_REVIEW = "Document Review"
    INCIDENT_INVESTIGATION = "Incident Investigation"
    MEETING = "Meeting"
    DEADLINE = "Deadline"
    OTHER = "Other"

class PriorityEnum(PyEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class EventStatusEnum(PyEnum):
    SCHEDULED = "Scheduled"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class AttendeeStatusEnum(PyEnum):
    INVITED = "Invited"
    ACCEPTED = "Accepted"
    DECLINED = "Declined"
    TENTATIVE = "Tentative"

class ReminderMethodEnum(PyEnum):
    EMAIL = "Email"
    SMS = "SMS"
    PUSH = "Push"

class ProjectStatusEnum(PyEnum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    ON_HOLD = "On Hold"
    COMPLETED = "Completed"

class TaskPriorityEnum(PyEnum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    start = Column(DateTime, nullable=False, index=True)
    end = Column(DateTime, nullable=False, index=True)
    type = Column(Enum(EventTypeEnum), nullable=False)
    description = Column(Text, nullable=True)

    location = Column(String(255), nullable=True)
    virtual_meeting_link = Column(String(512), nullable=True)

    priority = Column(Enum(PriorityEnum), nullable=False, default=PriorityEnum.MEDIUM)
    status = Column(Enum(EventStatusEnum), nullable=False, default=EventStatusEnum.SCHEDULED)

    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organizer = relationship("User", backref="organized_events")

    department_ids = Column(JSON, nullable=True)  # list[int] if you have Department model; keep simple & portable
    equipment = Column(JSON, nullable=True)       # list[str]
    meeting_room = Column(String(128), nullable=True)
    catering_required = Column(Boolean, default=False)

    all_day = Column(Boolean, default=False)
    tz = Column(String(64), nullable=False, default="UTC")
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)

    # Recurrence: store RFC5545 RRULE (e.g. "FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20251231T235959Z")
    rrule = Column(String(512), nullable=True)

    # Reminder & invitation preferences
    send_invitations = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    attendees = relationship("EventAttendee", cascade="all, delete-orphan", back_populates="event")
    reminders = relationship("EventReminder", cascade="all, delete-orphan", back_populates="event")

class EventAttendee(Base):
    __tablename__ = "calendar_event_attendees"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("calendar_events.id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # internal users optional
    email = Column(String(255), nullable=True)  # for external attendees
    required = Column(Boolean, default=True)
    status = Column(Enum(AttendeeStatusEnum), default=AttendeeStatusEnum.INVITED, nullable=False)

    event = relationship("CalendarEvent", back_populates="attendees")
    user = relationship("User", backref="calendar_attendances")

class EventReminder(Base):
    __tablename__ = "calendar_event_reminders"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("calendar_events.id", ondelete="CASCADE"), index=True)
    minutes_before = Column(Integer, nullable=False, default=30)
    method = Column(Enum(ReminderMethodEnum), nullable=False, default=ReminderMethodEnum.EMAIL)
    custom_message = Column(Text, nullable=True)

    event = relationship("CalendarEvent", back_populates="reminders")

# --- Project Timeline / Gantt ---

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ProjectStatusEnum), default=ProjectStatusEnum.PLANNING, nullable=False)
    start_date = Column(DateTime(timezone=False), nullable=False)
    end_date = Column(DateTime(timezone=False), nullable=False)
    overall_progress = Column(Float, default=0.0)

    manager = relationship("User", backref="managed_projects")
    tasks = relationship("ProjectTask", cascade="all, delete-orphan", back_populates="project")

class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    start_date = Column(DateTime(timezone=False), nullable=False)
    end_date = Column(DateTime(timezone=False), nullable=False)
    duration_hours = Column(Float, nullable=True)
    progress = Column(Float, default=0.0)
    priority = Column(Enum(TaskPriorityEnum), default=TaskPriorityEnum.MEDIUM, nullable=False)

    project = relationship("Project", back_populates="tasks")
    assigned_to = relationship("User", backref="assigned_tasks")

class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True)
    predecessor_id = Column(Integer, ForeignKey("project_tasks.id", ondelete="CASCADE"), index=True)
    successor_id = Column(Integer, ForeignKey("project_tasks.id", ondelete="CASCADE"), index=True)


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    audit_type = Column(Enum(AuditType), nullable=False)
    status = Column(Enum(AuditStatus), nullable=False, default=AuditStatus.DRAFT)
    risk_level = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)

    scope = Column(Text, nullable=False)
    objective = Column(Text, nullable=False)
    compliance_frameworks = Column(JSON, nullable=True, default=list)
    department_ids = Column(JSON, nullable=False, default=list)

    planned_start_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=False)
    estimated_duration_hours = Column(Integer, nullable=False, default=0)
    progress = Column(Integer, nullable=False, default=0)

    lead_auditor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    audit_team_ids = Column(JSON, nullable=True, default=list)
    external_auditors = Column(Text, nullable=True)
    auditee_contact_ids = Column(JSON, nullable=True, default=list)
    meeting_room = Column(String(200), nullable=True)
    special_requirements = Column(Text, nullable=True)

    notification_settings = Column(JSON, nullable=True, default=dict)
    email_templates = Column(JSON, nullable=True, default=dict)
    distribution_list_ids = Column(JSON, nullable=True, default=list)
    cc_list = Column(JSON, nullable=True, default=list)
    bcc_list = Column(JSON, nullable=True, default=list)
    launch_option = Column(String(50), nullable=False, default="draft")

    resource_allocation = Column(JSON, nullable=True, default=list)
    timeline = Column(JSON, nullable=True, default=list)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lead_auditor = relationship("User", foreign_keys=[lead_auditor_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    sections = relationship(
        "AuditChecklistSection",
        back_populates="audit",
        cascade="all, delete-orphan",
        order_by="AuditChecklistSection.order_index",
    )

    @property
    def departments(self):
        return self.department_ids or []

    @departments.setter
    def departments(self, value):
        self.department_ids = value


class AuditChecklistSection(Base):
    __tablename__ = "audit_checklist_sections"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Integer, nullable=False, default=0)
    is_required = Column(Boolean, default=False)
    order_index = Column(Integer, nullable=False, default=0)

    audit = relationship("Audit", back_populates="sections")
    questions = relationship(
        "AuditChecklistQuestion",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="AuditChecklistQuestion.order_index",
    )


class AuditChecklistQuestion(Base):
    __tablename__ = "audit_checklist_questions"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("audit_checklist_sections.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(Enum(AuditQuestionType), nullable=False)
    evidence_required = Column(Boolean, default=False)
    scoring_weight = Column(Integer, nullable=False, default=0)
    risk_impact = Column(Enum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    guidance_notes = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)

    section = relationship("AuditChecklistSection", back_populates="questions")


class CountryRiskAssessment(Base):
    __tablename__ = "country_risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    assessment_type = Column(Enum(RiskAssessmentType), nullable=False, default=RiskAssessmentType.COMPREHENSIVE)
    assessment_framework = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="draft")

    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    update_frequency = Column(String(50), nullable=False, default="annually")

    scoring_scale = Column(Enum(RiskScoringScale), nullable=False, default=RiskScoringScale.ONE_TO_HUNDRED)
    custom_scoring_scale = Column(String(255), nullable=True)
    impact_scale = Column(JSON, nullable=True, default=dict)
    probability_scale = Column(JSON, nullable=True, default=dict)

    assigned_assessor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_team_ids = Column(JSON, nullable=True, default=list)

    ai_configuration = Column(JSON, nullable=True, default=dict)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    assigned_assessor = relationship("User", foreign_keys=[assigned_assessor_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    categories = relationship(
        "CountryRiskCategoryWeight",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="CountryRiskCategoryWeight.order_index",
    )
    countries = relationship(
        "CountryRiskAssessmentCountry",
        back_populates="assessment",
        cascade="all, delete-orphan",
        order_by="CountryRiskAssessmentCountry.country_name",
    )


class CountryRiskCategoryWeight(Base):
    __tablename__ = "country_risk_category_weights"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer,
        ForeignKey("country_risk_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_key = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=False)
    weight = Column(Integer, nullable=False, default=0)
    order_index = Column(Integer, nullable=False, default=0)
    baseline_guidance = Column(Text, nullable=True)

    assessment = relationship("CountryRiskAssessment", back_populates="categories")

    __table_args__ = (
        Index(
            "ix_country_risk_category_unique",
            "assessment_id",
            "category_key",
            unique=True,
        ),
    )


class CountryRiskAssessmentCountry(Base):
    __tablename__ = "country_risk_assessment_countries"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer,
        ForeignKey("country_risk_assessments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    country_code = Column(String(3), nullable=False, index=True)
    country_name = Column(String(150), nullable=False)

    overall_score = Column(Float, nullable=True)
    risk_level = Column(Enum(RiskLevel), nullable=True)
    trend = Column(Enum(RiskTrend), nullable=True)
    confidence = Column(Enum(RiskConfidence), nullable=True)
    last_updated = Column(DateTime, nullable=True)
    update_source = Column(Enum(RiskUpdateSource), nullable=True)
    evidence = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    next_review_date = Column(Date, nullable=True)
    attachments = Column(JSON, nullable=True, default=list)
    ai_generated = Column(Boolean, default=False)

    assessment = relationship("CountryRiskAssessment", back_populates="countries")
    category_scores = relationship(
        "CountryRiskCategoryScore",
        back_populates="country",
        cascade="all, delete-orphan",
        order_by="CountryRiskCategoryScore.category_name",
    )

    __table_args__ = (
        Index(
            "ix_country_risk_assessment_countries_unique",
            "assessment_id",
            "country_code",
            unique=True,
        ),
    )


class CountryRiskCategoryScore(Base):
    __tablename__ = "country_risk_category_scores"

    id = Column(Integer, primary_key=True, index=True)
    country_entry_id = Column(
        Integer,
        ForeignKey("country_risk_assessment_countries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_key = Column(String(100), nullable=False)
    category_name = Column(String(200), nullable=False)
    score = Column(Float, nullable=True)
    trend = Column(Enum(RiskTrend), nullable=True)
    confidence = Column(Enum(RiskConfidence), nullable=True)
    evidence = Column(Text, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    update_source = Column(Enum(RiskUpdateSource), nullable=True)

    country = relationship("CountryRiskAssessmentCountry", back_populates="category_scores")

    __table_args__ = (
        Index(
            "ix_country_risk_category_scores_unique",
            "country_entry_id",
            "category_key",
            unique=True,
        ),
    )
