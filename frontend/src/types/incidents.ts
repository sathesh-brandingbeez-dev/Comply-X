export type IncidentSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type IncidentStatus = 'Open' | 'Under Investigation' | 'Resolved' | 'Closed'
export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type InvestigationActivityType =
  | 'Interview'
  | 'Evidence Collection'
  | 'Analysis'
  | 'Site Visit'
  | 'Expert Consultation'
  | 'Testing'
  | 'Research'
  | 'Other'

export interface IncidentSummaryCards {
  total_incidents: number
  open_incidents: number
  resolved_this_month: number
  average_resolution_time_hours: number | null
  overdue_incidents: number
  trend_direction: 'up' | 'down' | 'flat'
  trend_change_percentage?: number | null
}

export interface IncidentTrendPoint {
  period: string
  open_count: number
  resolved_count: number
  predicted_count?: number | null
}

export interface IncidentCategoryBreakdown {
  category: string
  count: number
}

export interface IncidentSeverityBreakdown {
  severity: IncidentSeverity
  count: number
}

export interface IncidentDepartmentPerformance {
  department_id?: number | null
  department_name: string
  average_resolution_hours?: number | null
  open_count: number
}

export interface IncidentAIInsights {
  narrative: string
  forecast_next_month: number
  confidence: number
  alerts: string[]
  resource_recommendations: string[]
}

export interface IncidentAnalytics {
  trend: IncidentTrendPoint[]
  categories: IncidentCategoryBreakdown[]
  severity: IncidentSeverityBreakdown[]
  department_performance: IncidentDepartmentPerformance[]
  ai: IncidentAIInsights
}

export interface IncidentDashboardResponse {
  last_refreshed: string
  summary: IncidentSummaryCards
  analytics: IncidentAnalytics
}

export interface IncidentAttachment {
  id: number
  file_name: string
  file_url?: string | null
  file_type?: string | null
  file_size?: number | null
  description?: string | null
  uploaded_by_id?: number | null
  uploaded_at: string
}

export interface IncidentInvestigationActivity {
  id: number
  activity_time: string
  activity_type: InvestigationActivityType
  investigator_id?: number | null
  description?: string | null
  findings?: string | null
  evidence_url?: string | null
  follow_up_required: boolean
  created_at: string
}

export interface IncidentRootCauseFactor {
  id: number
  description: string
  category: string
  impact_level: IncidentSeverity
  created_at: string
}

export interface IncidentInvestigationDetail {
  status: IncidentStatus
  priority: IncidentPriority
  assigned_investigator_id?: number | null
  investigation_team_ids: number[]
  target_resolution_date?: string | null
  actual_resolution_date?: string | null
  rca_method?: string | null
  primary_root_cause?: string | null
  rca_notes?: string | null
  ai_guidance?: Record<string, unknown> | null
  root_cause_factors: IncidentRootCauseFactor[]
  activities: IncidentInvestigationActivity[]
}

export interface IncidentDetail {
  id: number
  incident_code: string
  title: string
  incident_type: string
  incident_category?: string | null
  department_id?: number | null
  location_path?: Record<string, unknown> | null
  occurred_at: string
  reported_at: string
  severity: IncidentSeverity
  status: IncidentStatus
  priority: IncidentPriority
  impact_assessment: string
  immediate_actions?: string | null
  detailed_description: string
  what_happened: string
  root_cause?: string | null
  contributing_factors?: string | null
  people_involved_ids: number[]
  witness_ids: number[]
  equipment_involved?: string | null
  immediate_notification_ids: number[]
  escalation_path?: string[] | null
  external_notifications: string[]
  public_disclosure_required: boolean
  resolved_at?: string | null
  created_by_id: number
  attachments: IncidentAttachment[]
  investigation?: IncidentInvestigationDetail | null
  ai_metadata?: Record<string, unknown> | null
}

export interface IncidentListItem {
  id: number
  incident_code: string
  title: string
  status: IncidentStatus
  severity: IncidentSeverity
  priority: IncidentPriority
  department_name?: string | null
  occurred_at: string
  reported_at: string
  overdue: boolean
  assigned_investigator_id?: number | null
}

export interface IncidentListResponse {
  items: IncidentListItem[]
  total: number
}

export interface IncidentAttachmentInput {
  file_name: string
  file_url?: string | null
  file_type?: string | null
  file_size?: number | null
  description?: string | null
}

export interface IncidentFormValues {
  title: string
  incident_type: string
  incident_category?: string | null
  department_id?: number | null
  location_path?: Record<string, unknown> | null
  occurred_at: string
  severity: IncidentSeverity
  impact_assessment: string
  immediate_actions?: string | null
  detailed_description: string
  what_happened: string
  root_cause?: string | null
  contributing_factors?: string | null
  people_involved_ids: number[]
  witness_ids: number[]
  equipment_involved?: string | null
  immediate_notification_ids: number[]
  escalation_path?: string[] | null
  external_notifications: string[] | string
  public_disclosure_required: boolean
  attachments: IncidentAttachmentInput[]
}

export interface IncidentDepartmentOption {
  id: number
  name: string
  site?: string | null
}

export interface IncidentUserOption {
  id: number
  name: string
  role?: string | null
}

export interface IncidentLocationOption {
  id: number
  label: string
}

export interface IncidentOptionsResponse {
  incident_types: string[]
  incident_categories: Record<string, string[]>
  departments: IncidentDepartmentOption[]
  locations: IncidentLocationOption[]
  users: IncidentUserOption[]
}

export interface IncidentClassificationResponse {
  suggested_category: string
  rationale: string
}

export interface IncidentSeverityAssessmentResponse {
  recommended_severity: IncidentSeverity
  confidence: number
  indicators: string[]
}

export interface IncidentDuplicateMatch {
  incident_id: number
  incident_code: string
  title: string
  similarity: number
  occurred_at: string
}

export interface IncidentDuplicateDetectionResponse {
  matches: IncidentDuplicateMatch[]
}

export interface IncidentInvestigationInsightsResponse {
  recommended_rca_methods: string[]
  suggested_primary_cause?: string | null
  contributing_factors: string[]
  timeline_guidance: string[]
}

export interface IncidentTimelineResponse {
  target_resolution_date: string
  timeline_guidance: string[]
  priority_rationale: string
}

export interface IncidentEscalationResponse {
  steps: string[]
}
