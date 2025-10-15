"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check, ChevronLeft, ChevronRight, Plus, Shield, ShieldCheck, ShieldX, Wand2 } from 'lucide-react'

import sharedCountryCatalogue from '@shared/data/default_countries.json'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  RegistrationInsightsResponse,
  RegistrationSubmissionPayload,
  RegistrationSubmissionResponse,
  getDefaultDepartments,
  getRegistrationInsights,
  submitCompanyRegistration,
} from '@/lib/registration'

const INDUSTRIES = [
  'Manufacturing',
  'Financial Services',
  'Healthcare',
  'Technology',
  'Retail',
  'Transportation & Logistics',
  'Energy & Utilities',
  'Government',
  'Other',
]

const COMPANY_SIZES = [
  '1-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1001-5000 employees',
  '5000+ employees',
]

const COUNTRIES = (sharedCountryCatalogue as { code: string; name: string }[]).map((entry) => ({
  code: entry.code,
  name: entry.name,
}))

const COUNTRY_TIME_ZONES: Record<string, string[]> = {
  US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  CA: ['America/Toronto', 'America/Vancouver', 'America/Halifax'],
  GB: ['Europe/London'],
  IE: ['Europe/Dublin'],
  AU: ['Australia/Sydney', 'Australia/Brisbane', 'Australia/Perth'],
  NZ: ['Pacific/Auckland'],
  SG: ['Asia/Singapore'],
  IN: ['Asia/Kolkata'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  ES: ['Europe/Madrid'],
  PT: ['Europe/Lisbon'],
  BR: ['America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza'],
  MX: ['America/Mexico_City', 'America/Monterrey'],
  ZA: ['Africa/Johannesburg'],
  AE: ['Asia/Dubai'],
  JP: ['Asia/Tokyo'],
  CN: ['Asia/Shanghai'],
}

const getSupportedTimeZones = (): string[] => {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    try {
      return (Intl as unknown as { supportedValuesOf: (type: string) => string[] }).supportedValuesOf('timeZone')
    } catch (error) {
      console.warn('Unable to load supported time zones', error)
    }
  }

  return ['UTC']
}

const FALLBACK_TIME_ZONES = getSupportedTimeZones()

const DEPARTMENT_DESCRIPTIONS: Record<string, string> = {
  Compliance: 'Compliance management and oversight',
  Legal: 'Legal affairs and contract management',
  Finance: 'Financial operations and reporting',
  Operations: 'Operational processes and procedures',
  'Human Resources': 'HR policies and employee management',
  'Risk Management': 'Risk oversight and mitigation',
  'Quality Assurance': 'Quality management and auditing',
  IT: 'Technology governance and support',
  'IT Security': 'Information security and data protection',
  'Information Security': 'Information security and data protection',
  'Environmental Health & Safety': 'Environmental health and safety programs',
  'Supply Chain': 'Supply chain and vendor oversight',
  Maintenance: 'Maintenance and asset reliability',
  Security: 'Security and access management',
  Engineering: 'Engineering and technical delivery',
  'Customer Success': 'Customer success and retention',
  'Clinical Governance': 'Clinical governance and patient safety',
  'Internal Audit': 'Internal audit and assurance',
  'Loss Prevention': 'Loss prevention and fraud mitigation',
  'Health & Safety': 'Workplace health and safety programmes',
  Safety: 'Safety programs and assurance',
  'Operations Control': 'Operational control and logistics',
  'Regulatory Affairs': 'Regulatory affairs and compliance',
  'Asset Management': 'Asset performance and lifecycle management',
  Policy: 'Policy development and oversight',
  'Executive': 'Executive leadership and oversight',
  Other: 'Additional teams you wish to include',
}

const DEFAULT_DEPARTMENTS = [
  { name: 'Compliance', description: DEPARTMENT_DESCRIPTIONS['Compliance'] },
  { name: 'Legal', description: DEPARTMENT_DESCRIPTIONS['Legal'] },
  { name: 'Finance', description: DEPARTMENT_DESCRIPTIONS['Finance'] },
  { name: 'Operations', description: DEPARTMENT_DESCRIPTIONS['Operations'] },
  { name: 'Human Resources', description: DEPARTMENT_DESCRIPTIONS['Human Resources'] },
  { name: 'Risk Management', description: DEPARTMENT_DESCRIPTIONS['Risk Management'] },
  { name: 'Quality Assurance', description: DEPARTMENT_DESCRIPTIONS['Quality Assurance'] },
]

