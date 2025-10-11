export type CorrectiveActionType =
  | 'Immediate Action'
  | 'Short-term Corrective Action'
  | 'Long-term Corrective Action'
  | 'Preventive Action'
  | 'Improvement Action'

export type CorrectiveActionSource =
  | 'Incident Report'
  | 'Audit Finding'
  | 'Risk Assessment'
  | 'Customer Complaint'
  | 'Management Review'
  | 'FMEA'
  | 'Other'

export type CorrectiveActionPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type CorrectiveActionImpact = 'Low' | 'Medium' | 'High' | 'Critical'
export type CorrectiveActionUrgency = 'Low' | 'Medium' | 'High' | 'Critical'

export type CorrectiveActionStatus =
  | 'Open'
  | 'In Progress'
  | 'Completed'
  | 'Closed'
  | 'Cancelled'

export type CorrectiveActionStepStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Delayed'

export type CorrectiveActionUpdateType =
  | 'Progress Update'
  | 'Issue Report'
  | 'Resource Change'
  | 'Timeline Change'
  | 'Escalation'
  | 'Review'
  | 'Comment'

export type CorrectiveActionEvaluationMethod =
  | 'Metrics review'
  | 'Audit'
  | 'Survey'
  | 'Other'

export type CorrectiveActionEffectivenessRating =
  | 'Effective'
  | 'Partially Effective'
  | 'Not Effective'

export interface CorrectiveActionAttachment {
  file_name: string
  file_url?: string | null
  file_type?: string | null
  uploaded_by_id?: number | null
  uploaded_at?: string | null
}

export interface CorrectiveActionStep {
  id: number
  description: string
  responsible_person_id?: number | null
  responsible_person_name?: string | null
  due_date?: string | null
  resources_required?: string | null
  success_criteria?: string | null
  status: CorrectiveActionStepStatus
  progress_notes?: string | null
  issues_obstacles?: string | null
  completion_date?: string | null
  evidence: CorrectiveActionAttachment[]
  order_index: number
}

export interface CorrectiveActionStepInput {
  description: string
  responsible_person_id?: number | null
  due_date?: string | null
  resources_required?: string | null
  success_criteria?: string | null
  status?: CorrectiveActionStepStatus
  progress_notes?: string | null
  issues_obstacles?: string | null
  completion_date?: string | null
  evidence?: CorrectiveActionAttachment[]
}

export interface CorrectiveActionMetric {
  id: number
  metric_name: string
  target_value?: string | null
  actual_value?: string | null
  measurement_method?: string | null
  measurement_date?: string | null
}

export interface CorrectiveActionMetricInput {
  metric_name: string
  target_value?: string | null
  actual_value?: string | null
  measurement_method?: string | null
  measurement_date?: string | null
}

export interface CorrectiveActionUpdateEntry {
  id: number
  update_type: CorrectiveActionUpdateType
  description: string
  attachments: CorrectiveActionAttachment[]
  created_at: string
  created_by_id: number
  created_by_name?: string | null
}

export interface CorrectiveActionAIInsights {
  effectiveness_score?: number | null
  predicted_rating?: CorrectiveActionEffectivenessRating | null
  risk_score?: number | null
  prioritized_level?: CorrectiveActionPriority | null
  success_probability?: number | null
  resource_recommendations: string[]
  escalation_recommendations: string[]
  timeline_advice?: string | null
}

export interface CorrectiveActionSummaryCards {
  total_actions: number
  open_actions: number
  overdue_actions: number
  completed_this_month: number
  average_effectiveness?: number | null
  trend_direction: 'up' | 'down' | 'steady'
  trend_delta?: number | null
}

export interface CorrectiveActionStatusSlice {
  status: CorrectiveActionStatus
  count: number
}

export interface CorrectiveActionDepartmentSlice {
  department_id?: number | null
  department_name: string
  count: number
}

export interface CorrectiveActionTypeSlice {
  action_type: CorrectiveActionType
  count: number
}

export interface CorrectiveActionCompletionTrendPoint {
  period: string
  completed_count: number
  predicted_count: number
}

export interface CorrectiveActionAnalytics {
  status_distribution: CorrectiveActionStatusSlice[]
  department_distribution: CorrectiveActionDepartmentSlice[]
  type_distribution: CorrectiveActionTypeSlice[]
  completion_trend: CorrectiveActionCompletionTrendPoint[]
}

export interface PriorityActionItem {
  id: number
  action_code: string
  title: string
  priority: CorrectiveActionPriority
  impact: CorrectiveActionImpact
  urgency: CorrectiveActionUrgency
  status: CorrectiveActionStatus
  due_date?: string | null
  days_to_due?: number | null
  progress_percent: number
  owner_name?: string | null
  risk_score?: number | null
}

