from __future__ import annotations
from pydantic import BaseModel, EmailStr, field_validator, Field, conint, AnyUrl
from typing import Optional, List, Union, Dict, Any, Literal
from datetime import datetime, date
from models import (
    UserRole,
    PermissionLevel,
    DocumentStatus,
    DocumentType,
    AccessLevel,
    QuestionType,
    QuestionnaireStatus,
    QuestionnaireType,
    RiskLevel,
    RiskTrend,
    RiskConfidence,
    RiskUpdateSource,
    RiskAssessmentType,
    RiskScoringScale,
    FMEAType,
    FMEAStatus,
    ActionStatus,
    AuditType,
    AuditStatus,
    AuditQuestionType,
    IncidentStatus,
    IncidentSeverity,
    IncidentPriority,
    InvestigationActivityType,
    CorrectiveActionType,
    CorrectiveActionSource,
    CorrectiveActionPriority,
    CorrectiveActionImpact,
    CorrectiveActionUrgency,
    CorrectiveActionStatus,
    CorrectiveActionStepStatus,
    CorrectiveActionUpdateType,
    CorrectiveActionEvaluationMethod,
    CorrectiveActionEffectivenessRating,
)
from enum import Enum



# User schemas
class UserBase(BaseModel):
    """Base user information"""
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "john.doe@company.com",
                    "username": "johndoe",
                    "first_name": "John",
                    "last_name": "Doe",
                    "phone": "+1-555-123-4567",
                    "department": "IT Security",
                    "position": "Compliance Officer"
                }
            ]
        }
    }

class RegistrationDepartment(BaseModel):
    name: str
    description: Optional[str] = None
    parent_department: Optional[str] = Field(default=None, max_length=100)


class RegistrationFramework(BaseModel):
    key: str
    label: str
    category: str
    estimated_timeline: Optional[str] = None


class RegistrationCustomFramework(BaseModel):
    name: str
    description: Optional[str] = None


class CompanyRegistrationRequest(BaseModel):
    company_name: str = Field(..., max_length=100)
    industry: str
    company_size: str
    country: str
    time_zone: str
    website: Optional[AnyUrl] = None

    admin_first_name: str = Field(..., max_length=50)
    admin_last_name: str = Field(..., max_length=50)
    admin_email: EmailStr
    admin_phone: Optional[str] = None
    admin_job_title: str = Field(..., max_length=100)
    admin_department: str = Field(..., max_length=100)

    password: str = Field(..., min_length=8)
    permission_level: PermissionLevel = PermissionLevel.ADMIN
    role: UserRole = UserRole.ADMIN

    departments: List[RegistrationDepartment] = Field(default_factory=list)
    frameworks: List[RegistrationFramework] = Field(default_factory=list)
    custom_frameworks: List[RegistrationCustomFramework] = Field(default_factory=list)
    recommended_modules: List[str] = Field(default_factory=list)
    estimated_setup_time: Optional[str] = None

    quick_setup: bool = False
    setup_score: Optional[int] = None


class QuickCompanyRegistrationRequest(BaseModel):
    company_name: str = Field(..., max_length=100)
    industry: str
    company_size: str
    country: str
    website: Optional[AnyUrl] = None

    admin_first_name: str = Field(..., max_length=50)
    admin_last_name: str = Field(..., max_length=50)
    admin_email: EmailStr
    password: str = Field(..., min_length=8)

    use_default_departments: bool = True
    configure_departments_later: bool = False
    use_standard_frameworks: bool = True
    configure_frameworks_later: bool = False

    permission_level: PermissionLevel = PermissionLevel.ADMIN
    role: UserRole = UserRole.ADMIN
    setup_score: Optional[int] = None


class CompanyRegistrationResponse(BaseModel):
    registration_id: int
    status: str
    recommended_actions: List[str]
    setup_score: Optional[int] = None


class LandingPersonalizationResponse(BaseModel):
    industry: str
    headline: str
    subheadline: str
    dynamic_examples: List[str]
    recommended_modules: List[str]
    testimonial: Optional[str] = None
    ai_summary: Optional[str] = None


class RegistrationSuggestionResponse(BaseModel):
    industry: str
    frameworks: List[RegistrationFramework]
    departments: List[RegistrationDepartment]
    recommended_modules: List[str]
    estimated_setup_time: str


class UserCreate(UserBase):
    """User creation schema with password and role - Extended for compliance wizard"""
    password: str
    role: UserRole = UserRole.EMPLOYEE
    permission_level: PermissionLevel = PermissionLevel.READER
    
    # Professional Information
    employee_id: Optional[str] = None
    
    # Compliance Role & Permissions
    areas_of_responsibility: List[str] = []
    
    # Additional Settings
    timezone: str = "UTC"
    notifications_email: bool = True
    notifications_sms: bool = False
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @field_validator('areas_of_responsibility')
    def validate_areas(cls, v):
        valid_areas = [
            'Document Management',
            'Risk Assessment', 
            'Audit Management',
            'Incident Management',
            'Policy Management',
            'Training & Certification',
            'Regulatory Compliance',
            'Quality Management'
        ]
        for area in v:
            if area not in valid_areas:
                raise ValueError(f'Invalid area of responsibility: {area}')
        return v
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "email": "jane.smith@company.com",
                    "username": "janesmith",
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "password": "securePassword123",
                    "phone": "+1-555-987-6543",
                    "department": "Finance",
                    "position": "Auditor",
                    "role": "auditor",
                    "employee_id": "EMP001",
                    "areas_of_responsibility": ["Audit Management", "Risk Assessment"],
                    "timezone": "UTC",
                    "notifications_email": True,
                    "notifications_sms": False
                }
            ]
        }
    }

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    role: UserRole
    permission_level: PermissionLevel
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# Authentication schemas
class UserLogin(BaseModel):
    """User login credentials"""
    username: str
    password: str
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "johndoe",
                    "password": "mySecretPassword123"
                }
            ]
        }
    }

class Token(BaseModel):
    """JWT token response with user information"""
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "expires_in": 86400,
                    "user": {
                        "id": 1,
                        "email": "john.doe@company.com",
                        "username": "johndoe",
                        "first_name": "John",
                        "last_name": "Doe",
                        "role": "employee",
                        "is_active": True,
                        "is_verified": False,
                        "created_at": "2024-01-01T00:00:00",
                        "department": "IT Security",
                        "position": "Compliance Officer"
                    }
                }
            ]
        }
    }

class TokenData(BaseModel):
    username: Optional[str] = None

# Permission schemas
class PermissionBase(BaseModel):
    name: str
    description: Optional[str] = None
    module: str
    action: str

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: int
    
    class Config:
        from_attributes = True


# Document Management Schemas

class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: DocumentType
    access_level: AccessLevel = AccessLevel.INTERNAL
    category: Optional[str] = None
    subcategory: Optional[str] = None
    keywords: Optional[List[str]] = []
    tags: Optional[List[str]] = []
    compliance_framework: Optional[str] = None
    retention_period_months: Optional[int] = None
    review_frequency_months: Optional[int] = None
    expires_at: Optional[datetime] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    access_level: Optional[AccessLevel] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    compliance_framework: Optional[str] = None
    retention_period_months: Optional[int] = None
    review_frequency_months: Optional[int] = None
    expires_at: Optional[datetime] = None

class DocumentResponse(DocumentBase):
    id: int
    status: DocumentStatus
    filename: str
    file_size: int
    mime_type: str
    version: str
    is_current_version: bool
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    next_review_date: Optional[datetime] = None
    linked_questionnaires: Optional[List[Dict[str, Any]]] = None
    
    # Related data
    created_by: Optional["UserResponse"] = None
    modified_by: Optional["UserResponse"] = None
    approved_by: Optional["UserResponse"] = None
    
    @field_validator('keywords', 'tags', mode='before')
    @classmethod
    def parse_json_lists(cls, v):
        """Convert JSON strings to lists for keywords and tags"""
        if isinstance(v, str):
            try:
                import json
                return json.loads(v) if v else []
            except (json.JSONDecodeError, TypeError):
                return []
        return v if isinstance(v, list) else []
    
    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    id: int
    title: str
    document_type: DocumentType
    status: DocumentStatus
    access_level: AccessLevel
    category: Optional[str] = None
    filename: str
    file_size: int
    version: str
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    next_review_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class DocumentSearchRequest(BaseModel):
    query: Optional[str] = None
    document_type: Optional[DocumentType] = None
    status: Optional[DocumentStatus] = None
    access_level: Optional[AccessLevel] = None
    category: Optional[str] = None
    created_by: Optional[int] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    compliance_framework: Optional[str] = None
    expires_before: Optional[datetime] = None
    needs_review: Optional[bool] = None
    
    # Pagination
    page: int = 1
    size: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"  # "asc" or "desc"

class DocumentSearchResponse(BaseModel):
    documents: List[DocumentListResponse]
    total_count: int
    page: int
    size: int
    total_pages: int

