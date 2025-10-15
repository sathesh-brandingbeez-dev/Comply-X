export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'auditor'
  | 'employee'
  | 'viewer'

export type PermissionLevel =
  | 'reader'
  | 'editor'
  | 'reviewer'
  | 'admin'
  | 'super_admin'

export interface UserManagementSummaryCards {
  total_users: number
  active_users: number
  inactive_users: number
  pending_verification: number
  new_this_month: number
  average_tenure_days: number
  mfa_enabled_rate: number
}

export interface UserManagementStatusSlice {
  status: string
  count: number
  percentage: number
}

export interface UserManagementRoleSlice {
  role: UserRole
  count: number
}

export interface UserManagementDepartmentSlice {
  department_id: number | null
  department_name: string
  count: number
}

export interface UserManagementGrowthTrendPoint {
  period: string
  user_count: number
}

export interface UserManagementAnalytics {
  status_distribution: UserManagementStatusSlice[]
  role_distribution: UserManagementRoleSlice[]
  department_distribution: UserManagementDepartmentSlice[]
  growth_trend: UserManagementGrowthTrendPoint[]
}

export interface UserManagementPriorityUser {
  id: number
  full_name: string
  role: UserRole
  department: string | null
  last_login: string | null
  risk_score: number
  mfa_enabled: boolean
  status: string
}

export interface UserManagementPriorityLists {
  key_roles: UserManagementPriorityUser[]
  inactive_accounts: UserManagementPriorityUser[]
  pending_verification: UserManagementPriorityUser[]
  recently_added: UserManagementPriorityUser[]
}

export interface UserManagementAIInsights {
  workforce_health_score: number
  risk_alerts: string[]
  recommended_focus: string[]
  resource_recommendations: string[]
  narrative: string
}

export interface UserManagementDashboardResponse {
  summary: UserManagementSummaryCards
  analytics: UserManagementAnalytics
  priority_lists: UserManagementPriorityLists
  ai_summary: UserManagementAIInsights
  last_refreshed: string
}

export interface UserManagementListItem {
  id: number
  full_name: string
  email: string
  role: UserRole
  department: string | null
  status: string
  last_login: string | null
  created_at: string
  risk_score: number
  mfa_enabled: boolean
}

export interface UserManagementListResponse {
  items: UserManagementListItem[]
  total: number
}

export interface UserManagementOnboardingStep {
  title: string
  status: string
  due_date: string | null
  owner: string | null
  notes: string | null
}

export interface UserManagementActivity {
  timestamp: string
  activity_type: string
  description: string
  actor: string | null
}

export interface UserManagementDetail {
  id: number
  full_name: string
  email: string
  role: UserRole
  department: string | null
  manager: string | null
  permission_level: PermissionLevel
  is_active: boolean
  is_verified: boolean
  mfa_enabled: boolean
  phone: string | null
  position: string | null
  created_at: string
  updated_at: string
  last_login: string | null
  areas_of_responsibility: string[]
  onboarding_progress: number
  onboarding_steps: UserManagementOnboardingStep[]
  engagement_score: number
  attrition_risk: number
  risk_level: string
  activity_timeline: UserManagementActivity[]
  access_insights: string[]
}

export interface UserManagementDepartmentOption {
  id: number
  name: string
}

export interface UserManagementManagerOption {
  id: number
  full_name: string
  role: UserRole
}

export interface UserManagementOptionsResponse {
  roles: UserRole[]
  permission_levels: PermissionLevel[]
  departments: UserManagementDepartmentOption[]
  managers: UserManagementManagerOption[]
  timezones: string[]
}

export interface UserManagementOnboardingStepInput {
  title: string
  owner_role?: string | null
  due_in_days?: number | null
  notes?: string | null
}

export interface UserManagementCreate {
  email: string
  username: string
  first_name: string
  last_name: string
  role: UserRole
  password: string
  department_id?: number | null
  permission_level: PermissionLevel
  phone?: string | null
  position?: string | null
  employee_id?: string | null
  reporting_manager_id?: number | null
  areas_of_responsibility: string[]
  timezone?: string | null
  notifications_email: boolean
  notifications_sms: boolean
  is_active: boolean
  is_verified: boolean
  mfa_enabled: boolean
  onboarding_steps: UserManagementOnboardingStepInput[]
}

export interface UserManagementUpdate {
  first_name?: string
  last_name?: string
  role?: UserRole
  department_id?: number | null
  permission_level?: PermissionLevel
  phone?: string | null
  position?: string | null
  reporting_manager_id?: number | null
  is_active?: boolean
  is_verified?: boolean
  mfa_enabled?: boolean
  areas_of_responsibility?: string[]
}

export type ExperienceLevel = 'junior' | 'mid' | 'senior'

export interface UserManagementAIRequest {
  role: UserRole
  department?: string | null
  responsibilities: string[]
  experience_level: ExperienceLevel
  requires_mfa: boolean
  remote_worker: boolean
  tool_stack: string[]
}

export interface UserManagementAIResponse {
  insights: UserManagementAIInsights
  recommended_steps: UserManagementOnboardingStepInput[]
  recommended_permissions: string[]
  resource_recommendations: string[]
}
