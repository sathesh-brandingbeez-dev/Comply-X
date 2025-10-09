export type AuditType =
  | 'internal_audit'
  | 'compliance_audit'
  | 'quality_audit'
  | 'financial_audit'
  | 'it_security_audit'
  | 'risk_assessment_audit'
  | 'operational_audit'
  | 'environmental_audit'
  | 'health_safety_audit'
  | 'custom_template'

export type AuditStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'on_hold'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type AuditQuestionType = 'yes_no' | 'multiple_choice' | 'text' | 'rating' | 'evidence'

export interface AuditChecklistQuestion {
  id?: number
  question_text: string
  question_type: AuditQuestionType
  evidence_required: boolean
  scoring_weight: number
  risk_impact: RiskLevel
  guidance_notes?: string
  order_index?: number
}

export interface AuditChecklistSection {
  id?: number
  title: string
  description?: string
  weight: number
  is_required: boolean
  order_index?: number
  questions: AuditChecklistQuestion[]
}

export interface AuditNotificationSettings {
  audit_announcement: boolean
  daily_reminders: boolean
  progress_updates: boolean
  completion_notifications: boolean
}

export interface AuditEmailTemplates {
  audit_announcement?: string
  daily_reminder?: string
  completion_notice?: string
}

export interface AuditResourceAllocation {
  user_id: number
  user_name?: string
  allocated_hours: number
  role?: string
}

export interface AuditTimelineEntry {
  phase: string
  start_date: string
  end_date: string
  completion?: number
}

export interface AuditRecord {
  id: number
  title: string
  audit_type: AuditType
  risk_level: RiskLevel
  departments: number[]
  department_names: string[]
  scope: string
  objective: string
  compliance_frameworks: string[]
  planned_start_date: string
  planned_end_date: string
  estimated_duration_hours: number
  lead_auditor_id: number
  audit_team_ids: number[]
  external_auditors?: string
  auditee_contact_ids: number[]
  meeting_room?: string
  special_requirements?: string
  notification_settings: AuditNotificationSettings
  email_templates: AuditEmailTemplates
  distribution_list_ids: number[]
  cc_list: string[]
  bcc_list: string[]
  launch_option: string
  resource_allocation: AuditResourceAllocation[]
  timeline: AuditTimelineEntry[]
  status: AuditStatus
  progress: number
  lead_auditor_name?: string
  sections: AuditChecklistSection[]
  created_at: string
  updated_at: string
}

export interface AuditListItem {
  id: number
  title: string
  audit_type: AuditType
  departments: string[]
  start_date: string
  end_date: string
  status: AuditStatus
  progress: number
  lead_auditor: string
  risk_level: RiskLevel
}

export interface AuditCalendarEvent {
  id: number
  audit_id: number
  title: string
  start_date: string
  end_date: string
  status: AuditStatus
  audit_type: AuditType
  lead_auditor: string
  department_names: string[]
  risk_level: RiskLevel
  quick_actions: string[]
}

export interface AuditPlanningSummary {
  total_audits: number
  scheduled: number
  in_progress: number
  completed: number
  overdue: number
  average_progress: number
}

export interface AuditAIRecommendations {
  intelligent_schedule: string[]
  resource_allocation: string[]
  duration_predictions: string[]
}

export interface AuditPlanningDashboard {
  calendar_events: AuditCalendarEvent[]
  legend: Record<string, string>
  audits: AuditListItem[]
  summary: AuditPlanningSummary
  ai_recommendations: AuditAIRecommendations
}

export interface AuditBasicInfoAIResponse {
  suggested_scope: string
  suggested_objective: string
  suggested_compliance_frameworks: string[]
  predicted_risk_level: RiskLevel
  rationale: string
}

export interface AuditSchedulingAIResponse {
  recommended_team: number[]
  resource_conflicts: string[]
  recommended_meeting_room?: string
  suggested_duration_hours: number
  allocation_plan: AuditResourceAllocation[]
}

export interface AuditChecklistAIResponse {
  sections: AuditChecklistSection[]
  recommendations: string[]
}

export interface AuditNotificationAIResponse {
  notification_settings: AuditNotificationSettings
  email_templates: AuditEmailTemplates
  distribution_list_ids: number[]
  cc_list: string[]
  bcc_list: string[]
  timing_recommendations: string[]
}

export interface AuditReviewAIResponse {
  validation_messages: string[]
  optimisation_opportunities: string[]
  predicted_success_probability: number
  launch_timing_recommendation: string
}

export interface DepartmentOption {
  id: number
  name: string
}

export interface UserOption {
  id: number
  username?: string
  first_name?: string | null
  last_name?: string | null
  email?: string
  role?: string
}

export interface AuditWizardOptions {
  departments: DepartmentOption[]
  users: UserOption[]
}
