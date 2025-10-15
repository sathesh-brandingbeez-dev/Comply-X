"use client"

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CompanyRegistrationPayload,
  RegistrationDepartment,
  RegistrationFramework,
  RegistrationResponse,
  RegistrationSuggestions,
  registrationService,
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

const ADMIN_DEPARTMENTS = [
  'Compliance',
  'Legal',
  'Risk Management',
  'Quality Assurance',
  'Operations',
  'IT',
  'Executive',
  'Other',
]

const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IN', name: 'India' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'AE', name: 'United Arab Emirates' },
]

const TIMEZONE_BY_COUNTRY: Record<string, string[]> = {
  US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  CA: ['America/Toronto', 'America/Vancouver', 'America/Edmonton'],
  GB: ['Europe/London'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  IN: ['Asia/Kolkata'],
  SG: ['Asia/Singapore'],
  AU: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'],
  AE: ['Asia/Dubai'],
}

const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'Contains an uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Contains a lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'Contains a number', test: (value: string) => /[0-9]/.test(value) },
  { id: 'special', label: 'Contains a special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

const wizardSchema = z
  .object({
    company_name: z.string().min(1, 'Company name is required').max(100),
    industry: z.string().min(1, 'Select an industry'),
    company_size: z.string().min(1, 'Select a company size'),
    country: z.string().min(1, 'Select a country'),
    time_zone: z.string().min(1, 'Select a time zone'),
    website: z.string().url('Provide a valid URL').optional().or(z.literal('')),

    admin_first_name: z.string().min(1, 'First name is required').max(50),
    admin_last_name: z.string().min(1, 'Last name is required').max(50),
    admin_email: z.string().email('Enter a valid email'),
    admin_phone: z.string().optional(),
    admin_job_title: z.string().min(1, 'Job title is required').max(100),
    admin_department: z.string().min(1, 'Select a department'),
    password: z.string().min(8, 'Password must contain at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm your password'),
    accept_terms: z.boolean().refine((value) => value === true, 'You must accept the terms to continue'),

    departments: z.array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        parent_department: z.string().max(100).optional(),
      }),
    ),
    frameworks: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        category: z.string(),
        estimated_timeline: z.string().optional(),
      }),
    ),
    custom_frameworks: z.array(
      z.object({
        name: z.string().min(1, 'Provide a framework name'),
        description: z.string().max(300).optional(),
      }),
    ),
    recommended_modules: z.array(z.string()),
    estimated_setup_time: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

type WizardFormValues = z.infer<typeof wizardSchema>

interface CompanyWizardProps {
  onComplete?: (response: RegistrationResponse) => void
}

const steps = [
  { id: 1, title: 'Company Information', description: 'Tell us about your organization' },
  { id: 2, title: 'Administrator Account', description: 'Secure your primary access' },
  { id: 3, title: 'Department Structure', description: 'Model your organization' },
  { id: 4, title: 'Compliance Frameworks', description: 'Select the standards you follow' },
]

