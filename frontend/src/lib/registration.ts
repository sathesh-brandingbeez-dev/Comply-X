import axios from 'axios'

const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? '/api/auth/registration'
    : `${process.env.NEXT_PUBLIC_API_BASE || '/api/auth'}/registration`

export interface RegistrationDepartment {
  name: string
  description?: string | null
  parent_department?: string | null
}

export interface RegistrationFramework {
  key: string
  label: string
  category: string
  estimated_timeline?: string | null
}

export interface RegistrationSuggestions {
  industry: string
  frameworks: RegistrationFramework[]
  departments: RegistrationDepartment[]
  recommended_modules: string[]
  estimated_setup_time: string
}

export interface CompanyRegistrationPayload {
  company_name: string
  industry: string
  company_size: string
  country: string
  time_zone: string
  website?: string
  admin_first_name: string
  admin_last_name: string
  admin_email: string
  admin_phone?: string
  admin_job_title: string
  admin_department: string
  password: string
  permission_level: 'admin' | 'super_admin'
  role: 'admin' | 'super_admin'
  departments: RegistrationDepartment[]
  frameworks: RegistrationFramework[]
  custom_frameworks: { name: string; description?: string }[]
  recommended_modules: string[]
  estimated_setup_time?: string
  quick_setup?: boolean
  setup_score?: number
}

export interface QuickCompanyRegistrationPayload {
  company_name: string
  industry: string
  company_size: string
  country: string
  website?: string
  admin_first_name: string
  admin_last_name: string
  admin_email: string
  password: string
  use_default_departments: boolean
  configure_departments_later: boolean
  use_standard_frameworks: boolean
  configure_frameworks_later: boolean
  permission_level: 'admin' | 'super_admin'
  role: 'admin' | 'super_admin'
  setup_score?: number
}

export interface RegistrationResponse {
  registration_id: number
  status: string
  recommended_actions: string[]
  setup_score?: number
}

class RegistrationService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  async getSuggestions(industry: string, companySize: string): Promise<RegistrationSuggestions> {
    const response = await this.client.get<RegistrationSuggestions>('/suggestions', {
      params: { industry, company_size: companySize },
    })
    return response.data
  }

  async submitWizard(payload: CompanyRegistrationPayload): Promise<RegistrationResponse> {
    const response = await this.client.post<RegistrationResponse>('/wizard', payload)
    return response.data
  }

  async submitQuick(payload: QuickCompanyRegistrationPayload): Promise<RegistrationResponse> {
    const response = await this.client.post<RegistrationResponse>('/quick', payload)
    return response.data
  }
}

export const registrationService = new RegistrationService()
