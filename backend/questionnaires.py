from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional
import json
import uuid
from datetime import datetime

from database import get_db
from auth import get_current_user, require_role
from models import (
    User, UserRole, Questionnaire, Question, QuestionnaireResponse, 
    Answer, QuestionnaireAnalytics, QuestionType, QuestionnaireStatus,
    AccessLevel, Department, Site, Country
)
from schemas import (
    QuestionnaireCreate, QuestionnaireUpdate, QuestionnaireResponse as QuestionnaireResponseSchema,
    QuestionnaireResponseCreate, QuestionnaireResponseDetail, QuestionnaireStats,
    QuestionResponse, AnswerResponse
)

router = APIRouter()

def check_questionnaire_access(db: Session, questionnaire: Questionnaire, user: User, permission: str) -> bool:
    """Check if user has access to questionnaire based on company and role"""
    
    # Admin has all permissions
    if user.role == UserRole.ADMIN:
        return True
    
    # Check if user is questionnaire creator
    if questionnaire.created_by_id == user.id:
        return True
    
    # Check company-based access (same as documents)
    if user.department_id:
        user_department = db.query(Department).filter(Department.id == user.department_id).first()
        if user_department and user_department.site_id:
            user_site = db.query(Site).filter(Site.id == user_department.site_id).first()
            if user_site and user_site.country_id:
                user_country = db.query(Country).filter(Country.id == user_site.country_id).first()
                if user_country:
                    user_company_id = user_country.company_id
                    
                    # Get questionnaire creator's company
                    creator = db.query(User).filter(User.id == questionnaire.created_by_id).first()
                    if creator and creator.department_id:
                        creator_department = db.query(Department).filter(Department.id == creator.department_id).first()
                        if creator_department and creator_department.site_id:
                            creator_site = db.query(Site).filter(Site.id == creator_department.site_id).first()
                            if creator_site and creator_site.country_id:
                                creator_country = db.query(Country).filter(Country.id == creator_site.country_id).first()
                                if creator_country:
                                    creator_company_id = creator_country.company_id
                                    
                                    # Only allow access if users are from same company
                                    if user_company_id != creator_company_id:
                                        return False
    
    # Check target roles and departments
    if questionnaire.target_roles:
        target_roles = json.loads(questionnaire.target_roles)
        if user.role.value not in target_roles:
            return False
    
    if questionnaire.target_departments:
        target_departments = json.loads(questionnaire.target_departments)
        if user.department_id not in target_departments:
            return False
    
    # Check access level and permissions
    if questionnaire.access_level == AccessLevel.PUBLIC:
        return True
    elif questionnaire.access_level == AccessLevel.INTERNAL:
        return user.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.AUDITOR, UserRole.EMPLOYEE, UserRole.VIEWER]
    
    return False

@router.post("/", response_model=QuestionnaireResponseSchema)
async def create_questionnaire(
    questionnaire_data: QuestionnaireCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check permissions - only admins, managers can create questionnaires
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=403,
            detail="Only administrators and managers can create questionnaires"
        )
    
    # Create questionnaire
    questionnaire = Questionnaire(
        title=questionnaire_data.title,
        description=questionnaire_data.description,
        allow_anonymous=questionnaire_data.allow_anonymous,
        allow_multiple_responses=questionnaire_data.allow_multiple_responses,
        show_progress=questionnaire_data.show_progress,
        randomize_questions=questionnaire_data.randomize_questions,
        starts_at=questionnaire_data.starts_at,
        ends_at=questionnaire_data.ends_at,
        access_level=questionnaire_data.access_level,
        target_roles=json.dumps(questionnaire_data.target_roles) if questionnaire_data.target_roles else None,
        target_departments=json.dumps(questionnaire_data.target_departments) if questionnaire_data.target_departments else None,
        linked_document_id=questionnaire_data.linked_document_id,
        trigger_on_document_access=questionnaire_data.trigger_on_document_access,
        created_by_id=current_user.id
    )
    
    db.add(questionnaire)
    db.commit()
    db.refresh(questionnaire)
    
    # Create questions
    for question_data in questionnaire_data.questions:
        question = Question(
            questionnaire_id=questionnaire.id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            is_required=question_data.is_required,
            order_index=question_data.order_index,
            options=json.dumps(question_data.options) if question_data.options else None,
            min_value=question_data.min_value,
            max_value=question_data.max_value,
            placeholder=question_data.placeholder,
            help_text=question_data.help_text,
            conditional_question_id=question_data.conditional_question_id,
            conditional_operator=question_data.conditional_operator,
            conditional_value=question_data.conditional_value,
            show_if_condition_met=question_data.show_if_condition_met
        )
        db.add(question)
    
    db.commit()
    
    # Reload with questions
    questionnaire = db.query(Questionnaire).options(
        joinedload(Questionnaire.questions)
    ).filter(Questionnaire.id == questionnaire.id).first()
    
    return QuestionnaireResponseSchema.model_validate(questionnaire)