class DocumentVersionResponse(BaseModel):
    id: int
    version: str
    filename: str
    file_size: int
    file_hash: str
    change_summary: Optional[str] = None
    created_by_id: int
    created_at: datetime

    created_by: Optional["UserResponse"] = None

    class Config:
        from_attributes = True


class DocumentContentResponse(BaseModel):
    document_id: int
    filename: str
    mime_type: str
    version: str
    content: str
    supports_editing: bool
    can_edit: bool
    supports_onlyoffice: bool = False
    message: Optional[str] = None


class DocumentContentUpdate(BaseModel):
    content: str
    change_summary: Optional[str] = None


class DocumentOnlyOfficeSessionResponse(BaseModel):
    document_id: int
    session_id: str
    can_edit: bool
    expires_at: datetime
    document_server_url: str
    config: Dict[str, Any]
    token: Optional[str] = None

class DocumentAccessRequest(BaseModel):
    user_id: Optional[int] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    can_read: bool = True
    can_download: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_approve: bool = False
    expires_at: Optional[datetime] = None

class DocumentAccessResponse(BaseModel):
    id: int
    document_id: int
    user_id: Optional[int] = None
    role: Optional[UserRole] = None
    department: Optional[str] = None
    can_read: bool
    can_download: bool
    can_edit: bool
    can_delete: bool
    can_approve: bool
    granted_by_id: int
    granted_at: datetime
    expires_at: Optional[datetime] = None
    
    user: Optional["UserResponse"] = None
    granted_by: Optional["UserResponse"] = None
    
    class Config:
        from_attributes = True

class DocumentAuditLogResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    action: str
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime
    
    user: Optional["UserResponse"] = None
    
    class Config:
        from_attributes = True

class DocumentCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class DocumentCategoryCreate(DocumentCategoryBase):
    pass

class DocumentCategoryResponse(DocumentCategoryBase):
    id: int
    created_at: datetime
    created_by_id: int
    
    created_by: Optional["UserResponse"] = None
    children: Optional[List["DocumentCategoryResponse"]] = []
    
    class Config:
        from_attributes = True

class DocumentReviewBase(BaseModel):
    comments: Optional[str] = None
    due_date: Optional[datetime] = None

class DocumentReviewCreate(DocumentReviewBase):
    reviewer_id: int

class DocumentReviewUpdate(BaseModel):
    status: str  # PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
    comments: Optional[str] = None

class DocumentReviewResponse(DocumentReviewBase):
    id: int
    document_id: int
    reviewer_id: int
    status: str
    reviewed_at: Optional[datetime] = None
    assigned_by_id: int
    assigned_at: datetime
    
    reviewer: Optional["UserResponse"] = None
    assigned_by: Optional["UserResponse"] = None
    
    class Config:
        from_attributes = True

class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentResponse

class DocumentStats(BaseModel):
    total_documents: int
    by_type: dict
    by_status: dict
    by_access_level: dict
    documents_needing_review: int
    expired_documents: int
    recent_uploads: int


# --- Document AI Schemas ---