const ADMIN_DEPARTMENTS = Array.from(
  new Set([
    ...DEFAULT_DEPARTMENTS.map((department) => department.name),
    'IT',
    'IT Security',
    'Executive',
    'Operations Control',
    'Regulatory Affairs',
    'Customer Success',
    'Engineering',
    'Security',
    'Other',
  ])
)

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'yopmail.com',
  'guerrillamail.com',
  'trashmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'maildrop.cc',
])

const FRAMEWORK_CATALOG: Record<string, { name: string; description?: string }[]> = {
  'Financial Services': [
    { name: 'SOX (Sarbanes-Oxley Act)' },
    { name: 'PCI DSS (Payment Card Industry)' },
    { name: 'GDPR (General Data Protection Regulation)' },
    { name: 'Basel III' },
  ],
  Healthcare: [
    { name: 'HIPAA (Health Insurance Portability)' },
    { name: 'FDA CFR Part 11' },
    { name: 'HITECH Act' },
  ],
  Manufacturing: [
    { name: 'ISO 9001 (Quality Management)' },
    { name: 'ISO 14001 (Environmental Management)' },
    { name: 'ISO 45001 (Occupational Health)' },
  ],
  Technology: [
    { name: 'SOC 2 (Service Organization Control)' },
    { name: 'ISO 27001 (Information Security)' },
    { name: 'NIST Cybersecurity Framework' },
  ],
  'Customs & Trade': [
    { name: 'AEO (Authorized Economic Operator)' },
    { name: 'C-TPAT (Customs-Trade Partnership)' },
    { name: 'CTPAT (Customs-Trade Partnership Against Terrorism)' },
  ],
}

const validateEmailDomain = (email: string): boolean => {
  const [, rawDomain] = email.split('@')
  const domain = rawDomain?.toLowerCase() ?? ''
  return domain.includes('.') && !DISPOSABLE_EMAIL_DOMAINS.has(domain)
}

const guidedSchema = z
  .object({
    companyName: z.string().min(1).max(100),
    industry: z.string().min(1),
    companySize: z.string().min(1),
    country: z.string().min(1),
    timeZone: z.string().min(1),
    website: z.string().url().optional().or(z.literal('')),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    email: z
      .string()
      .email()
      .refine((value) => validateEmailDomain(value), 'Enter a valid business email address'),
    phoneNumber: z.string().optional(),
    jobTitle: z.string().min(1).max(100),
    department: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    agreeToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  })
  .refine((data) => data.agreeToTerms, {
    path: ['agreeToTerms'],
    message: 'You must agree to continue',
  })

const quickSchema = z
  .object({
    companyName: z.string().min(1),
    industry: z.string().min(1),
    companySize: z.string().min(1),
    country: z.string().min(1),
    website: z.string().url().optional().or(z.literal('')),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z
      .string()
      .email()
      .refine((value) => validateEmailDomain(value), 'Enter a valid business email address'),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    useDefaultDepartments: z.boolean(),
    configureDepartmentsLater: z.boolean(),
    useStandardFrameworks: z.boolean(),
    configureFrameworksLater: z.boolean(),
    agreeToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match',
  })
  .refine((data) => data.agreeToTerms, {
    path: ['agreeToTerms'],
    message: 'You must agree to continue',
  })

type GuidedFormValues = z.infer<typeof guidedSchema>
type QuickFormValues = z.infer<typeof quickSchema>

interface DepartmentItem {
  name: string
  description?: string
  parentDepartment?: string
}

interface FrameworkItem {
  name: string
  category?: string
  description?: string
  isCustom?: boolean
}

function calculatePasswordScore(password: string): { score: number; label: string } {
  let score = 0
  if (password.length >= 8) score += 25
  if (/[A-Z]/.test(password)) score += 20
  if (/[a-z]/.test(password)) score += 20
  if (/\d/.test(password)) score += 20
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15
  const label = score >= 80 ? 'Strong' : score >= 50 ? 'Medium' : 'Weak'
  return { score, label }
}

