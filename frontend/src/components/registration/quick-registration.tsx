"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registrationService, RegistrationResponse, QuickCompanyRegistrationPayload } from '@/lib/registration'

const quickSchema = z
  .object({
    company_name: z.string().min(1, 'Company name is required'),
    industry: z.string().min(1, 'Select an industry'),
    company_size: z.string().min(1, 'Select company size'),
    country: z.string().min(1, 'Select country'),
    website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    admin_first_name: z.string().min(1, 'First name is required'),
    admin_last_name: z.string().min(1, 'Last name is required'),
    admin_email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must contain at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm your password'),
    use_default_departments: z.boolean(),
    configure_departments_later: z.boolean(),
    use_standard_frameworks: z.boolean(),
    configure_frameworks_later: z.boolean(),
    accept_terms: z.boolean().refine((value) => value === true, 'You must accept the terms'),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

type QuickFormValues = z.infer<typeof quickSchema>

interface QuickRegistrationProps {
  onComplete?: (response: RegistrationResponse) => void
}

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

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'India', 'Singapore', 'Australia', 'United Arab Emirates']

export function QuickCompanyRegistration({ onComplete }: QuickRegistrationProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RegistrationResponse | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuickFormValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      industry: 'Technology',
      company_size: '51-200 employees',
      country: 'United States',
      use_default_departments: true,
      configure_departments_later: false,
      use_standard_frameworks: true,
      configure_frameworks_later: false,
      accept_terms: false,
    },
  })

  const onSubmit = async (values: QuickFormValues) => {
    setSubmitting(true)
    setError('')
    try {
      const payload: QuickCompanyRegistrationPayload = {
        company_name: values.company_name,
        industry: values.industry,
        company_size: values.company_size,
        country: values.country,
        website: values.website || undefined,
        admin_first_name: values.admin_first_name,
        admin_last_name: values.admin_last_name,
        admin_email: values.admin_email,
        password: values.password,
        use_default_departments: values.use_default_departments,
        configure_departments_later: values.configure_departments_later,
        use_standard_frameworks: values.use_standard_frameworks,
        configure_frameworks_later: values.configure_frameworks_later,
        permission_level: 'admin',
        role: 'admin',
        setup_score: calculateSetupScore(values),
      }

      const response = await registrationService.submitQuick(payload)
      setResult(response)
      if (onComplete) {
        onComplete(response)
      }
    } catch (err: any) {
      const message = err?.response?.data?.detail || 'Unable to complete quick registration. Try again later.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <Card className="border-sky-500/40 bg-slate-950/80 text-slate-100">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Quick setup submitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <p>We&apos;ve queued your workspace with standard departments and frameworks.</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-300">
            {result.recommended_actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
          {result.setup_score && (
            <p className="text-sky-200">AI onboarding readiness score: {result.setup_score}/100</p>
          )}
        </CardContent>
        <CardFooter>
          <Button asChild className="bg-sky-500 text-white hover:bg-sky-400">
            <a href="/login">Continue to sign in</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const watchDepartmentsLater = watch('configure_departments_later')
  const watchFrameworksLater = watch('configure_frameworks_later')

  return (
    <Card className="border border-white/10 bg-slate-950/80 text-slate-100">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-2xl text-white">Quick Company Setup</CardTitle>
          <p className="text-sm text-slate-300">AI will pre-fill defaults so you can launch in minutes.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Company Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input id="company_name" placeholder="Acme Corporation" {...register('company_name')} />
                {errors.company_name && <p className="text-xs text-red-300">{errors.company_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <select id="industry" className="rounded-md border border-white/20 bg-slate-900/80 px-3 py-2" {...register('industry')}>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
                {errors.industry && <p className="text-xs text-red-300">{errors.industry.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_size">Company Size *</Label>
                <select id="company_size" className="rounded-md border border-white/20 bg-slate-900/80 px-3 py-2" {...register('company_size')}>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {errors.company_size && <p className="text-xs text-red-300">{errors.company_size.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <select id="country" className="rounded-md border border-white/20 bg-slate-900/80 px-3 py-2" {...register('country')}>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                {errors.country && <p className="text-xs text-red-300">{errors.country.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.acme.com" {...register('website')} />
                {errors.website && <p className="text-xs text-red-300">{errors.website.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Administrator Account</h3>
            <div className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="admin_email">Email *</Label>
                <Input id="admin_email" type="email" placeholder="jane.doe@company.com" {...register('admin_email')} />
                {errors.admin_email && <p className="text-xs text-red-300">{errors.admin_email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" placeholder="Create a strong password" {...register('password')} />
                {errors.password && <p className="text-xs text-red-300">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input id="confirm_password" type="password" placeholder="Confirm password" {...register('confirm_password')} />
                {errors.confirm_password && <p className="text-xs text-red-300">{errors.confirm_password.message}</p>}
              </div>
            </div>
            <label className="flex items-start space-x-2 text-sm text-slate-200">
              <input type="checkbox" className="mt-1" {...register('accept_terms')} />
              <span>
                I agree to the{' '}
                <a href="/terms" className="text-sky-300 underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-sky-300 underline">Privacy Policy</a>.
              </span>
            </label>
            {errors.accept_terms && <p className="text-xs text-red-300">{errors.accept_terms.message}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Quick Setup Options</h3>
            <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={watch('use_default_departments')}
                  onChange={() => {
                    setValue('use_default_departments', true)
                    setValue('configure_departments_later', false)
                  }}
                />
                <span>Use default departments</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={watchDepartmentsLater}
                  onChange={() => {
                    setValue('use_default_departments', false)
                    setValue('configure_departments_later', true)
                  }}
                />
                <span>I&apos;ll configure departments later</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={watch('use_standard_frameworks')}
                  onChange={() => {
                    setValue('use_standard_frameworks', true)
                    setValue('configure_frameworks_later', false)
                  }}
                />
                <span>Use standard compliance frameworks</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={watchFrameworksLater}
                  onChange={() => {
                    setValue('use_standard_frameworks', false)
                    setValue('configure_frameworks_later', true)
                  }}
                />
                <span>I&apos;ll configure compliance frameworks later</span>
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-white/5 bg-slate-900/40 p-6">
          <Button type="submit" disabled={submitting} className="bg-sky-500 text-white hover:bg-sky-400">
            {submitting ? 'Submitting…' : 'Create Account'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function calculateSetupScore(values: QuickFormValues) {
  let score = 50
  if (values.use_default_departments) score += 10
  if (values.use_standard_frameworks) score += 10
  if (!values.configure_departments_later) score += 10
  if (!values.configure_frameworks_later) score += 10
  if (values.password.length >= 12) score += 10
  return Math.min(100, score)
}