class DocumentAICategorizeRequest(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: Optional[DocumentType] = None
    department: Optional[str] = None
    existing_tags: Optional[List[str]] = None
    existing_keywords: Optional[List[str]] = None
    text_preview: Optional[str] = None


class DocumentAICategorizeResponse(BaseModel):
    category: Optional[str] = None
    secondary_categories: List[str] = []
    tags: List[str] = []
    keywords: List[str] = []
    summary: Optional[str] = None
    confidence: Optional[float] = None
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAISearchPlan(BaseModel):
    refined_query: Optional[str] = None
    keywords: List[str] = []
    document_types: List[str] = []
    statuses: List[str] = []
    access_levels: List[str] = []
    priority: Optional[str] = None
    reasoning: Optional[str] = None
    raw: Optional[str] = None


class DocumentAISearchRequest(BaseModel):
    query: str
    page: int = 1
    size: int = 20


class DocumentAISearchResponse(BaseModel):
    plan: DocumentAISearchPlan
    results: List[DocumentListResponse]
    total_count: int
    total_pages: int


class DocumentAIDuplicateMatch(BaseModel):
    id: int
    title: str
    similarity: float
    reasoning: Optional[str] = None


class DocumentAIDuplicateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    document_type: Optional[DocumentType] = None
    file_hash: Optional[str] = None
    keywords: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class DocumentAIDuplicateResponse(BaseModel):
    has_exact_match: bool = False
    duplicates: List[DocumentAIDuplicateMatch] = []
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAIRecommendation(BaseModel):
    id: int
    title: str
    reason: Optional[str] = None
    priority: Optional[str] = None


class DocumentAIRecommendationResponse(BaseModel):
    recommendations: List[DocumentAIRecommendation] = []
    documents: List[DocumentListResponse] = []
    summary: Optional[str] = None
    raw: Optional[str] = None


class DocumentAICompletionRequest(BaseModel):
    context: str
    focus: Optional[str] = None


class DocumentAICompletionResponse(BaseModel):
    completion: str
    reasoning: Optional[str] = None
    tips: List[str] = []
    raw: Optional[str] = None


class DocumentAITemplateSuggestion(BaseModel):
    name: str
    description: Optional[str] = None
    when_to_use: Optional[str] = None


class DocumentAITemplateResponse(BaseModel):
    templates: List[DocumentAITemplateSuggestion] = []
    sections: List[str] = []
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAIGrammarIssue(BaseModel):
    issue: str
    severity: Optional[str] = None
    suggestion: Optional[str] = None


class DocumentAIGrammarRequest(BaseModel):
    content: str
    jurisdiction: Optional[str] = None


class DocumentAIGrammarResponse(BaseModel):
    score: Optional[float] = None
    issues: List[DocumentAIGrammarIssue] = []
    summary: Optional[str] = None
    raw: Optional[str] = None


class DocumentAINumberingRequest(BaseModel):
    outline: List[str]
    cross_reference_hints: Optional[List[str]] = None


class DocumentAINumberedSection(BaseModel):
    number: str
    heading: str


class DocumentAINumberingResponse(BaseModel):
    numbered_sections: List[DocumentAINumberedSection] = []
    cross_references: List[str] = []
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAIReviewer(BaseModel):
    id: int
    name: str
    role: Optional[str] = None
    expertise: Optional[List[str]] = None
    workload: Optional[str] = None


class DocumentAIWorkflowAssignRequest(BaseModel):
    document_id: Optional[int] = None
    document_type: Optional[str] = None
    department: Optional[str] = None
    reviewer_ids: Optional[List[int]] = None


class DocumentAIWorkflowAssignResponse(BaseModel):
    recommended: List[DocumentAIReviewer] = []
    backup: List[DocumentAIReviewer] = []
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAIWorkflowProgressRequest(BaseModel):
    document_id: Optional[int] = None


class DocumentAIWorkflowProgressResponse(BaseModel):
    next_step: Optional[str] = None
    automation: List[str] = []
    blockers: List[str] = []
    notes: List[str] = []
    raw: Optional[str] = None


class DocumentAIWorkflowTimelineRequest(BaseModel):
    document_id: Optional[int] = None
    sla_days: Optional[int] = None


class DocumentAIWorkflowTimelineResponse(BaseModel):
    estimated_completion: Optional[str] = None
    phase_estimates: List[Dict[str, Any]] = []
    risk_level: Optional[str] = None
    confidence: Optional[float] = None
    notes: List[str] = []
    raw: Optional[str] = None

# Questionnaire Schemas

class QuestionBase(BaseModel):
    question_text: str
    question_type: QuestionType
    is_required: bool = False
    order_index: int
    options: Optional[List[str]] = None
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    scoring_weight: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    matrix_config: Optional[Dict[str, Any]] = None
    conditional_question_id: Optional[int] = None
    conditional_operator: Optional[str] = None
    conditional_value: Optional[str] = None
    show_if_condition_met: bool = True

class QuestionCreate(QuestionBase):
    pass

class QuestionResponse(QuestionBase):
    id: int
    questionnaire_id: int
    created_at: datetime
    ai_metadata: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class QuestionnaireBase(BaseModel):
    title: str
    description: Optional[str] = None
    questionnaire_type: QuestionnaireType = QuestionnaireType.ASSESSMENT
    allow_anonymous: bool = False
    allow_multiple_responses: bool = False
    show_progress: bool = True
    randomize_questions: bool = False
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    access_level: AccessLevel = AccessLevel.INTERNAL
    target_roles: Optional[List[str]] = None
    target_departments: Optional[List[int]] = None
    linked_document_id: Optional[int] = None
    trigger_on_document_access: bool = False

class QuestionnaireCreate(QuestionnaireBase):
    questions: List[QuestionCreate] = []

class QuestionnaireUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[QuestionnaireStatus] = None
    questionnaire_type: Optional[QuestionnaireType] = None
    allow_anonymous: Optional[bool] = None
    allow_multiple_responses: Optional[bool] = None
    show_progress: Optional[bool] = None
    randomize_questions: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    access_level: Optional[AccessLevel] = None
    target_roles: Optional[List[str]] = None
    target_departments: Optional[List[int]] = None

class QuestionnaireResponse(QuestionnaireBase):
    id: int
    status: QuestionnaireStatus
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    last_ai_run_at: Optional[datetime] = None
    questions: List[QuestionResponse] = []
    
    class Config:
        from_attributes = True

class AnswerCreate(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    answer_number: Optional[float] = None
    answer_date: Optional[datetime] = None
    answer_boolean: Optional[bool] = None
    selected_options: Optional[List[str]] = None

class AnswerResponse(AnswerCreate):
    id: int
    response_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuestionnaireResponseCreate(BaseModel):
    questionnaire_id: int
    answers: List[AnswerCreate]

class QuestionnaireResponseDetail(BaseModel):
    id: int
    questionnaire_id: int
    respondent_id: Optional[int] = None
    session_id: str
    is_complete: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
    time_spent_seconds: Optional[int] = None
    answers: List[AnswerResponse] = []
    
    class Config:
        from_attributes = True

class QuestionnaireStats(BaseModel):
    total_responses: int
    completed_responses: int
    completion_rate: Optional[float] = None
    average_completion_time: Optional[int] = None
    unique_visitors: int
    bounce_rate: Optional[float] = None


# --- AI Assist Schemas ---


class QuestionSuggestionRequest(BaseModel):
    questionnaire_type: QuestionnaireType
    focus_area: Optional[str] = None
    keywords: Optional[List[str]] = None
    existing_questions: Optional[List[str]] = None


class QuestionSuggestion(BaseModel):
    suggestion: str
    rationale: str
    question_type: QuestionType
    answer_guidance: Optional[List[str]] = None


class QuestionSuggestionResponse(BaseModel):
    questionnaire_type: QuestionnaireType
    suggestions: List[QuestionSuggestion]


class QuestionQualityRequest(BaseModel):
    question_text: str
    question_type: QuestionType
    answer_options: Optional[List[str]] = None
    questionnaire_type: Optional[QuestionnaireType] = None


class BiasFlag(BaseModel):
    phrase: str
    reason: str
    suggestion: str


class QuestionQualityResponse(BaseModel):
    clarity_score: int
    complexity_score: int
    bias_flags: List[BiasFlag]
    improvements: List[str]


class QuestionnaireAIAnalysis(BaseModel):
    questionnaire_id: int
    overall_score: int
    strength_summary: List[str]
    risk_summary: List[str]
    recommendations: List[str]


class ResponseInsight(BaseModel):
    label: str
    value: str
    status: Literal["info", "warning", "success", "danger"] = "info"


class ResponseAIInsights(BaseModel):
    questionnaire_id: int
    quality_score: int
    predicted_completion_time: Optional[int] = None
    anomalies: List[str] = Field(default_factory=list)
    follow_up_recommendations: List[str] = Field(default_factory=list)
    highlights: List[ResponseInsight] = Field(default_factory=list)


class AnswerOptionRequest(BaseModel):
    question_text: str
    questionnaire_type: Optional[QuestionnaireType] = None
    desired_count: int = Field(default=4, ge=2, le=8)


class AnswerOptionResponse(BaseModel):
    options: List[str]

# Password Reset and MFA Schemas

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class MFASetupRequest(BaseModel):
    password: str

class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]

class MFAVerifyRequest(BaseModel):
    secret: str
    verification_code: str
    backup_codes: List[str]

class MFALoginRequest(BaseModel):
    username: str
    password: str
    mfa_code: str

class MFAStatusResponse(BaseModel):
    enabled: bool
    methods: List[str] = []




# ======== Team Members ========
class FMEATeamMemberCreate(BaseModel):
    user_id: int
    role: Optional[str] = None


class FMEATeamMemberOut(BaseModel):
    id: int
    user_id: int
    role: Optional[str]

    class Config:
        from_attributes = True


# ======== FMEA Core ========
class FMEABase(BaseModel):
    title: str = Field(..., max_length=200)
    fmea_type: FMEAType
    process_or_product_name: str = Field(..., max_length=200)
    description: Optional[str] = None
    departments: Optional[list[str]] = None  # stored as CSV server-side
    team_lead_id: int
    review_date: date
    standard: Optional[str] = Field(default=None, max_length=50)
    scope: str
    assumptions: Optional[str] = None

    # Scales (default 1-10)
    severity_min: conint(ge=1) = 1
    severity_max: conint(ge=1) = 10
    occurrence_min: conint(ge=1) = 1
    occurrence_max: conint(ge=1) = 10
    detection_min: conint(ge=1) = 1
    detection_max: conint(ge=1) = 10


class FMEACreate(FMEABase):
    team_members: list[FMEATeamMemberCreate]


class FMEAUpdate(BaseModel):
    title: Optional[str] = None
    fmea_type: Optional[FMEAType] = None
    process_or_product_name: Optional[str] = None
    description: Optional[str] = None
    departments: Optional[list[str]] = None
    team_lead_id: Optional[int] = None
    review_date: Optional[date] = None
    standard: Optional[str] = None
    scope: Optional[str] = None
    assumptions: Optional[str] = None
    status: Optional[FMEAStatus] = None
    # scale tweaks
    severity_min: Optional[int] = None
    severity_max: Optional[int] = None
    occurrence_min: Optional[int] = None
    occurrence_max: Optional[int] = None
    detection_min: Optional[int] = None
    detection_max: Optional[int] = None


class FMEAOut(FMEABase):
    id: int
    status: FMEAStatus
    highest_rpn: int
    actions_count: int
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    team_members: list[FMEATeamMemberOut]

    class Config:
        from_attributes = True


# ======== FMEA Items (Worksheet Rows) ========
class FMEAItemBase(BaseModel):
    item_function: str = Field(..., max_length=255)
    failure_mode: str = Field(..., max_length=255)
    effects: Optional[str] = None
    severity: conint(ge=1, le=10)
    causes: Optional[str] = None
    occurrence: conint(ge=1, le=10)
    current_controls: Optional[str] = None
    detection: conint(ge=1, le=10)
    recommended_actions: Optional[str] = None
    responsibility_user_id: Optional[int] = None
    target_date: Optional[date] = None
    actions_taken: Optional[str] = None
    status: Optional[Literal["Open", "In Progress", "Completed"]] = "Open"

    # Post-mitigation
    new_severity: Optional[int] = None
    new_occurrence: Optional[int] = None
    new_detection: Optional[int] = None


class FMEAItemCreate(FMEAItemBase):
    pass


class FMEAItemUpdate(BaseModel):
    item_function: Optional[str] = None
    failure_mode: Optional[str] = None
    effects: Optional[str] = None
    severity: Optional[int] = None
    causes: Optional[str] = None
    occurrence: Optional[int] = None
    current_controls: Optional[str] = None
    detection: Optional[int] = None
    recommended_actions: Optional[str] = None
    responsibility_user_id: Optional[int] = None
    target_date: Optional[date] = None
    actions_taken: Optional[str] = None
    status: Optional[Literal["Open", "In Progress", "Completed"]] = None
    new_severity: Optional[int] = None
    new_occurrence: Optional[int] = None
    new_detection: Optional[int] = None


class FMEAItemOut(FMEAItemBase):
    id: int
    rpn: int
    new_rpn: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ======== Actions ========
class FMEAActionBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    owner_user_id: int
    status: ActionStatus = ActionStatus.OPEN
    due_date: Optional[date] = None
    item_id: Optional[int] = None


class FMEAActionCreate(FMEAActionBase):
    pass


class FMEAActionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_user_id: Optional[int] = None
    status: Optional[ActionStatus] = None
    due_date: Optional[date] = None


class FMEAActionOut(FMEAActionBase):
    id: int

    class Config:
        from_attributes = True


# ======== Dashboard / Summaries ========
class FMEADashboardSummary(BaseModel):
    total_fmeas: int
    high_rpn_items: int
    completed_actions: int
    overdue_actions: int



# --- Incident Management Schemas ---


class IncidentAttachmentInput(BaseModel):
    file_name: str = Field(..., max_length=255)
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = Field(default=None, ge=0)
    description: Optional[str] = None


class IncidentAttachmentResponse(IncidentAttachmentInput):
    id: int
    uploaded_by_id: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class IncidentRootCauseFactorInput(BaseModel):
    description: str
    category: str
    impact_level: IncidentSeverity


class IncidentRootCauseFactorResponse(IncidentRootCauseFactorInput):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentInvestigationActivityInput(BaseModel):
    activity_time: datetime
    activity_type: InvestigationActivityType
    investigator_id: Optional[int] = None
    description: Optional[str] = None
    findings: Optional[str] = None
    evidence_url: Optional[str] = None
    follow_up_required: bool = False


class IncidentInvestigationActivityResponse(IncidentInvestigationActivityInput):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentInvestigationDetail(BaseModel):
    status: IncidentStatus
    priority: IncidentPriority
    assigned_investigator_id: Optional[int] = None
    investigation_team_ids: List[int] = Field(default_factory=list)
    target_resolution_date: Optional[date] = None
    actual_resolution_date: Optional[date] = None
    rca_method: Optional[str] = None
    primary_root_cause: Optional[str] = None
    rca_notes: Optional[str] = None
    ai_guidance: Optional[Dict[str, Any]] = None
    root_cause_factors: List[IncidentRootCauseFactorResponse] = Field(default_factory=list)
    activities: List[IncidentInvestigationActivityResponse] = Field(default_factory=list)


class IncidentInvestigationUpdate(BaseModel):
    status: Optional[IncidentStatus] = None
    priority: Optional[IncidentPriority] = None
    assigned_investigator_id: Optional[int] = None
    investigation_team_ids: Optional[List[int]] = None
    target_resolution_date: Optional[date] = None
    actual_resolution_date: Optional[date] = None
    rca_method: Optional[str] = None
    primary_root_cause: Optional[str] = None
    rca_notes: Optional[str] = None
    root_cause_factors: Optional[List[IncidentRootCauseFactorInput]] = None


class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=200)
    incident_type: str
    incident_category: Optional[str] = None
    department_id: Optional[int] = None
    location_path: Optional[Dict[str, Any]] = None
    occurred_at: datetime
    reported_at: Optional[datetime] = None
    severity: IncidentSeverity
    impact_assessment: str
    immediate_actions: Optional[str] = None
    detailed_description: str
    what_happened: str
    root_cause: Optional[str] = None
    contributing_factors: Optional[str] = None
    people_involved_ids: List[int] = Field(default_factory=list)
    witness_ids: List[int] = Field(default_factory=list)
    equipment_involved: Optional[str] = None
    immediate_notification_ids: List[int] = Field(default_factory=list)
    escalation_path: Optional[List[str]] = None
    external_notifications: List[str] = Field(default_factory=list)
    public_disclosure_required: bool = False
    attachments: List[IncidentAttachmentInput] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    incident_type: Optional[str] = None
    incident_category: Optional[str] = None
    department_id: Optional[int] = None
    location_path: Optional[Dict[str, Any]] = None
    occurred_at: Optional[datetime] = None
    reported_at: Optional[datetime] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    priority: Optional[IncidentPriority] = None
    impact_assessment: Optional[str] = None
    immediate_actions: Optional[str] = None
    detailed_description: Optional[str] = None
    what_happened: Optional[str] = None
    root_cause: Optional[str] = None
    contributing_factors: Optional[str] = None
    people_involved_ids: Optional[List[int]] = None
    witness_ids: Optional[List[int]] = None
    equipment_involved: Optional[str] = None
    immediate_notification_ids: Optional[List[int]] = None
    escalation_path: Optional[List[str]] = None
    external_notifications: Optional[List[str]] = None
    public_disclosure_required: Optional[bool] = None