function createDepartmentItems(names: string[]): DepartmentItem[] {
  const seen = new Set<string>()
  return names.reduce<DepartmentItem[]>((acc, name) => {
    const normalised = name.trim()
    if (!normalised || seen.has(normalised)) {
      return acc
    }
    seen.add(normalised)
    acc.push({
      name: normalised,
      description: DEPARTMENT_DESCRIPTIONS[normalised] ?? '',
    })
    return acc
  }, [])
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function RegisterPage() {
  const browserTimeZone = useMemo(() => {
    if (typeof Intl !== 'undefined') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    }
    return ''
  }, [])

  const [currentStep, setCurrentStep] = useState(1)
  const [departments, setDepartments] = useState<DepartmentItem[]>(DEFAULT_DEPARTMENTS)
  const [frameworks, setFrameworks] = useState<FrameworkItem[]>([])
  const [newDepartment, setNewDepartment] = useState<DepartmentItem>({ name: '', description: '', parentDepartment: undefined })
  const [customFramework, setCustomFramework] = useState({ name: '', description: '' })
  const [insights, setInsights] = useState<RegistrationInsightsResponse | null>(null)
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(ADMIN_DEPARTMENTS)
  const [submission, setSubmission] = useState<RegistrationSubmissionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'guided' | 'quick'>('guided')
  const [hasManualDepartmentChange, setHasManualDepartmentChange] = useState(false)
  const [timeZoneOptions, setTimeZoneOptions] = useState<string[]>(() =>
    browserTimeZone ? Array.from(new Set([browserTimeZone, ...FALLBACK_TIME_ZONES])) : FALLBACK_TIME_ZONES
  )

  const initialTimeZone = browserTimeZone || FALLBACK_TIME_ZONES[0] || 'UTC'

  const guidedForm = useForm<GuidedFormValues>({
    resolver: zodResolver(guidedSchema),
    defaultValues: {
      companyName: '',
      industry: '',
      companySize: '',
      country: '',
      timeZone: initialTimeZone,
      website: '',
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      jobTitle: '',
      department: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  })

  const quickForm = useForm<QuickFormValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      companyName: '',
      industry: '',
      companySize: '',
      country: '',
      website: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      useDefaultDepartments: true,
      configureDepartmentsLater: false,
      useStandardFrameworks: true,
      configureFrameworksLater: false,
      agreeToTerms: false,
    },
  })

  const industryValue = guidedForm.watch('industry')
  const countryValue = guidedForm.watch('country')
  const companySizeValue = guidedForm.watch('companySize')
  const passwordValue = guidedForm.watch('password')

  const quickCompanyName = quickForm.watch('companyName')
  const quickIndustryValue = quickForm.watch('industry')
  const quickCompanySizeValue = quickForm.watch('companySize')
  const quickCountryValue = quickForm.watch('country')
  const quickFirstName = quickForm.watch('firstName')
  const quickLastName = quickForm.watch('lastName')
  const quickEmail = quickForm.watch('email')
  const quickPasswordValue = quickForm.watch('password')
  const quickConfirmPassword = quickForm.watch('confirmPassword')
  const quickUseDefaultDepartments = quickForm.watch('useDefaultDepartments')
  const quickUseStandardFrameworks = quickForm.watch('useStandardFrameworks')
  const quickConfigureDepartmentsLater = quickForm.watch('configureDepartmentsLater')
  const quickConfigureFrameworksLater = quickForm.watch('configureFrameworksLater')
  const quickAgreeToTerms = quickForm.watch('agreeToTerms')

  const applyDepartmentSuggestions = useCallback(
    (names: string[]) => {
      const fallback = DEFAULT_DEPARTMENTS.map((department) => department.name)
      const items = createDepartmentItems(names.length ? names : fallback)
      setDepartments(items)
      setDepartmentOptions((prev) => Array.from(new Set([...prev, ...items.map((item) => item.name)])))
    },
    []
  )

  useEffect(() => {
    const zoneCandidates = COUNTRY_TIME_ZONES[countryValue] ?? []
    const baseZones = zoneCandidates.length ? zoneCandidates : FALLBACK_TIME_ZONES
    const mergedZones = browserTimeZone && !baseZones.includes(browserTimeZone)
      ? [browserTimeZone, ...baseZones]
      : baseZones
    setTimeZoneOptions(Array.from(new Set(mergedZones)))

    const currentTimeZone = guidedForm.getValues('timeZone')
    if (mergedZones.length && !mergedZones.includes(currentTimeZone)) {
      guidedForm.setValue('timeZone', mergedZones[0], { shouldValidate: true })
    }
  }, [browserTimeZone, countryValue, guidedForm])

  useEffect(() => {
    if (!industryValue) return

    getDefaultDepartments(industryValue)
      .then((data) => {
        setDepartmentOptions((prev) => Array.from(new Set([...prev, ...ADMIN_DEPARTMENTS, ...data])))
        if (!hasManualDepartmentChange) {
          applyDepartmentSuggestions(data)
        }
      })
      .catch(() => {
        // ignore errors
      })
  }, [industryValue, hasManualDepartmentChange, applyDepartmentSuggestions])

  useEffect(() => {
    if (!industryValue || !countryValue || !companySizeValue) return

    getRegistrationInsights({
      industry: industryValue,
      country: countryValue,
      company_size: companySizeValue,
    })
      .then((response) => {
        setInsights(response)
        if (!hasManualDepartmentChange && response.suggested_departments?.length) {
          applyDepartmentSuggestions(response.suggested_departments)
        } else if (response.suggested_departments?.length) {
          setDepartmentOptions((prev) =>
            Array.from(new Set([...prev, ...response.suggested_departments]))
          )
        }
      })
      .catch(() => setInsights(null))
  }, [industryValue, countryValue, companySizeValue, hasManualDepartmentChange, applyDepartmentSuggestions])

  useEffect(() => {
    if (!insights?.framework_recommendations?.length) return
    setFrameworks((prev) => {
      const existing = new Set(prev.map((framework) => framework.name))
      const additions = insights.framework_recommendations
        .filter((name) => !existing.has(name))
        .map((name) => ({ name, category: 'Recommended' }))
      return additions.length ? [...prev, ...additions] : prev
    })
  }, [insights])

  useEffect(() => {
    if (hasManualDepartmentChange) return
    if (!departments.length) return
    const currentDepartment = guidedForm.getValues('department')
    if (!currentDepartment || !departments.some((dept) => dept.name === currentDepartment)) {
      guidedForm.setValue('department', departments[0].name)
    }
  }, [departments, guidedForm, hasManualDepartmentChange])

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100
  const passwordStrength = useMemo(() => calculatePasswordScore(passwordValue ?? ''), [passwordValue])
  const passwordRequirements = useMemo(
    () => ({
      length: (passwordValue ?? '').length >= 8,
      uppercase: /[A-Z]/.test(passwordValue ?? ''),
      lowercase: /[a-z]/.test(passwordValue ?? ''),
      number: /\d/.test(passwordValue ?? ''),
      special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordValue ?? ''),
    }),
    [passwordValue]
  )
  const passwordRequirementItems = useMemo(
    () => [
      { label: 'At least 8 characters', met: passwordRequirements.length },
      { label: 'Uppercase letter', met: passwordRequirements.uppercase },
      { label: 'Lowercase letter', met: passwordRequirements.lowercase },
      { label: 'Number', met: passwordRequirements.number },
      { label: 'Symbol', met: passwordRequirements.special },
    ],
    [passwordRequirements]
  )

  const quickCompletionScore = useMemo(() => {
    const requiredValues = [
      quickCompanyName,
      quickIndustryValue,
      quickCompanySizeValue,
      quickCountryValue,
      quickFirstName,
      quickLastName,
      quickEmail,
      quickPasswordValue,
      quickConfirmPassword,
    ]

    const completed = requiredValues.filter((value) =>
      typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
    ).length

    let score = (completed / requiredValues.length) * 100
    if (quickUseDefaultDepartments) score += 5
    if (quickUseStandardFrameworks) score += 5
    return Math.min(100, Math.round(score))
  }, [
    quickCompanyName,
    quickIndustryValue,
    quickCompanySizeValue,
    quickCountryValue,
    quickFirstName,
    quickLastName,
    quickEmail,
    quickPasswordValue,
    quickConfirmPassword,
    quickUseDefaultDepartments,
    quickUseStandardFrameworks,
  ])

  const quickRecommendation = useMemo(() => {
    if (quickCompletionScore >= 90) {
      return 'Setup looks ready. Submit to provision your workspace.'
    }
    if (!quickIndustryValue) {
      return 'Select an industry to unlock tailored defaults and AI guidance.'
    }
    if (!quickUseDefaultDepartments) {
      return 'Consider using the recommended departments for a faster rollout.'
    }
    if (!quickUseStandardFrameworks) {
      return 'Enable standard frameworks to pre-populate compliance requirements.'
    }
    return 'Complete the remaining required fields to increase your setup readiness score.'
  }, [quickCompletionScore, quickIndustryValue, quickUseDefaultDepartments, quickUseStandardFrameworks])

  const handleSuggestPassword = () => {
    const generated = generateSecurePassword()
    guidedForm.setValue('password', generated, { shouldValidate: true })
    guidedForm.setValue('confirmPassword', generated, { shouldValidate: true })
  }

  const handleNext = async () => {
    let fields: (keyof GuidedFormValues)[] = []
    if (currentStep === 1) {
      fields = ['companyName', 'industry', 'companySize', 'country', 'timeZone', 'website']
    } else if (currentStep === 2) {
      fields = ['firstName', 'lastName', 'email', 'phoneNumber', 'jobTitle', 'department', 'password', 'confirmPassword', 'agreeToTerms']
    }
    if (fields.length) {
      const valid = await guidedForm.trigger(fields)
      if (!valid) return
    }
    setCurrentStep((step) => Math.min(step + 1, totalSteps))
  }

  const handleBack = () => setCurrentStep((step) => Math.max(step - 1, 1))

  const handleAddDepartment = () => {
    if (!newDepartment.name.trim()) return
    setHasManualDepartmentChange(true)
    const formattedDepartment: DepartmentItem = {
      name: newDepartment.name.trim(),
      description: newDepartment.description?.trim(),
      parentDepartment: newDepartment.parentDepartment,
    }
    setDepartments((prev) => [...prev, formattedDepartment])
    setDepartmentOptions((prev) => Array.from(new Set([...prev, formattedDepartment.name])))
    setNewDepartment({ name: '', description: '', parentDepartment: undefined })
  }

  const handleUpdateDepartment = (index: number, patch: Partial<DepartmentItem>) => {
    setHasManualDepartmentChange(true)
    setDepartments((prev) => prev.map((dept, idx) => (idx === index ? { ...dept, ...patch } : dept)))
    if (patch.name?.trim()) {
      const trimmed = patch.name.trim()
      setDepartmentOptions((prev) => Array.from(new Set([...prev, trimmed])))
    }
  }

  const handleRemoveDepartment = (index: number) => {
    setHasManualDepartmentChange(true)
    setDepartments((prev) => prev.filter((_, idx) => idx !== index))
  }

  const toggleFramework = (category: string, name: string) => {
    setFrameworks((prev) => {
      const exists = prev.find((item) => item.name === name)
      if (exists) {
        return prev.filter((item) => item.name !== name)
      }
      return [...prev, { name, category }]
    })
  }

  const addCustomFramework = () => {
    if (!customFramework.name.trim()) return
    setFrameworks((prev) => [
      ...prev,
      {
        name: customFramework.name.trim(),
        category: 'Custom',
        description: customFramework.description?.trim(),
        isCustom: true,
      },
    ])
    setCustomFramework({ name: '', description: '' })
  }

  const onSubmitGuided = async (values: GuidedFormValues) => {
    const payload: RegistrationSubmissionPayload = {
      setupMode: 'guided',
      company: {
        name: values.companyName,
        industry: values.industry,
        companySize: values.companySize,
        country: values.country,
        timeZone: values.timeZone,
        website: values.website || undefined,
      },
      administrator: {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        jobTitle: values.jobTitle,
        department: values.department,
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreeToTerms: values.agreeToTerms,
      },
      departments,
      frameworks,
      aiRecommendations: insights ?? undefined,
    }

    await submitRegistration(payload)
  }

  const onSubmitQuick = async (values: QuickFormValues) => {
    const payload: RegistrationSubmissionPayload = {
      setupMode: 'quick',
      company: {
        name: values.companyName,
        industry: values.industry,
        companySize: values.companySize,
        country: values.country,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        website: values.website || undefined,
      },
      administrator: {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        jobTitle: 'Administrator',
        department: 'Compliance',
        password: values.password,
        confirmPassword: values.confirmPassword,
        agreeToTerms: values.agreeToTerms,
      },
      departments: values.useDefaultDepartments
        ? (insights?.suggested_departments ?? departmentOptions).map((name) => ({ name }))
        : [],
      frameworks: values.useStandardFrameworks
        ? (insights?.framework_recommendations ?? []).map((name) => ({ name, category: 'Recommended' }))
        : [],
      quickOptions: {
        useDefaultDepartments: values.useDefaultDepartments,
        configureDepartmentsLater: values.configureDepartmentsLater,
        useStandardFrameworks: values.useStandardFrameworks,
        configureFrameworksLater: values.configureFrameworksLater,
      },
      aiRecommendations: insights ?? undefined,
    }

    await submitRegistration(payload)
  }

  const submitRegistration = async (payload: RegistrationSubmissionPayload) => {
    setSubmitting(true)
    try {
      const response = await submitCompanyRegistration(payload)
      setSubmission(response)
    } catch (error) {
      console.error('Registration failed', error)
      guidedForm.setError('companyName', { type: 'manual', message: 'Registration failed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" {...guidedForm.register('companyName')} />
                {guidedForm.formState.errors.companyName && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.companyName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={guidedForm.watch('industry')} onValueChange={(value) => guidedForm.setValue('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {guidedForm.formState.errors.industry && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.industry.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size *</Label>
                <Select value={guidedForm.watch('companySize')} onValueChange={(value) => guidedForm.setValue('companySize', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {guidedForm.formState.errors.companySize && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.companySize.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={countryValue} onValueChange={(value) => guidedForm.setValue('country', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name} ({country.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {guidedForm.formState.errors.country && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.country.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone *</Label>
                <Select value={guidedForm.watch('timeZone')} onValueChange={(value) => guidedForm.setValue('timeZone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {timeZoneOptions.map((timeZone) => (
                      <SelectItem key={timeZone} value={timeZone}>
                        {timeZone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {guidedForm.formState.errors.timeZone && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.timeZone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://" {...guidedForm.register('website')} />
                {guidedForm.formState.errors.website && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.website.message}</p>
                )}
              </div>
            </div>

            {insights && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">AI Recommendations</CardTitle>
                  <CardDescription>
                    Estimated setup {insights.estimated_setup_days} days • Suggested review cadence {insights.suggested_review_cycles} times per year
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Suggested Departments</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {insights.suggested_departments.map((dept) => (
                        <li key={dept} className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          {dept}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Recommended Modules</p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600">
                      {insights.recommended_modules.map((module) => (
                        <li key={module} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          {module}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...guidedForm.register('firstName')} />
                {guidedForm.formState.errors.firstName && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...guidedForm.register('lastName')} />
                {guidedForm.formState.errors.lastName && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...guidedForm.register('email')} />
                {guidedForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" {...guidedForm.register('phoneNumber')} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input id="jobTitle" {...guidedForm.register('jobTitle')} />
                {guidedForm.formState.errors.jobTitle && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.jobTitle.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={guidedForm.watch('department')} onValueChange={(value) => guidedForm.setValue('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {guidedForm.formState.errors.department && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.department.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" {...guidedForm.register('password')} />
                <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Progress value={passwordStrength.score} className="h-1.5" />
                    <span className="font-medium text-gray-700">{passwordStrength.label}</span>
                  </div>
                  <div className="grid gap-1">
                    {passwordRequirementItems.map((requirement) => (
                      <div
                        key={requirement.label}
                        className={`flex items-center gap-2 ${requirement.met ? 'text-emerald-600' : 'text-muted-foreground'}`}
                      >
                        {requirement.met ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <ShieldX className="h-3.5 w-3.5" />
                        )}
                        <span>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-fit px-2 text-xs text-primary"
                    onClick={handleSuggestPassword}
                  >
                    <Wand2 className="mr-2 h-3 w-3" /> Suggest secure password
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input id="confirmPassword" type="password" {...guidedForm.register('confirmPassword')} />
                {guidedForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{guidedForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="agreeToTerms"
                checked={guidedForm.watch('agreeToTerms')}
                onCheckedChange={(checked) => guidedForm.setValue('agreeToTerms', checked === true)}
              />
              <Label htmlFor="agreeToTerms" className="text-sm">
                I agree to Terms of Service and Privacy Policy
              </Label>
            </div>
            {guidedForm.formState.errors.agreeToTerms && (
              <p className="text-sm text-red-500">{guidedForm.formState.errors.agreeToTerms.message}</p>
            )}
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Define Your Department Structure</h3>
              <p className="text-sm text-muted-foreground">
                Create departments that reflect your organisational structure.
              </p>
            </div>

            <div className="space-y-4">
              {departments.map((department, index) => (
                <Card key={`${department.name}-${index}`}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Department Name</Label>
                        <Input
                          value={department.name}
                          onChange={(event) => handleUpdateDepartment(index, { name: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Parent Department</Label>
                        <Select
                          value={department.parentDepartment ?? ''}
                          onValueChange={(value) =>
                            handleUpdateDepartment(index, { parentDepartment: value || undefined })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {departments
                              .filter((_, idx) => idx !== index)
                              .map((dept) => (
                                <SelectItem key={`${dept.name}-option`} value={dept.name}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={department.description ?? ''}
                        onChange={(event) => handleUpdateDepartment(index, { description: event.target.value })}
                        placeholder="Describe responsibilities"
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveDepartment(index)}>
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Department</CardTitle>
                <CardDescription>Extend your structure with additional teams.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-department-name">Department Name</Label>
                    <Input
                      id="new-department-name"
                      value={newDepartment.name}
                      onChange={(event) => setNewDepartment((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-department-parent">Parent Department</Label>
                    <Select
                      value={newDepartment.parentDepartment ?? ''}
                      onValueChange={(value) =>
                        setNewDepartment((prev) => ({ ...prev, parentDepartment: value || undefined }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={`${dept.name}-parent`} value={dept.name}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-department-description">Description</Label>
                  <Textarea
                    id="new-department-description"
                    value={newDepartment.description ?? ''}
                    onChange={(event) => setNewDepartment((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Outline responsibilities"
                  />
                </div>
                <Button type="button" className="flex items-center gap-2" onClick={handleAddDepartment}>
                  <Plus className="h-4 w-4" /> Add Department
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select Your Compliance Frameworks</h3>
              <p className="text-sm text-muted-foreground">
                Intelligent recommendations highlight frameworks that align with your profile.
              </p>
            </div>

            {Object.entries(FRAMEWORK_CATALOG).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-base">{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item) => {
                    const selected = frameworks.some((framework) => framework.name === item.name)
                    const recommended = insights?.framework_recommendations?.includes(item.name)
                    return (
                      <button
                        type="button"
                        key={item.name}
                        onClick={() => toggleFramework(category, item.name)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                          selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span>
                          <span className="block text-sm font-medium text-gray-900">{item.name}</span>
                          {item.description && (
                            <span className="block text-xs text-muted-foreground">{item.description}</span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs font-medium text-primary">
                          {recommended && <span className="rounded-full bg-primary/10 px-2 py-1">AI Suggested</span>}
                          {selected && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    )
                  })}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Custom Framework</CardTitle>
                <CardDescription>Capture regional or internal standards unique to your organisation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-framework-name">Framework Name</Label>
                  <Input
                    id="custom-framework-name"
                    value={customFramework.name}
                    onChange={(event) => setCustomFramework((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-framework-description">Description</Label>
                  <Textarea
                    id="custom-framework-description"
                    value={customFramework.description}
                    onChange={(event) => setCustomFramework((prev) => ({ ...prev, description: event.target.value }))}
                    placeholder="Provide context or regulatory source"
                  />
                </div>
                <Button type="button" variant="outline" onClick={addCustomFramework}>
                  Add Custom Framework
                </Button>
              </CardContent>
            </Card>

            <div>
              <h4 className="text-sm font-semibold text-gray-900">Selected Frameworks</h4>
              {frameworks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select frameworks to see them listed here.</p>
              ) : (
                <ul className="mt-2 grid gap-2 md:grid-cols-2">
                  {frameworks.map((framework) => (
                    <li key={framework.name} className="rounded-lg border border-border bg-white px-4 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{framework.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFramework(framework.category ?? 'Custom', framework.name)}
                        >
                          Remove
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{framework.category ?? 'Custom Selection'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (submission) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <Card className="mx-auto max-w-xl border-primary/20">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Registration Submitted</CardTitle>
            <CardDescription>{submission.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Submission ID: {submission.submission_id}</p>
            <p>Administrator permission level: {submission.permission_level}</p>
            <p className="text-xs">
              A confirmation email will be sent once your workspace is provisioned. You can now return to the sign-in page.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => (window.location.href = '/login')}>
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl space-y-8 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Your ComplyX Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Start with the guided setup wizard or fast-track with the quick company setup. AI insights adapt each step.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'guided' | 'quick')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="guided">Guided Setup</TabsTrigger>
            <TabsTrigger value="quick">Quick Company Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="guided">
            <Card>
              <CardHeader>
                <CardTitle>Company Setup - Step {currentStep} of {totalSteps}</CardTitle>
                <CardDescription>
                  Progressively capture company information, administrator credentials, departments, and compliance frameworks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Progress value={progress} className="h-2" />
                {renderStep()}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 border-t bg-slate-50/60 py-6 md:flex-row md:justify-between">
                <span className="text-xs text-muted-foreground">Step {currentStep} of {totalSteps}</span>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  {currentStep < totalSteps ? (
                    <Button onClick={handleNext}>
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={guidedForm.handleSubmit(onSubmitGuided)} disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Complete Setup'}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="quick">
            <Card>
              <form onSubmit={quickForm.handleSubmit(onSubmitQuick)}>
                <CardHeader>
                  <CardTitle>Quick Company Setup</CardTitle>
                  <CardDescription>
                    Capture essential details in a single step. Smart defaults will configure departments and frameworks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quick-company-name">Company Name *</Label>
                      <Input id="quick-company-name" {...quickForm.register('companyName')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quick-industry">Industry *</Label>
                      <Select value={quickForm.watch('industry')} onValueChange={(value) => quickForm.setValue('industry', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quick-company-size">Company Size *</Label>
                      <Select value={quickForm.watch('companySize')} onValueChange={(value) => quickForm.setValue('companySize', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPANY_SIZES.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="space-y-2">
                    <Label htmlFor="quick-country">Country *</Label>
                    <Select value={quickCountryValue} onValueChange={(value) => quickForm.setValue('country', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-website">Website</Label>
                    <Input id="quick-website" placeholder="https://" {...quickForm.register('website')} />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quick-first-name">First Name *</Label>
                      <Input id="quick-first-name" {...quickForm.register('firstName')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quick-last-name">Last Name *</Label>
                      <Input id="quick-last-name" {...quickForm.register('lastName')} />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quick-email">Email *</Label>
                      <Input id="quick-email" type="email" {...quickForm.register('email')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quick-password">Password *</Label>
                      <Input id="quick-password" type="password" {...quickForm.register('password')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-confirm-password">Confirm Password *</Label>
                    <Input id="quick-confirm-password" type="password" {...quickForm.register('confirmPassword')} />
                    {quickForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500">{quickForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="quick-use-default-departments"
                        checked={quickUseDefaultDepartments}
                        onCheckedChange={(checked) => quickForm.setValue('useDefaultDepartments', checked === true)}
                      />
                      <Label htmlFor="quick-use-default-departments" className="text-sm">
                        Use default departments
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="quick-configure-departments-later"
                        checked={quickConfigureDepartmentsLater}
                        onCheckedChange={(checked) => quickForm.setValue('configureDepartmentsLater', checked === true)}
                      />
                      <Label htmlFor="quick-configure-departments-later" className="text-sm">
                        I'll configure departments later
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="quick-use-standard-frameworks"
                        checked={quickUseStandardFrameworks}
                        onCheckedChange={(checked) => quickForm.setValue('useStandardFrameworks', checked === true)}
                      />
                      <Label htmlFor="quick-use-standard-frameworks" className="text-sm">
                        Use standard compliance frameworks
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="quick-configure-frameworks-later"
                        checked={quickConfigureFrameworksLater}
                        onCheckedChange={(checked) => quickForm.setValue('configureFrameworksLater', checked === true)}
                      />
                      <Label htmlFor="quick-configure-frameworks-later" className="text-sm">
                        I'll configure frameworks later
                      </Label>
                    </div>
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-900">
                      <span>Setup readiness</span>
                      <span>{quickCompletionScore}%</span>
                    </div>
                    <Progress value={quickCompletionScore} className="mt-2 h-1.5" />
                    <p className="mt-2 text-xs text-muted-foreground">{quickRecommendation}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="quick-agree-terms"
                      checked={quickAgreeToTerms}
                      onCheckedChange={(checked) => quickForm.setValue('agreeToTerms', checked === true)}
                    />
                    <Label htmlFor="quick-agree-terms" className="text-sm">
                      I agree to Terms of Service and Privacy Policy
                    </Label>
                  </div>
                  {quickForm.formState.errors.agreeToTerms && (
                    <p className="text-sm text-red-500">{quickForm.formState.errors.agreeToTerms.message}</p>
                  )}
                </CardContent>
                <CardFooter className="border-t bg-slate-50/60 py-6">
                  <Button type="submit" className="ml-auto" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
