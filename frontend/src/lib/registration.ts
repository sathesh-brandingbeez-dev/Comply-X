import axios from 'axios'

import { getApiBaseUrl } from './api-base'

const API_BASE_URL = getApiBaseUrl()

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface RegistrationInsightsRequest {
  industry?: string
  country?: string
  company_size?: string
}

export interface RegistrationInsightsResponse {
  recommended_modules: string[]
  suggested_departments: string[]
  framework_recommendations: string[]
  estimated_setup_days: number
  suggested_review_cycles: number
  personalised_examples: string[]
}

export interface CompanyInfoPayload {
  name: string
  industry: string
  companySize: string
  country: string
  timeZone: string
  website?: string
}

export interface AdministratorInfoPayload {
  first_name: string
  last_name: string
  email: string
  phoneNumber?: string
  jobTitle: string
  department: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

export interface DepartmentPayload {
  name: string
  description?: string
  parentDepartment?: string
}

export interface FrameworkPayload {
  name: string
  category?: string
  description?: string
  isCustom?: boolean
}

export interface QuickOptionsPayload {
  useDefaultDepartments: boolean
  configureDepartmentsLater: boolean
  useStandardFrameworks: boolean
  configureFrameworksLater: boolean
}

export interface RegistrationSubmissionPayload {
  setupMode: 'guided' | 'quick'
  company: CompanyInfoPayload
  administrator: AdministratorInfoPayload
  departments: DepartmentPayload[]
  frameworks: FrameworkPayload[]
  quickOptions?: QuickOptionsPayload
  aiRecommendations?: RegistrationInsightsResponse
}

export interface RegistrationSubmissionResponse {
  submission_id: number
  created_at: string
  message: string
  permission_level: 'admin' | 'super_admin' | 'reviewer' | 'editor' | 'reader'
}

export async function getDefaultDepartments(industry?: string): Promise<string[]> {
  const response = await client.get<string[]>('/registration/default-departments', {
    params: { industry },
  })
  return response.data
}

export async function getRegistrationInsights(
  payload: RegistrationInsightsRequest
): Promise<RegistrationInsightsResponse> {
  const response = await client.post<RegistrationInsightsResponse>(
    '/registration/ai/insights',
    payload
  )
  return response.data
}

export async function submitCompanyRegistration(
  payload: RegistrationSubmissionPayload
): Promise<RegistrationSubmissionResponse> {
  const response = await client.post<RegistrationSubmissionResponse>('/registration/company', payload)
  return response.data
}