@router.get("/", response_model=List[QuestionnaireResponseSchema])
async def list_questionnaires(
    status: Optional[QuestionnaireStatus] = None,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Build query
    query = db.query(Questionnaire).options(joinedload(Questionnaire.questions))
    
    # Apply status filter
    if status:
        query = query.filter(Questionnaire.status == status)
    
    # Apply pagination
    offset = (page - 1) * size
    questionnaires = query.offset(offset).limit(size).all()
    
    # Filter by access permissions
    accessible_questionnaires = []
    for questionnaire in questionnaires:
        if check_questionnaire_access(db, questionnaire, current_user, "read"):
            accessible_questionnaires.append(questionnaire)
    
    return [QuestionnaireResponseSchema.model_validate(q) for q in accessible_questionnaires]

@router.get("/{questionnaire_id}", response_model=QuestionnaireResponseSchema)
async def get_questionnaire(
    questionnaire_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questionnaire = db.query(Questionnaire).options(
        joinedload(Questionnaire.questions)
    ).filter(Questionnaire.id == questionnaire_id).first()
    
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    if not check_questionnaire_access(db, questionnaire, current_user, "read"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return QuestionnaireResponseSchema.model_validate(questionnaire)

@router.put("/{questionnaire_id}", response_model=QuestionnaireResponseSchema)
async def update_questionnaire(
    questionnaire_id: int,
    update_data: QuestionnaireUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questionnaire = db.query(Questionnaire).filter(Questionnaire.id == questionnaire_id).first()
    
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    if not check_questionnaire_access(db, questionnaire, current_user, "edit"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        if field in ['target_roles', 'target_departments'] and value is not None:
            value = json.dumps(value)
        setattr(questionnaire, field, value)
    
    questionnaire.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(questionnaire)
    
    return QuestionnaireResponseSchema.model_validate(questionnaire)

@router.post("/{questionnaire_id}/responses", response_model=QuestionnaireResponseDetail)
async def submit_response(
    questionnaire_id: int,
    response_data: QuestionnaireResponseCreate,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questionnaire = db.query(Questionnaire).filter(Questionnaire.id == questionnaire_id).first()
    
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    # Check if questionnaire is active
    if questionnaire.status != QuestionnaireStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Questionnaire is not active")
    
    # Check time constraints
    now = datetime.utcnow()
    if questionnaire.starts_at and now < questionnaire.starts_at:
        raise HTTPException(status_code=400, detail="Questionnaire has not started yet")
    if questionnaire.ends_at and now > questionnaire.ends_at:
        raise HTTPException(status_code=400, detail="Questionnaire has ended")
    
    # Check if anonymous responses are allowed
    if not current_user and not questionnaire.allow_anonymous:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check for existing responses if multiple responses not allowed
    if current_user and not questionnaire.allow_multiple_responses:
        existing = db.query(QuestionnaireResponse).filter(
            QuestionnaireResponse.questionnaire_id == questionnaire_id,
            QuestionnaireResponse.respondent_id == current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Multiple responses not allowed")
    
    # Create response
    session_id = str(uuid.uuid4())
    response = QuestionnaireResponse(
        questionnaire_id=questionnaire_id,
        respondent_id=current_user.id if current_user else None,
        session_id=session_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        is_complete=True,
        completed_at=datetime.utcnow()
    )
    
    db.add(response)
    db.commit()
    db.refresh(response)
    
    # Create answers
    for answer_data in response_data.answers:
        answer = Answer(
            question_id=answer_data.question_id,
            response_id=response.id,
            answer_text=answer_data.answer_text,
            answer_number=answer_data.answer_number,
            answer_date=answer_data.answer_date,
            answer_boolean=answer_data.answer_boolean,
            selected_options=json.dumps(answer_data.selected_options) if answer_data.selected_options else None
        )
        db.add(answer)
    
    db.commit()
    
    # Update analytics
    analytics = db.query(QuestionnaireAnalytics).filter(
        QuestionnaireAnalytics.questionnaire_id == questionnaire_id
    ).first()
    
    if not analytics:
        analytics = QuestionnaireAnalytics(questionnaire_id=questionnaire_id)
        db.add(analytics)
    
    analytics.total_responses += 1
    analytics.completed_responses += 1
    analytics.completion_rate = (analytics.completed_responses / analytics.total_responses) * 100
    db.commit()
    
    # Reload with answers
    response = db.query(QuestionnaireResponse).options(
        joinedload(QuestionnaireResponse.answers)
    ).filter(QuestionnaireResponse.id == response.id).first()
    
    return QuestionnaireResponseDetail.model_validate(response)

@router.get("/{questionnaire_id}/responses", response_model=List[QuestionnaireResponseDetail])
async def get_responses(
    questionnaire_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questionnaire = db.query(Questionnaire).filter(Questionnaire.id == questionnaire_id).first()
    
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    if not check_questionnaire_access(db, questionnaire, current_user, "read"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    responses = db.query(QuestionnaireResponse).options(
        joinedload(QuestionnaireResponse.answers)
    ).filter(QuestionnaireResponse.questionnaire_id == questionnaire_id).all()
    
    return [QuestionnaireResponseDetail.model_validate(r) for r in responses]

@router.get("/{questionnaire_id}/stats", response_model=QuestionnaireStats)
async def get_questionnaire_stats(
    questionnaire_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questionnaire = db.query(Questionnaire).filter(Questionnaire.id == questionnaire_id).first()
    
    if not questionnaire:
        raise HTTPException(status_code=404, detail="Questionnaire not found")
    
    if not check_questionnaire_access(db, questionnaire, current_user, "read"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    analytics = db.query(QuestionnaireAnalytics).filter(
        QuestionnaireAnalytics.questionnaire_id == questionnaire_id
    ).first()
    
    if not analytics:
        return QuestionnaireStats(
            total_responses=0,
            completed_responses=0,
            completion_rate=0,
            average_completion_time=0,
            unique_visitors=0,
            bounce_rate=0
        )
    
    return QuestionnaireStats.model_validate(analytics)