export interface CorrectiveActionPriorityLists {
  high_priority: PriorityActionItem[]
  overdue: PriorityActionItem[]
  due_this_week: PriorityActionItem[]
  recently_completed: PriorityActionItem[]
}

export interface CorrectiveActionDashboardResponse {
  summary: CorrectiveActionSummaryCards
  analytics: CorrectiveActionAnalytics
  priority_lists: CorrectiveActionPriorityLists
  ai_highlights: string[]
  last_refreshed: string
}

export interface CorrectiveActionListItem {
  id: number
  action_code: string
  title: string
  status: CorrectiveActionStatus
  priority: CorrectiveActionPriority
  impact: CorrectiveActionImpact
  urgency: CorrectiveActionUrgency
  due_date?: string | null
  progress_percent: number
  owner_name?: string | null
  effectiveness_score?: number | null
}

export interface CorrectiveActionListResponse {
  items: CorrectiveActionListItem[]
  total: number
}

export interface CorrectiveActionDetail {
  id: number
  action_code: string
  title: string
  action_type: CorrectiveActionType
  source_reference: CorrectiveActionSource
  reference_id?: string | null
  department_ids: number[]
  priority: CorrectiveActionPriority
  impact: CorrectiveActionImpact
  urgency: CorrectiveActionUrgency
  problem_statement: string
  root_cause: string
  contributing_factors?: string | null
  impact_assessment: string
  current_controls?: string | null
  evidence_files: CorrectiveActionAttachment[]
  corrective_action_description: string
  overall_due_date: string
  action_owner_id: number
  action_owner_name?: string | null
  review_team_ids: number[]
  review_team: string[]
  budget_required?: number | null
  approval_required: boolean
  approver_id?: number | null
  approver_name?: string | null
  status: CorrectiveActionStatus
  progress_percent: number
  evaluation_due_date?: string | null
  evaluation_method?: CorrectiveActionEvaluationMethod | null
  effectiveness_rating?: CorrectiveActionEffectivenessRating | null
  evaluation_comments?: string | null
  further_actions_required?: boolean | null
  follow_up_actions?: string | null
  ai_insights?: CorrectiveActionAIInsights | null
  steps: CorrectiveActionStep[]
  updates: CorrectiveActionUpdateEntry[]
  metrics: CorrectiveActionMetric[]
  last_updated_at: string
  created_at: string
}

export interface CorrectiveActionFormValues {
  title: string
  action_type: CorrectiveActionType
  source_reference: CorrectiveActionSource
  reference_id?: string
  department_ids: number[]
  priority: CorrectiveActionPriority
  impact: CorrectiveActionImpact
  urgency: CorrectiveActionUrgency
  problem_statement: string
  root_cause: string
  contributing_factors?: string
  impact_assessment: string
  current_controls?: string
  evidence_files: CorrectiveActionAttachment[]
  corrective_action_description: string
  steps: CorrectiveActionStepInput[]
  overall_due_date: string
  action_owner_id: number
  review_team_ids: number[]
  budget_required?: number
  approval_required: boolean
  approver_id?: number
  evaluation_due_date?: string
  evaluation_method?: CorrectiveActionEvaluationMethod
  success_metrics: CorrectiveActionMetricInput[]
}

export interface CorrectiveActionOptionsResponse {
  action_types: CorrectiveActionType[]
  source_references: CorrectiveActionSource[]
  priority_levels: CorrectiveActionPriority[]
  impact_levels: CorrectiveActionImpact[]
  urgency_levels: CorrectiveActionUrgency[]
  evaluation_methods: CorrectiveActionEvaluationMethod[]
  step_statuses: CorrectiveActionStepStatus[]
  update_types: CorrectiveActionUpdateType[]
  departments: { id: number; name: string; code?: string }[]
  users: { id: number; name: string; role: string }[]
}

export interface CorrectiveActionAIRequest {
  action_type: CorrectiveActionType
  priority: CorrectiveActionPriority
  impact: CorrectiveActionImpact
  urgency: CorrectiveActionUrgency
  problem_statement: string
  root_cause: string
  impact_assessment: string
  current_controls?: string
  existing_steps: CorrectiveActionStepInput[]
}

export interface CorrectiveActionAIResponse {
  insights: CorrectiveActionAIInsights
  recommended_steps: CorrectiveActionStepInput[]
  recommended_metrics: CorrectiveActionMetricInput[]
}