export function CompanyRegistrationWizard({ onComplete }: CompanyWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [suggestions, setSuggestions] = useState<RegistrationSuggestions | null>(null)
  const [passwordSuggestion, setPasswordSuggestion] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<RegistrationResponse | null>(null)
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
    reset,
  } = useForm<WizardFormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      industry: 'Technology',
      company_size: '51-200 employees',
      country: 'US',
      time_zone: 'America/New_York',
      departments: [],
      frameworks: [],
      custom_frameworks: [],
      recommended_modules: [],
      accept_terms: false,
    },
  })

  const watchedIndustry = watch('industry')
  const watchedCompanySize = watch('company_size')
  const selectedCountry = watch('country')
  const passwordValue = watch('password')
  const departments = watch('departments')
  const frameworks = watch('frameworks')
  const customFrameworks = watch('custom_frameworks')

  const progress = (currentStep / steps.length) * 100

  const passwordScore = useMemo(() => {
    let score = 0
    passwordRequirements.forEach((requirement) => {
      if (requirement.test(passwordValue || '')) {
        score += 20
      }
    })
    return score
  }, [passwordValue])

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const data = await registrationService.getSuggestions(watchedIndustry, watchedCompanySize)
        setSuggestions(data)
        setValue('frameworks', data.frameworks)
        setValue('departments', data.departments)
        setValue('recommended_modules', data.recommended_modules)
        setValue('estimated_setup_time', data.estimated_setup_time)
      } catch (err) {
        console.error('Failed to load registration suggestions', err)
      }
    }

    loadSuggestions()
  }, [watchedIndustry, watchedCompanySize, setValue])

  useEffect(() => {
    const timezones = TIMEZONE_BY_COUNTRY[selectedCountry]
    if (timezones && timezones.length > 0) {
      setValue('time_zone', timezones[0])
    }
  }, [selectedCountry, setValue])

  const handleNext = async () => {
    const fieldsByStep: Record<number, (keyof WizardFormValues)[]> = {
      1: ['company_name', 'industry', 'company_size', 'country', 'time_zone', 'website'],
      2: ['admin_first_name', 'admin_last_name', 'admin_email', 'admin_job_title', 'admin_department', 'password', 'confirm_password', 'accept_terms'],
      3: ['departments'],
      4: ['frameworks'],
    }

    const valid = await trigger(fieldsByStep[currentStep] ?? [])
    if (valid && currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1))
  }

  const addDepartment = () => {
    setValue('departments', [
      ...departments,
      { name: '', description: '', parent_department: undefined } as RegistrationDepartment,
    ])
  }

  const updateDepartment = (index: number, field: keyof RegistrationDepartment, value: string) => {
    const updated = departments.map((dept, idx) =>
      idx === index ? { ...dept, [field]: value } : dept,
    )
    setValue('departments', updated)
  }

  const removeDepartment = (index: number) => {
    const updated = departments.filter((_, idx) => idx !== index)
    setValue('departments', updated)
  }

  const toggleFramework = (framework: RegistrationFramework) => {
    const exists = frameworks.some((item) => item.key === framework.key)
    if (exists) {
      setValue('frameworks', frameworks.filter((item) => item.key !== framework.key))
    } else {
      setValue('frameworks', [...frameworks, framework])
    }
  }

  const addCustomFramework = (name: string, description?: string) => {
    setValue('custom_frameworks', [...customFrameworks, { name, description }])
  }

  const removeCustomFramework = (index: number) => {
    setValue('custom_frameworks', customFrameworks.filter((_, idx) => idx !== index))
  }

  const generatePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
    let suggestion = ''
    for (let i = 0; i < 14; i += 1) {
      suggestion += charset[Math.floor(Math.random() * charset.length)]
    }
    setPasswordSuggestion(suggestion)
    setValue('password', suggestion)
    setValue('confirm_password', suggestion)
  }

  const calculateSetupScore = () => {
    const frameworkWeight = frameworks.length * 5
    const departmentWeight = departments.length * 3
    const passwordWeight = passwordScore / 10
    return Math.min(100, Math.round(40 + frameworkWeight + departmentWeight + passwordWeight))
  }

  const onSubmit = async (values: WizardFormValues) => {
    setSubmitting(true)
    setError('')
    try {
      const payload: CompanyRegistrationPayload = {
        company_name: values.company_name,
        industry: values.industry,
        company_size: values.company_size,
        country: values.country,
        time_zone: values.time_zone,
        website: values.website || undefined,
        admin_first_name: values.admin_first_name,
        admin_last_name: values.admin_last_name,
        admin_email: values.admin_email,
        admin_phone: values.admin_phone,
        admin_job_title: values.admin_job_title,
        admin_department: values.admin_department,
        password: values.password,
        permission_level: 'admin',
        role: 'admin',
        departments: values.departments,
        frameworks: values.frameworks,
        custom_frameworks: values.custom_frameworks,
        recommended_modules: values.recommended_modules,
        estimated_setup_time: values.estimated_setup_time,
        quick_setup: false,
        setup_score: calculateSetupScore(),
      }

      const response = await registrationService.submitWizard(payload)
      setSubmissionResult(response)
      reset({ ...values, password: '', confirm_password: '', accept_terms: false })
      if (onComplete) {
        onComplete(response)
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Unable to complete registration. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submissionResult) {
    return (
      <Card className="border-sky-500/40 bg-slate-950/80 text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-3 text-2xl">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-6 w-6" />
            </span>
            <span>Registration submitted for review</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Your onboarding concierge will connect shortly to activate your workspace.</p>
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold text-white">Recommended next steps</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
              {submissionResult.recommended_actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>
          {submissionResult.setup_score && (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
              <p className="text-sm text-sky-100">
                AI onboarding readiness score: <span className="font-semibold text-white">{submissionResult.setup_score}/100</span>
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button onClick={() => setSubmissionResult(null)} variant="outline">
            Start another registration
          </Button>
          <Button asChild className="bg-sky-500 text-white hover:bg-sky-400">
            <a href="/login">Go to sign in</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="border border-white/10 bg-slate-950/80 text-slate-100">
      <CardHeader>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-sky-300">Step {currentStep} of {steps.length}</p>
            <CardTitle className="text-2xl text-white">{steps[currentStep - 1].title}</CardTitle>
            <p className="text-sm text-slate-300">{steps[currentStep - 1].description}</p>
          </div>
          <div className="hidden rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-200 lg:inline-flex">
            AI enhanced onboarding
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-8">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input id="company_name" placeholder="Acme Corporation" {...register('company_name')} />
                {errors.company_name && <p className="text-xs text-red-300">{errors.company_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={watchedIndustry} onValueChange={(value) => setValue('industry', value)}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select an industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry && <p className="text-xs text-red-300">{errors.industry.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_size">Company Size *</Label>
                <Select value={watchedCompanySize} onValueChange={(value) => setValue('company_size', value)}>
                  <SelectTrigger id="company_size">
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
                {errors.company_size && <p className="text-xs text-red-300">{errors.company_size.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={selectedCountry} onValueChange={(value) => setValue('country', value)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-red-300">{errors.country.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_zone">Time Zone *</Label>
                <Select value={watch('time_zone')} onValueChange={(value) => setValue('time_zone', value)}>
                  <SelectTrigger id="time_zone">
                    <SelectValue placeholder="Select a time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {(TIMEZONE_BY_COUNTRY[selectedCountry] ?? ['UTC']).map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.time_zone && <p className="text-xs text-red-300">{errors.time_zone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.acme.com" {...register('website')} />
                {errors.website && <p className="text-xs text-red-300">{errors.website.message}</p>}
              </div>
              <div className="md:col-span-2">
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-100">
                    <Sparkles className="h-4 w-4" /> AI Recommendation
                  </h3>
                  <p className="mt-2 text-sm text-sky-50">
                    {suggestions?.estimated_setup_time
                      ? `Estimated onboarding time: ${suggestions.estimated_setup_time}`
                      : 'We will tailor your onboarding roadmap as soon as you complete the wizard.'}
                  </p>
                  {suggestions?.recommended_modules?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestions.recommended_modules.map((module) => (
                        <span key={module} className="rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 text-xs text-sky-100">
                          {module}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin_first_name">First Name *</Label>
                <Input id="admin_first_name" placeholder="Jane" {...register('admin_first_name')} />
                {errors.admin_first_name && <p className="text-xs text-red-300">{errors.admin_first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_last_name">Last Name *</Label>
                <Input id="admin_last_name" placeholder="Doe" {...register('admin_last_name')} />
                {errors.admin_last_name && <p className="text-xs text-red-300">{errors.admin_last_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Email Address *</Label>
                <Input id="admin_email" type="email" placeholder="jane.doe@company.com" {...register('admin_email')} />
                {errors.admin_email && <p className="text-xs text-red-300">{errors.admin_email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_phone">Phone Number</Label>
                <Input id="admin_phone" placeholder="+1 555 0100" {...register('admin_phone')} />
                {errors.admin_phone && <p className="text-xs text-red-300">{errors.admin_phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_job_title">Job Title *</Label>
                <Input id="admin_job_title" placeholder="Head of Compliance" {...register('admin_job_title')} />
                {errors.admin_job_title && <p className="text-xs text-red-300">{errors.admin_job_title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_department">Department *</Label>
                <Select value={watch('admin_department')} onValueChange={(value) => setValue('admin_department', value)}>
                  <SelectTrigger id="admin_department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.admin_department && <p className="text-xs text-red-300">{errors.admin_department.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex items-center gap-3">
                  <Input id="password" type="password" placeholder="Create a secure password" {...register('password')} />
                  <Button type="button" variant="outline" className="text-xs" onClick={generatePassword}>
                    Suggest
                  </Button>
                </div>
                {passwordSuggestion && (
                  <p className="text-xs text-slate-400">Suggested password copied to fields.</p>
                )}
                {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
                <div className="mt-3 space-y-2">
                  <Progress value={passwordScore} className="h-2" />
                  <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
                    {passwordRequirements.map((requirement) => (
                      <div key={requirement.id} className="flex items-center space-x-2">
                        <span
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                            requirement.test(passwordValue || '')
                              ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/20 text-slate-500'
                          }`}
                        >
                          {requirement.test(passwordValue || '') ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input id="confirm_password" type="password" placeholder="Confirm password" {...register('confirm_password')} />
                {errors.confirm_password && <p className="text-xs text-red-300">{errors.confirm_password.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="flex items-start space-x-3 text-sm text-slate-200">
                  <input type="checkbox" className="mt-1" {...register('accept_terms')} />
                  <span>
                    I agree to the{' '}
                    <a href="/terms" className="text-sky-300 underline">Terms of Service</a> and{' '}
                    <a href="/privacy" className="text-sky-300 underline">Privacy Policy</a>.
                  </span>
                </label>
                {errors.accept_terms && <p className="text-xs text-red-300">{errors.accept_terms.message}</p>}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
                Start with suggested departments and tailor them to your structure. Parent departments allow hierarchical reporting.
              </div>
              <div className="space-y-4">
                {departments.map((department, index) => (
                  <div key={`${department.name}-${index}`} className="rounded-lg border border-white/10 bg-slate-900/60 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Department Name</Label>
                        <Input
                          value={department.name}
                          onChange={(event) => updateDepartment(index, 'name', event.target.value)}
                          placeholder="Compliance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Parent Department (optional)</Label>
                        <Input
                          value={department.parent_department ?? ''}
                          onChange={(event) => updateDepartment(index, 'parent_department', event.target.value)}
                          placeholder="Corporate Governance"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={department.description ?? ''}
                          onChange={(event) => updateDepartment(index, 'description', event.target.value)}
                          placeholder="Describe the responsibilities of this department"
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-xs text-slate-400">
                      <span>AI tip: Map each department to a compliance owner for reviewer workflows.</span>
                      <button type="button" onClick={() => removeDepartment(index)} className="text-red-300 hover:text-red-200">
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" className="flex items-center gap-2" onClick={addDepartment}>
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Select applicable frameworks</h3>
                  <p className="text-sm text-slate-300">
                    Choose one or more frameworks. AI will pre-configure control libraries and deadlines.
                  </p>
                  <div className="grid gap-3">
                    {(suggestions?.frameworks ?? []).map((framework) => {
                      const selected = frameworks.some((item) => item.key === framework.key)
                      return (
                        <button
                          type="button"
                          key={framework.key}
                          onClick={() => toggleFramework(framework)}
                          className={`rounded-lg border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-sky-500 bg-sky-500/20 text-white'
                              : 'border-white/10 bg-slate-900/60 text-slate-200 hover:border-sky-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>{framework.label}</span>
                            {selected && <Check className="h-4 w-4" />}
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{framework.category}</p>
                          {framework.estimated_timeline && (
                            <p className="mt-1 text-xs text-sky-200">Timeline: {framework.estimated_timeline}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Add custom frameworks</h3>
                  <p className="text-sm text-slate-300">
                    Include regional regulations or internal programs to keep everything in one workspace.
                  </p>
                  <CustomFrameworkForm onAdd={addCustomFramework} />
                  {customFrameworks.length > 0 && (
                    <div className="space-y-2 text-sm text-slate-200">
                      {customFrameworks.map((item, index) => (
                        <div key={`${item.name}-${index}`} className="flex items-start justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3">
                          <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            {item.description && <p className="text-xs text-slate-300">{item.description}</p>}
                          </div>
                          <button type="button" onClick={() => removeCustomFramework(index)} className="text-xs text-red-300 hover:text-red-200">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-100">
                    AI will generate implementation timelines and evidence templates once your workspace is activated.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-slate-900/40 p-6">
          <div className="text-xs text-slate-400">
            {suggestions?.estimated_setup_time && currentStep === 4 && (
              <>Projected go-live: <span className="text-sky-200">{suggestions.estimated_setup_time}</span></>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {currentStep === steps.length ? (
              <Button type="submit" disabled={submitting} className="bg-sky-500 text-white hover:bg-sky-400">
                {submitting ? 'Submitting…' : 'Complete Setup'}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} className="bg-sky-500 text-white hover:bg-sky-400">
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

interface CustomFrameworkFormProps {
  onAdd: (name: string, description?: string) => void
}

function CustomFrameworkForm({ onAdd }: CustomFrameworkFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const canAdd = name.trim().length > 0

  const handleAdd = () => {
    if (!canAdd) return
    onAdd(name.trim(), description.trim() || undefined)
    setName('')
    setDescription('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="custom_framework_name">Framework Name</Label>
        <Input
          id="custom_framework_name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="State Privacy Regulation"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custom_framework_description">Description</Label>
        <Textarea
          id="custom_framework_description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Brief description"
          rows={3}
        />
      </div>
      <Button type="button" onClick={handleAdd} disabled={!canAdd} className="bg-sky-500 text-white hover:bg-sky-400">
        Add Custom Framework
      </Button>
    </div>
  )
}