class IncidentSummaryCards(BaseModel):
    total_incidents: int
    open_incidents: int
    resolved_this_month: int
    average_resolution_time_hours: Optional[float]
    overdue_incidents: int
    trend_direction: Literal["up", "down", "flat"]
    trend_change_percentage: Optional[float] = None


class IncidentTrendPoint(BaseModel):
    period: str
    open_count: int
    resolved_count: int
    predicted_count: Optional[int] = None


class IncidentCategoryBreakdown(BaseModel):
    category: str
    count: int


class IncidentSeverityBreakdown(BaseModel):
    severity: IncidentSeverity
    count: int


class IncidentDepartmentPerformance(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    average_resolution_hours: Optional[float] = None
    open_count: int = 0


class IncidentAIInsights(BaseModel):
    narrative: str
    forecast_next_month: int
    confidence: float
    alerts: List[str] = Field(default_factory=list)
    resource_recommendations: List[str] = Field(default_factory=list)


class IncidentAnalytics(BaseModel):
    trend: List[IncidentTrendPoint]
    categories: List[IncidentCategoryBreakdown]
    severity: List[IncidentSeverityBreakdown]
    department_performance: List[IncidentDepartmentPerformance]
    ai: IncidentAIInsights


class IncidentListItem(BaseModel):
    id: int
    incident_code: str
    title: str
    status: IncidentStatus
    severity: IncidentSeverity
    priority: IncidentPriority
    department_name: Optional[str] = None
    occurred_at: datetime
    reported_at: datetime
    overdue: bool
    assigned_investigator_id: Optional[int] = None


class IncidentDetail(BaseModel):
    id: int
    incident_code: str
    title: str
    incident_type: str
    incident_category: Optional[str]
    department_id: Optional[int]
    location_path: Optional[Dict[str, Any]]
    occurred_at: datetime
    reported_at: datetime
    severity: IncidentSeverity
    status: IncidentStatus
    priority: IncidentPriority
    impact_assessment: str
    immediate_actions: Optional[str]
    detailed_description: str
    what_happened: str
    root_cause: Optional[str]
    contributing_factors: Optional[str]
    people_involved_ids: List[int]
    witness_ids: List[int]
    equipment_involved: Optional[str]
    immediate_notification_ids: List[int]
    escalation_path: Optional[List[str]]
    external_notifications: List[str]
    public_disclosure_required: bool
    resolved_at: Optional[datetime]
    created_by_id: int
    attachments: List[IncidentAttachmentResponse]
    investigation: Optional[IncidentInvestigationDetail]
    ai_metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class IncidentListResponse(BaseModel):
    items: List[IncidentListItem]
    total: int


class IncidentDashboardResponse(BaseModel):
    last_refreshed: datetime
    summary: IncidentSummaryCards
    analytics: IncidentAnalytics


class IncidentDepartmentOption(BaseModel):
    id: int
    name: str
    site: Optional[str] = None


class IncidentUserOption(BaseModel):
    id: int
    name: str
    role: Optional[str] = None


class IncidentLocationOption(BaseModel):
    id: int
    label: str


class IncidentOptionsResponse(BaseModel):
    incident_types: List[str]
    incident_categories: Dict[str, List[str]]
    departments: List[IncidentDepartmentOption]
    locations: List[IncidentLocationOption]
    users: List[IncidentUserOption]


class IncidentTrendForecastRequest(BaseModel):
    history: List[IncidentTrendPoint]
    include_recent_alerts: bool = True


class IncidentTrendForecastResponse(BaseModel):
    projections: List[IncidentTrendPoint]
    narrative: str
    confidence: float
    alerts: List[str] = Field(default_factory=list)


class IncidentClassificationRequest(BaseModel):
    title: str
    incident_type: str
    description: str
    impact_assessment: Optional[str] = None


class IncidentClassificationResponse(BaseModel):
    suggested_category: str
    rationale: str


class IncidentSeverityAssessmentRequest(BaseModel):
    description: str
    impact_assessment: Optional[str] = None
    immediate_actions: Optional[str] = None


class IncidentSeverityAssessmentResponse(BaseModel):
    recommended_severity: IncidentSeverity
    confidence: float
    indicators: List[str] = Field(default_factory=list)


class IncidentResourceSuggestionRequest(BaseModel):
    severity: IncidentSeverity
    department_name: Optional[str] = None
    open_incident_count: int = 0
    severity_distribution: Optional[Dict[IncidentSeverity, int]] = None


class IncidentResourceSuggestionResponse(BaseModel):
    recommended_headcount: int
    shift_guidance: str
    specialist_support: List[str] = Field(default_factory=list)


class IncidentDuplicateDetectionRequest(BaseModel):
    title: str
    description: str
    occurred_at: datetime


class IncidentDuplicateMatch(BaseModel):
    incident_id: int
    incident_code: str
    title: str
    similarity: float
    occurred_at: datetime


class IncidentDuplicateDetectionResponse(BaseModel):
    matches: List[IncidentDuplicateMatch]


class IncidentInvestigationInsightsRequest(BaseModel):
    incident_id: Optional[int] = None
    incident_type: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    description: Optional[str] = None
    contributing_factors: Optional[str] = None


class IncidentInvestigationInsightsResponse(BaseModel):
    recommended_rca_methods: List[str]
    suggested_primary_cause: Optional[str]
    contributing_factors: List[str]
    timeline_guidance: List[str]


class IncidentTimelineRequest(BaseModel):
    incident_type: str
    severity: IncidentSeverity
    occurred_at: datetime


class IncidentTimelineResponse(BaseModel):
    target_resolution_date: date
    timeline_guidance: List[str]
    priority_rationale: str


class IncidentEscalationRequest(BaseModel):
    severity: IncidentSeverity
    department_id: Optional[int] = None


class IncidentEscalationResponse(BaseModel):
    steps: List[str]


# --- Calendar & Project Timeline Schemas ---

# Mirror the Enum values used in models
class EventType(str, Enum):
    AUDIT = "Audit"
    RISK_ASSESSMENT = "Risk Assessment"
    TRAINING = "Training Session"
    COMPLIANCE_REVIEW = "Compliance Review"
    DOCUMENT_REVIEW = "Document Review"
    INCIDENT_INVESTIGATION = "Incident Investigation"
    MEETING = "Meeting"
    DEADLINE = "Deadline"
    OTHER = "Other"

class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class EventStatus(str, Enum):
    SCHEDULED = "Scheduled"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class AttendeeStatus(str, Enum):
    INVITED = "Invited"
    ACCEPTED = "Accepted"
    DECLINED = "Declined"
    TENTATIVE = "Tentative"

class ReminderMethod(str, Enum):
    EMAIL = "Email"
    SMS = "SMS"
    PUSH = "Push"

class ProjectStatus(str, Enum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    ON_HOLD = "On Hold"
    COMPLETED = "Completed"

class TaskPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

# Reminders
class ReminderCreate(BaseModel):
    minutes_before: int = Field(ge=0, le=10080, default=30)  # up to 7 days
    method: ReminderMethod = ReminderMethod.EMAIL
    custom_message: Optional[str] = None

class ReminderOut(ReminderCreate):
    id: int

# Attendees
class AttendeeCreate(BaseModel):
    user_id: Optional[int] = None
    email: Optional[EmailStr] = None
    required: bool = True

class AttendeeOut(BaseModel):
    id: int
    user_id: Optional[int]
    email: Optional[EmailStr]
    required: bool
    status: AttendeeStatus

# Events
class EventBase(BaseModel):
    title: str
    type: EventType
    description: Optional[str] = None
    location: Optional[str] = None
    virtual_meeting_link: Optional[AnyUrl] = None
    department_ids: Optional[List[int]] = None
    equipment: Optional[List[str]] = None
    meeting_room: Optional[str] = None
    catering_required: bool = False
    priority: Priority = Priority.MEDIUM
    status: EventStatus = EventStatus.SCHEDULED
    all_day: bool = False
    tz: str = "UTC"
    start_at: datetime
    end_at: datetime
    rrule: Optional[str] = None
    send_invitations: bool = True

class EventCreate(EventBase):
    attendees: Optional[List[AttendeeCreate]] = None
    # reminders: Optional[List[ReminderCreate]] = None
    reminders: Optional[List[Union[int, ReminderCreate]]] = None

class EventUpdate(BaseModel):
    title: Optional[str]
    type: Optional[EventType]
    description: Optional[str]
    location: Optional[str]
    virtual_meeting_link: Optional[AnyUrl]
    department_ids: Optional[List[int]]
    equipment: Optional[List[str]]
    meeting_room: Optional[str]
    catering_required: Optional[bool]
    priority: Optional[Priority]
    status: Optional[EventStatus]
    all_day: Optional[bool]
    tz: Optional[str]
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    rrule: Optional[str]
    send_invitations: Optional[bool]

    # full replace for attendees/reminders when provided
    attendees: Optional[List[AttendeeCreate]] = None
    # reminders: Optional[List[ReminderCreate]] = None
    reminders: Optional[List[Union[int, ReminderCreate]]] = None

class EventOut(EventBase):
    id: int
    title: str
    start: datetime
    end: datetime
    all_day: bool
    organizer_id: int
    status: str
    location: Optional[str] = None
    description: Optional[str] = None
    attendees: List[AttendeeOut] = []
    reminders: List[ReminderOut] = []
    created_at: datetime
    updated_at: datetime
    cancelled_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Dashboard stats (simple)
class CalendarStats(BaseModel):
    total: int
    upcoming: int
    in_progress: int
    completed: int
    overdue: int
    by_type: dict
    by_priority: dict

# --- Projects / Tasks ---
class TaskDependencyIn(BaseModel):
    predecessor_id: int

class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    start_date: datetime
    end_date: datetime
    duration_hours: Optional[float] = None
    progress: float = 0.0
    priority: TaskPriority = TaskPriority.MEDIUM

class TaskCreate(TaskBase):
    dependencies: Optional[List[TaskDependencyIn]] = None

class TaskUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    assigned_to_id: Optional[int]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    duration_hours: Optional[float]
    progress: Optional[float]
    priority: Optional[TaskPriority]

class TaskOut(TaskBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: int
    status: ProjectStatus = ProjectStatus.PLANNING
    start_date: datetime
    end_date: datetime

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    manager_id: Optional[int]
    status: Optional[ProjectStatus]
    start_date: Optional[datetime]
    end_date: Optional[datetime]

class ProjectOut(ProjectBase):
    id: int
    overall_progress: float
    # tasks: List[TaskOut] = []  # optional if you want embedded
    class Config:
        from_attributes = True


# --- Audit Builder ---


class AuditWizardDepartmentOption(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class AuditWizardUserOption(BaseModel):
    id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

    class Config:
        from_attributes = True


class AuditWizardOptions(BaseModel):
    departments: List[AuditWizardDepartmentOption]
    users: List[AuditWizardUserOption]

class AuditChecklistQuestionBase(BaseModel):
    question_text: str
    question_type: AuditQuestionType
    evidence_required: bool = False
    scoring_weight: int = 0
    risk_impact: RiskLevel = RiskLevel.MEDIUM
    guidance_notes: Optional[str] = None
    order_index: Optional[int] = None


class AuditChecklistQuestionCreate(AuditChecklistQuestionBase):
    pass


class AuditChecklistQuestion(AuditChecklistQuestionBase):
    id: int

    class Config:
        from_attributes = True


class AuditChecklistSectionBase(BaseModel):
    title: str
    description: Optional[str] = None
    weight: int = 0
    is_required: bool = False
    order_index: Optional[int] = None


class AuditChecklistSectionCreate(AuditChecklistSectionBase):
    questions: List[AuditChecklistQuestionCreate] = []


class AuditChecklistSection(AuditChecklistSectionBase):
    id: int
    questions: List[AuditChecklistQuestion] = []

    class Config:
        from_attributes = True


class AuditNotificationSettings(BaseModel):
    audit_announcement: bool = True
    daily_reminders: bool = False
    progress_updates: bool = True
    completion_notifications: bool = True


class AuditEmailTemplates(BaseModel):
    audit_announcement: Optional[str] = None
    daily_reminder: Optional[str] = None
    completion_notice: Optional[str] = None


class AuditResourceAllocation(BaseModel):
    user_id: int
    user_name: Optional[str] = None
    allocated_hours: int
    role: Optional[str] = None


class AuditTimelineEntry(BaseModel):
    phase: str
    start_date: date
    end_date: date
    completion: Optional[int] = None


class AuditBase(BaseModel):
    title: str = Field(..., max_length=200)
    audit_type: AuditType
    risk_level: RiskLevel = RiskLevel.MEDIUM
    departments: List[int] = Field(default_factory=list)
    scope: str = Field(..., max_length=1000)
    objective: str = Field(..., max_length=1000)
    compliance_frameworks: List[str] = Field(default_factory=list)
    planned_start_date: date
    planned_end_date: date
    estimated_duration_hours: int = 0
    lead_auditor_id: int
    audit_team_ids: List[int] = Field(default_factory=list)
    external_auditors: Optional[str] = None
    auditee_contact_ids: List[int] = Field(default_factory=list)
    meeting_room: Optional[str] = None
    special_requirements: Optional[str] = None
    notification_settings: AuditNotificationSettings = AuditNotificationSettings()
    email_templates: AuditEmailTemplates = AuditEmailTemplates()
    distribution_list_ids: List[int] = Field(default_factory=list)
    cc_list: List[str] = Field(default_factory=list)
    bcc_list: List[str] = Field(default_factory=list)
    launch_option: str = "draft"
    resource_allocation: List[AuditResourceAllocation] = Field(default_factory=list)
    timeline: List[AuditTimelineEntry] = Field(default_factory=list)


class AuditCreate(AuditBase):
    sections: List[AuditChecklistSectionCreate] = Field(default_factory=list)


class AuditUpdate(BaseModel):
    title: Optional[str] = None
    audit_type: Optional[AuditType] = None
    risk_level: Optional[RiskLevel] = None
    status: Optional[AuditStatus] = None
    departments: Optional[List[int]] = None
    scope: Optional[str] = None
    objective: Optional[str] = None
    compliance_frameworks: Optional[List[str]] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    estimated_duration_hours: Optional[int] = None
    lead_auditor_id: Optional[int] = None
    audit_team_ids: Optional[List[int]] = None
    external_auditors: Optional[str] = None
    auditee_contact_ids: Optional[List[int]] = None
    meeting_room: Optional[str] = None
    special_requirements: Optional[str] = None
    notification_settings: Optional[AuditNotificationSettings] = None
    email_templates: Optional[AuditEmailTemplates] = None
    distribution_list_ids: Optional[List[int]] = None
    cc_list: Optional[List[str]] = None
    bcc_list: Optional[List[str]] = None
    launch_option: Optional[str] = None
    sections: Optional[List[AuditChecklistSectionCreate]] = None
    resource_allocation: Optional[List[AuditResourceAllocation]] = None
    timeline: Optional[List[AuditTimelineEntry]] = None


class Audit(AuditBase):
    id: int
    status: AuditStatus
    progress: int
    created_at: datetime
    updated_at: datetime
    lead_auditor_name: Optional[str] = None
    department_names: List[str] = Field(default_factory=list)
    sections: List[AuditChecklistSection] = Field(default_factory=list)

    class Config:
        from_attributes = True


class AuditListItem(BaseModel):
    id: int
    title: str
    audit_type: AuditType
    departments: List[str]
    start_date: date
    end_date: date
    status: AuditStatus
    progress: int
    lead_auditor: str
    risk_level: RiskLevel


class AuditCalendarEvent(BaseModel):
    id: int
    audit_id: int
    title: str
    start_date: date
    end_date: date
    status: AuditStatus
    audit_type: AuditType
    lead_auditor: str
    department_names: List[str] = Field(default_factory=list)
    risk_level: RiskLevel
    quick_actions: List[str] = Field(default_factory=list)


class AuditPlanningSummary(BaseModel):
    total_audits: int
    scheduled: int
    in_progress: int
    completed: int
    overdue: int
    average_progress: float


class AuditAIRecommendations(BaseModel):
    intelligent_schedule: List[str] = Field(default_factory=list)
    resource_allocation: List[str] = Field(default_factory=list)
    duration_predictions: List[str] = Field(default_factory=list)


class AuditPlanningDashboard(BaseModel):
    calendar_events: List[AuditCalendarEvent] = Field(default_factory=list)
    legend: dict = Field(default_factory=dict)
    audits: List[AuditListItem] = Field(default_factory=list)
    summary: AuditPlanningSummary
    ai_recommendations: AuditAIRecommendations


AuditPlanTaskStatus = Literal["not_started", "in_progress", "completed"]


class AuditPlanMilestone(BaseModel):
    name: str
    start_date: date
    end_date: date
    status: AuditStatus


class AuditPlanTask(BaseModel):
    name: str
    owner: str
    due_date: date
    status: AuditPlanTaskStatus


class AuditPlanResource(BaseModel):
    role: str
    name: str
    allocated_hours: int = 0


class AuditPlanDetail(BaseModel):
    id: int
    title: str
    audit_type: AuditType
    status: AuditStatus
    risk_level: RiskLevel
    lead_auditor: str
    departments: List[str] = Field(default_factory=list)
    start_date: date
    end_date: date
    objectives: List[str] = Field(default_factory=list)
    scope: str
    milestones: List[AuditPlanMilestone] = Field(default_factory=list)
    tasks: List[AuditPlanTask] = Field(default_factory=list)
    resources: List[AuditPlanResource] = Field(default_factory=list)
    notes: str
    progress: int
    compliance_frameworks: List[str] = Field(default_factory=list)


class AuditBasicInfoAIRequest(BaseModel):
    audit_type: AuditType
    departments: List[str]
    scope: Optional[str] = None
    historical_risks: Optional[List[str]] = None


class AuditBasicInfoAIResponse(BaseModel):
    suggested_scope: str
    suggested_objective: str
    suggested_compliance_frameworks: List[str]
    predicted_risk_level: RiskLevel
    rationale: str


class AuditSchedulingAIRequest(BaseModel):
    audit_type: AuditType
    risk_level: RiskLevel
    start_date: date
    end_date: date
    lead_auditor_id: int
    team_member_ids: List[int] = Field(default_factory=list)
    auditee_contact_ids: List[int] = Field(default_factory=list)


class AuditSchedulingAIResponse(BaseModel):
    recommended_team: List[int]
    resource_conflicts: List[str]
    recommended_meeting_room: Optional[str]
    suggested_duration_hours: int
    allocation_plan: List[AuditResourceAllocation]


class AuditChecklistAIRequest(BaseModel):
    audit_type: AuditType
    compliance_frameworks: List[str]
    risk_level: RiskLevel


class AuditChecklistAIResponse(BaseModel):
    sections: List[AuditChecklistSectionCreate]
    recommendations: List[str]


class AuditNotificationAIRequest(BaseModel):
    audit_type: AuditType
    start_date: date
    end_date: date
    recipients: List[int]


class AuditNotificationAIResponse(BaseModel):
    notification_settings: AuditNotificationSettings
    email_templates: AuditEmailTemplates
    distribution_list_ids: List[int]
    cc_list: List[str]
    bcc_list: List[str]
    timing_recommendations: List[str]


class AuditReviewAIRequest(BaseModel):
    audit: AuditCreate


class AuditReviewAIResponse(BaseModel):
    validation_messages: List[str]
    optimisation_opportunities: List[str]
    predicted_success_probability: float
    launch_timing_recommendation: str


# ===== Risk Assessment Schemas =====


class RiskAssessmentScaleEntry(BaseModel):
    label: str
    description: str


class RiskAssessmentCategoryWeight(BaseModel):
    category_key: str
    display_name: str
    weight: int = Field(ge=0, le=100)
    order_index: int = 0
    baseline_guidance: Optional[str] = None


class RiskAssessmentCountryCategoryScore(BaseModel):
    id: int
    category_key: str
    category_name: str
    score: Optional[float] = None
    trend: Optional[RiskTrend] = None
    confidence: Optional[RiskConfidence] = None
    evidence: Optional[str] = None
    last_updated: Optional[datetime] = None
    update_source: Optional[RiskUpdateSource] = None


class RiskAssessmentCountryDetail(BaseModel):
    id: int
    country_code: str
    country_name: str
    overall_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    trend: Optional[RiskTrend] = None
    confidence: Optional[RiskConfidence] = None
    last_updated: Optional[datetime] = None
    update_source: Optional[RiskUpdateSource] = None
    evidence: Optional[str] = None
    comments: Optional[str] = None
    next_review_date: Optional[date] = None
    ai_generated: bool = False
    category_scores: List[RiskAssessmentCountryCategoryScore] = Field(default_factory=list)


class RiskAssessmentBase(BaseModel):
    title: str
    assessment_type: RiskAssessmentType
    assessment_framework: Optional[str] = None
    period_start: date
    period_end: date
    update_frequency: str
    scoring_scale: RiskScoringScale = RiskScoringScale.ONE_TO_HUNDRED
    custom_scoring_scale: Optional[str] = None
    impact_scale: List[RiskAssessmentScaleEntry] = Field(default_factory=list)
    probability_scale: List[RiskAssessmentScaleEntry] = Field(default_factory=list)
    categories: List[RiskAssessmentCategoryWeight] = Field(default_factory=list)
    ai_configuration: Optional[Dict[str, Any]] = None


class RiskAssessmentCreate(RiskAssessmentBase):
    country_codes: List[str]
    assigned_assessor_id: int
    review_team_ids: List[int] = Field(default_factory=list)


class RiskAssessmentUpdate(RiskAssessmentBase):
    review_team_ids: List[int] = Field(default_factory=list)


class RiskAssessmentListItem(BaseModel):
    id: int
    title: str
    assessment_type: RiskAssessmentType
    assessment_framework: Optional[str] = None
    status: str
    period_start: date
    period_end: date
    update_frequency: str
    country_count: int
    high_risk_countries: int
    updated_at: datetime


class RiskAssessmentDetail(RiskAssessmentListItem):
    scoring_scale: RiskScoringScale
    custom_scoring_scale: Optional[str] = None
    impact_scale: List[RiskAssessmentScaleEntry]
    probability_scale: List[RiskAssessmentScaleEntry]
    categories: List[RiskAssessmentCategoryWeight]
    assigned_assessor_id: int
    review_team_ids: List[int] = Field(default_factory=list)
    ai_configuration: Dict[str, Any] = Field(default_factory=dict)
    countries: List[RiskAssessmentCountryDetail] = Field(default_factory=list)


class RiskAssessmentSummaryCards(BaseModel):
    total_countries_assessed: int
    high_risk_countries: int
    recent_risk_changes: int
    next_assessment_due: Optional[date]


class RiskAssessmentMapCountry(BaseModel):
    country_code: str
    country_name: str
    overall_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    trend: Optional[RiskTrend] = None
    confidence: Optional[RiskConfidence] = None
    update_source: Optional[RiskUpdateSource] = None


class RiskAssessmentDashboardResponse(BaseModel):
    map_countries: List[RiskAssessmentMapCountry]
    summary: RiskAssessmentSummaryCards
    country_panels: List[RiskAssessmentCountryDetail] = Field(default_factory=list)
    ai_alerts: List[str] = Field(default_factory=list)
    last_refreshed: datetime


class RiskAssessmentCountryCategoryInput(BaseModel):
    category_key: str
    category_name: str
    score: Optional[float] = None
    trend: Optional[RiskTrend] = None
    confidence: Optional[RiskConfidence] = None
    evidence: Optional[str] = None
    update_source: Optional[RiskUpdateSource] = None


class RiskAssessmentCountryUpsert(BaseModel):
    country_code: str
    country_name: Optional[str] = None
    overall_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None
    trend: Optional[RiskTrend] = None
    confidence: Optional[RiskConfidence] = None
    update_source: Optional[RiskUpdateSource] = None
    evidence: Optional[str] = None
    comments: Optional[str] = None
    next_review_date: Optional[date] = None
    ai_generated: bool = False
    category_scores: List[RiskAssessmentCountryCategoryInput] = Field(default_factory=list)


class RiskAssessmentCountryResponse(RiskAssessmentCountryDetail):
    pass


class RiskAssessmentCountryListResponse(BaseModel):
    countries: List[RiskAssessmentCountryDetail]


class RiskAssessmentCountryOption(BaseModel):
    code: str
    name: str


class RiskAssessmentUserOption(BaseModel):
    id: int
    name: str
    role: str
    department: Optional[str] = None


class RiskAssessmentOptionsResponse(BaseModel):
    countries: List[RiskAssessmentCountryOption]
    users: List[RiskAssessmentUserOption]
    defaults: Dict[str, Any] = Field(default_factory=dict)


class RiskAIScoringCategory(BaseModel):
    category_key: str
    category_name: str
    score: float
    weight: Optional[int] = None
    trend: RiskTrend
    confidence: RiskConfidence


class RiskAIScoreCountryRequest(BaseModel):
    country_name: str
    categories: List[RiskAIScoringCategory]
    recent_events: List[str] = Field(default_factory=list)
    macro_indicators: Dict[str, float] = Field(default_factory=dict)


class RiskAIScoreCountryResponse(BaseModel):
    overall_score: float
    risk_level: RiskLevel
    predicted_trend: RiskTrend
    confidence: RiskConfidence
    insights: List[str] = Field(default_factory=list)
    alerts: List[str] = Field(default_factory=list)


class RiskAITrendForecastRequest(BaseModel):
    country_name: str
    historical_scores: List[float] = Field(default_factory=list)
    recent_events: List[str] = Field(default_factory=list)


class RiskAITrendForecastResponse(BaseModel):
    projected_score: float
    projected_level: RiskLevel
    predicted_trend: RiskTrend
    narrative: str
    alerts: List[str] = Field(default_factory=list)


class RiskAIWeightSuggestionRequest(BaseModel):
    assessment_type: RiskAssessmentType
    categories: List[str]
    industry: Optional[str] = None


class RiskAIWeightSuggestionResponse(BaseModel):
    weights: List[RiskAssessmentCategoryWeight]
    guidance: List[str]


# --- Corrective Action Schemas ---


class CorrectiveActionAttachment(BaseModel):
    file_name: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    uploaded_by_id: Optional[int] = None
    uploaded_at: Optional[datetime] = None


class CorrectiveActionStepInput(BaseModel):
    description: str
    responsible_person_id: Optional[int] = None
    due_date: Optional[date] = None
    resources_required: Optional[str] = None
    success_criteria: Optional[str] = None
    status: CorrectiveActionStepStatus = CorrectiveActionStepStatus.NOT_STARTED
    progress_notes: Optional[str] = None
    issues_obstacles: Optional[str] = None
    completion_date: Optional[date] = None
    evidence: List[CorrectiveActionAttachment] = Field(default_factory=list)


class CorrectiveActionStep(CorrectiveActionStepInput):
    id: int
    order_index: int
    responsible_person_name: Optional[str] = None


class CorrectiveActionUpdateInput(BaseModel):
    update_type: CorrectiveActionUpdateType
    description: str
    attachments: List[CorrectiveActionAttachment] = Field(default_factory=list)


class CorrectiveActionUpdate(CorrectiveActionUpdateInput):
    id: int
    created_at: datetime
    created_by_id: int
    created_by_name: Optional[str] = None


class CorrectiveActionMetricInput(BaseModel):
    metric_name: str
    target_value: Optional[str] = None
    actual_value: Optional[str] = None
    measurement_method: Optional[str] = None
    measurement_date: Optional[date] = None


class CorrectiveActionMetric(CorrectiveActionMetricInput):
    id: int


class CorrectiveActionAIInsights(BaseModel):
    effectiveness_score: Optional[float] = None
    predicted_rating: Optional[CorrectiveActionEffectivenessRating] = None
    risk_score: Optional[float] = None
    prioritized_level: Optional[CorrectiveActionPriority] = None
    success_probability: Optional[float] = None
    resource_recommendations: List[str] = Field(default_factory=list)
    escalation_recommendations: List[str] = Field(default_factory=list)
    timeline_advice: Optional[str] = None


class CorrectiveActionSummaryCards(BaseModel):
    total_actions: int
    open_actions: int
    overdue_actions: int
    completed_this_month: int
    average_effectiveness: Optional[float] = None
    trend_direction: Literal["up", "down", "steady"] = "steady"
    trend_delta: Optional[float] = None


class CorrectiveActionStatusSlice(BaseModel):
    status: CorrectiveActionStatus
    count: int


class CorrectiveActionDepartmentSlice(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    count: int


class CorrectiveActionTypeSlice(BaseModel):
    action_type: CorrectiveActionType
    count: int


class CorrectiveActionCompletionTrendPoint(BaseModel):
    period: str
    completed_count: int
    predicted_count: int


class CorrectiveActionAnalytics(BaseModel):
    status_distribution: List[CorrectiveActionStatusSlice] = Field(default_factory=list)
    department_distribution: List[CorrectiveActionDepartmentSlice] = Field(default_factory=list)
    type_distribution: List[CorrectiveActionTypeSlice] = Field(default_factory=list)
    completion_trend: List[CorrectiveActionCompletionTrendPoint] = Field(default_factory=list)


class PriorityActionItem(BaseModel):
    id: int
    action_code: str
    title: str
    priority: CorrectiveActionPriority
    impact: CorrectiveActionImpact
    urgency: CorrectiveActionUrgency
    status: CorrectiveActionStatus
    due_date: Optional[date] = None
    days_to_due: Optional[int] = None
    progress_percent: float
    owner_name: Optional[str] = None
    risk_score: Optional[float] = None


class CorrectiveActionPriorityLists(BaseModel):
    high_priority: List[PriorityActionItem] = Field(default_factory=list)
    overdue: List[PriorityActionItem] = Field(default_factory=list)
    due_this_week: List[PriorityActionItem] = Field(default_factory=list)
    recently_completed: List[PriorityActionItem] = Field(default_factory=list)


class CorrectiveActionDashboardResponse(BaseModel):
    summary: CorrectiveActionSummaryCards
    analytics: CorrectiveActionAnalytics
    priority_lists: CorrectiveActionPriorityLists
    ai_highlights: List[str] = Field(default_factory=list)
    last_refreshed: datetime


class CorrectiveActionListItem(BaseModel):
    id: int
    action_code: str
    title: str
    status: CorrectiveActionStatus
    priority: CorrectiveActionPriority
    impact: CorrectiveActionImpact
    urgency: CorrectiveActionUrgency
    due_date: Optional[date] = None
    progress_percent: float
    owner_name: Optional[str] = None
    effectiveness_score: Optional[float] = None


class CorrectiveActionListResponse(BaseModel):
    items: List[CorrectiveActionListItem]
    total: int


class CorrectiveActionDetail(BaseModel):
    id: int
    action_code: str
    title: str
    action_type: CorrectiveActionType
    source_reference: CorrectiveActionSource
    reference_id: Optional[str] = None
    department_ids: List[int]
    priority: CorrectiveActionPriority
    impact: CorrectiveActionImpact
    urgency: CorrectiveActionUrgency
    problem_statement: str
    root_cause: str
    contributing_factors: Optional[str] = None
    impact_assessment: str
    current_controls: Optional[str] = None
    evidence_files: List[CorrectiveActionAttachment] = Field(default_factory=list)
    corrective_action_description: str
    overall_due_date: date
    action_owner_id: int
    action_owner_name: Optional[str] = None
    review_team_ids: List[int] = Field(default_factory=list)
    review_team: List[str] = Field(default_factory=list)
    budget_required: Optional[float] = None
    approval_required: bool = False
    approver_id: Optional[int] = None
    approver_name: Optional[str] = None
    status: CorrectiveActionStatus
    progress_percent: float
    evaluation_due_date: Optional[date] = None
    evaluation_method: Optional[CorrectiveActionEvaluationMethod] = None
    effectiveness_rating: Optional[CorrectiveActionEffectivenessRating] = None
    evaluation_comments: Optional[str] = None
    further_actions_required: Optional[bool] = None
    follow_up_actions: Optional[str] = None
    ai_insights: Optional[CorrectiveActionAIInsights] = None
    steps: List[CorrectiveActionStep] = Field(default_factory=list)
    updates: List[CorrectiveActionUpdate] = Field(default_factory=list)
    metrics: List[CorrectiveActionMetric] = Field(default_factory=list)
    last_updated_at: datetime
    created_at: datetime


class CorrectiveActionCreate(BaseModel):
    title: str
    action_type: CorrectiveActionType
    source_reference: CorrectiveActionSource
    reference_id: Optional[str] = None
    department_ids: List[int]
    priority: CorrectiveActionPriority
    impact: CorrectiveActionImpact
    urgency: CorrectiveActionUrgency
    problem_statement: str
    root_cause: str
    contributing_factors: Optional[str] = None
    impact_assessment: str
    current_controls: Optional[str] = None
    evidence_files: List[CorrectiveActionAttachment] = Field(default_factory=list)
    corrective_action_description: str
    steps: List[CorrectiveActionStepInput] = Field(default_factory=list)
    overall_due_date: date
    action_owner_id: int
    review_team_ids: List[int] = Field(default_factory=list)
    budget_required: Optional[float] = None
    approval_required: bool = False
    approver_id: Optional[int] = None
    evaluation_due_date: Optional[date] = None
    evaluation_method: Optional[CorrectiveActionEvaluationMethod] = None
    success_metrics: List[CorrectiveActionMetricInput] = Field(default_factory=list)


class CorrectiveActionUpdatePayload(BaseModel):
    title: Optional[str] = None
    action_type: Optional[CorrectiveActionType] = None
    source_reference: Optional[CorrectiveActionSource] = None
    reference_id: Optional[str] = None
    department_ids: Optional[List[int]] = None
    priority: Optional[CorrectiveActionPriority] = None
    impact: Optional[CorrectiveActionImpact] = None
    urgency: Optional[CorrectiveActionUrgency] = None
    problem_statement: Optional[str] = None
    root_cause: Optional[str] = None
    contributing_factors: Optional[str] = None
    impact_assessment: Optional[str] = None
    current_controls: Optional[str] = None
    evidence_files: Optional[List[CorrectiveActionAttachment]] = None
    corrective_action_description: Optional[str] = None
    overall_due_date: Optional[date] = None
    action_owner_id: Optional[int] = None
    review_team_ids: Optional[List[int]] = None
    budget_required: Optional[float] = None
    approval_required: Optional[bool] = None
    approver_id: Optional[int] = None
    status: Optional[CorrectiveActionStatus] = None
    evaluation_due_date: Optional[date] = None
    evaluation_method: Optional[CorrectiveActionEvaluationMethod] = None
    effectiveness_rating: Optional[CorrectiveActionEffectivenessRating] = None
    evaluation_comments: Optional[str] = None
    further_actions_required: Optional[bool] = None
    follow_up_actions: Optional[str] = None
    progress_percent: Optional[float] = None


class CorrectiveActionOptionsResponse(BaseModel):
    action_types: List[CorrectiveActionType]
    source_references: List[CorrectiveActionSource]
    priority_levels: List[CorrectiveActionPriority]
    impact_levels: List[CorrectiveActionImpact]
    urgency_levels: List[CorrectiveActionUrgency]
    evaluation_methods: List[CorrectiveActionEvaluationMethod]
    step_statuses: List[CorrectiveActionStepStatus]
    update_types: List[CorrectiveActionUpdateType]
    departments: List[Dict[str, Any]]
    users: List[Dict[str, Any]]


class CorrectiveActionAIRequest(BaseModel):
    action_type: CorrectiveActionType
    priority: CorrectiveActionPriority
    impact: CorrectiveActionImpact
    urgency: CorrectiveActionUrgency
    problem_statement: str
    root_cause: str
    impact_assessment: str
    current_controls: Optional[str] = None
    existing_steps: List[CorrectiveActionStepInput] = Field(default_factory=list)


class CorrectiveActionAIResponse(BaseModel):
    insights: CorrectiveActionAIInsights
    recommended_steps: List[CorrectiveActionStepInput] = Field(default_factory=list)
    recommended_metrics: List[CorrectiveActionMetricInput] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# User Management Module Schemas
# ---------------------------------------------------------------------------


class UserManagementSummaryCards(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    pending_verification: int
    new_this_month: int
    average_tenure_days: float
    mfa_enabled_rate: float


class UserManagementStatusSlice(BaseModel):
    status: str
    count: int
    percentage: float


class UserManagementRoleSlice(BaseModel):
    role: UserRole
    count: int


class UserManagementDepartmentSlice(BaseModel):
    department_id: Optional[int] = None
    department_name: str
    count: int


class UserManagementGrowthTrendPoint(BaseModel):
    period: str
    user_count: int


class UserManagementAnalytics(BaseModel):
    status_distribution: List[UserManagementStatusSlice] = Field(default_factory=list)
    role_distribution: List[UserManagementRoleSlice] = Field(default_factory=list)
    department_distribution: List[UserManagementDepartmentSlice] = Field(default_factory=list)
    growth_trend: List[UserManagementGrowthTrendPoint] = Field(default_factory=list)


class UserManagementPriorityUser(BaseModel):
    id: int
    full_name: str
    role: UserRole
    department: Optional[str] = None
    last_login: Optional[datetime] = None
    risk_score: float
    mfa_enabled: bool
    status: str


class UserManagementPriorityLists(BaseModel):
    key_roles: List[UserManagementPriorityUser] = Field(default_factory=list)
    inactive_accounts: List[UserManagementPriorityUser] = Field(default_factory=list)
    pending_verification: List[UserManagementPriorityUser] = Field(default_factory=list)
    recently_added: List[UserManagementPriorityUser] = Field(default_factory=list)


class UserManagementAIInsights(BaseModel):
    workforce_health_score: float
    risk_alerts: List[str] = Field(default_factory=list)
    recommended_focus: List[str] = Field(default_factory=list)
    resource_recommendations: List[str] = Field(default_factory=list)
    narrative: str


class UserManagementDashboardResponse(BaseModel):
    summary: UserManagementSummaryCards
    analytics: UserManagementAnalytics
    priority_lists: UserManagementPriorityLists
    ai_summary: UserManagementAIInsights
    last_refreshed: datetime


class UserManagementListItem(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    department: Optional[str] = None
    status: str
    last_login: Optional[datetime] = None
    created_at: datetime
    risk_score: float
    mfa_enabled: bool


class UserManagementListResponse(BaseModel):
    items: List[UserManagementListItem]
    total: int


class UserManagementOnboardingStep(BaseModel):
    title: str
    status: str
    due_date: Optional[date] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class UserManagementActivity(BaseModel):
    timestamp: datetime
    activity_type: str
    description: str
    actor: Optional[str] = None


class UserManagementDetail(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    department: Optional[str] = None
    manager: Optional[str] = None
    permission_level: PermissionLevel
    is_active: bool
    is_verified: bool
    mfa_enabled: bool
    phone: Optional[str] = None
    position: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    areas_of_responsibility: List[str] = Field(default_factory=list)
    onboarding_progress: float
    onboarding_steps: List[UserManagementOnboardingStep] = Field(default_factory=list)
    engagement_score: float
    attrition_risk: float
    risk_level: str
    activity_timeline: List[UserManagementActivity] = Field(default_factory=list)
    access_insights: List[str] = Field(default_factory=list)


class UserManagementDepartmentOption(BaseModel):
    id: int
    name: str


class UserManagementManagerOption(BaseModel):
    id: int
    full_name: str
    role: UserRole


class UserManagementOptionsResponse(BaseModel):
    roles: List[UserRole]
    permission_levels: List[PermissionLevel]
    departments: List[UserManagementDepartmentOption]
    managers: List[UserManagementManagerOption]
    timezones: List[str]


class UserManagementOnboardingStepInput(BaseModel):
    title: str
    owner_role: Optional[str] = None
    due_in_days: Optional[int] = None
    notes: Optional[str] = None


class UserManagementCreate(BaseModel):
    email: EmailStr
    username: str
    first_name: str
    last_name: str
    role: UserRole
    password: Optional[str] = None
    department_id: Optional[int] = None
    permission_level: PermissionLevel = PermissionLevel.READER
    phone: Optional[str] = None
    position: Optional[str] = None
    employee_id: Optional[str] = None
    reporting_manager_id: Optional[int] = None
    areas_of_responsibility: List[str] = Field(default_factory=list)
    timezone: Optional[str] = None
    notifications_email: bool = True
    notifications_sms: bool = False
    is_active: bool = True
    is_verified: bool = False
    mfa_enabled: bool = False
    onboarding_steps: List[UserManagementOnboardingStepInput] = Field(default_factory=list)


class UserManagementUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    permission_level: Optional[PermissionLevel] = None
    phone: Optional[str] = None
    position: Optional[str] = None
    reporting_manager_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    mfa_enabled: Optional[bool] = None
    areas_of_responsibility: Optional[List[str]] = None


class UserManagementAIRequest(BaseModel):
    role: UserRole
    department: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    experience_level: Literal["junior", "mid", "senior"] = "mid"
    requires_mfa: bool = False
    remote_worker: bool = False
    tool_stack: List[str] = Field(default_factory=list)


class UserManagementAIResponse(BaseModel):
    insights: UserManagementAIInsights
    recommended_steps: List[UserManagementOnboardingStepInput] = Field(default_factory=list)
    recommended_permissions: List[str] = Field(default_factory=list)
    resource_recommendations: List[str] = Field(default_factory=list)
