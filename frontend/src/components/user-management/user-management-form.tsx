'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, BrainCircuit, Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type {
  PermissionLevel,
  UserManagementAIRequest,
  UserManagementAIResponse,
  UserManagementCreate,
  UserManagementOnboardingStepInput,
  UserManagementOptionsResponse,
  UserRole,
} from '@/types/user-management'

interface UserManagementFormProps {
  options?: UserManagementOptionsResponse
  onCreated: () => void
}

const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.string().min(1, 'Select a role'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department_id: z.string().optional(),
  permission_level: z.string().min(1, 'Select a permission level'),
  phone: z.string().optional(),
  position: z.string().optional(),
  employee_id: z.string().optional(),
  reporting_manager_id: z.string().optional(),
  timezone: z.string().optional(),
  notifications_email: z.boolean(),
  notifications_sms: z.boolean(),
  is_active: z.boolean(),
  is_verified: z.boolean(),
  mfa_enabled: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

const experienceLevels: { label: string; value: 'junior' | 'mid' | 'senior' }[] = [
  { label: 'Junior', value: 'junior' },
  { label: 'Mid-level', value: 'mid' },
  { label: 'Senior', value: 'senior' },
]

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function UserManagementForm({ options, onCreated }: UserManagementFormProps) {
  const [responsibilitiesText, setResponsibilitiesText] = useState('Policy compliance\nRisk ownership')
  const [onboardingSteps, setOnboardingSteps] = useState<UserManagementOnboardingStepInput[]>([])
  const [aiResponse, setAiResponse] = useState<UserManagementAIResponse | undefined>()
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [experienceLevel, setExperienceLevel] = useState<'junior' | 'mid' | 'senior'>('mid')
  const [remoteWorker, setRemoteWorker] = useState(false)
  const [toolStack, setToolStack] = useState('Comply-X Core')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [successMessage, setSuccessMessage] = useState<string | undefined>()

  const UNASSIGNED_VALUE = '__none__'

  const departmentMap = useMemo(() => {
    const map = new Map<number, string>()
    options?.departments.forEach((dept) => map.set(dept.id, dept.name))
    return map
  }, [options?.departments])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      username: '',
      role: options?.roles[0] ?? 'employee',
      password: '',
      department_id: undefined,
      permission_level: options?.permission_levels[0] ?? 'view_only',
      phone: '',
      position: '',
      employee_id: '',
      reporting_manager_id: undefined,
      timezone: options?.timezones[0] ?? 'UTC',
      notifications_email: true,
      notifications_sms: false,
      is_active: true,
      is_verified: false,
      mfa_enabled: false,
    },
  })

  const { register, handleSubmit, setValue, watch, reset, formState } = form
  const roleValue = watch('role') as UserRole

  const responsibilities = useMemo(
    () =>
      responsibilitiesText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    [responsibilitiesText]
  )

  const handleAddStep = () => {
    setOnboardingSteps((prev) => [
      ...prev,
      {
        title: 'Define onboarding milestone',
        owner_role: 'Team Lead',
        due_in_days: 7,
        notes: '',
      },
    ])
  }

  const handleStepChange = (index: number, patch: Partial<UserManagementOnboardingStepInput>) => {
    setOnboardingSteps((prev) => prev.map((step, idx) => (idx === index ? { ...step, ...patch } : step)))
  }

  const handleRemoveStep = (index: number) => {
    setOnboardingSteps((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleGeneratePassword = () => {
    const pwd = generatePassword()
    setValue('password', pwd)
    setSuccessMessage('Secure password generated. Remember to share it securely with the user.')
  }

  const handleAiAssist = async () => {
    if (!options) return
    setAiLoading(true)
    setErrorMessage(undefined)
    try {
      const departmentId = form.getValues('department_id')
      const aiPayload: UserManagementAIRequest = {
        role: roleValue,
        department: departmentId ? departmentMap.get(Number(departmentId)) ?? null : null,
        responsibilities,
        experience_level: experienceLevel,
        requires_mfa: !form.getValues('mfa_enabled'),
        remote_worker: remoteWorker,
        tool_stack: toolStack
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      }
      const response = await api<UserManagementAIResponse>('/user-management/ai/assist', {
        method: 'POST',
        body: JSON.stringify(aiPayload),
      })
      setAiResponse(response)
      setOnboardingSteps(response.recommended_steps)
      setSuccessMessage('AI onboarding plan prepared. Review and tailor before publishing.')
    } catch (error) {
      console.error('Unable to generate AI guidance', error)
      setErrorMessage('Unable to generate AI guidance right now. Please try again shortly.')
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    setErrorMessage(undefined)
    setSuccessMessage(undefined)
    try {
      const payload: UserManagementCreate = {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        username: values.username,
        role: values.role as UserRole,
        password: values.password,
        department_id: values.department_id ? Number(values.department_id) : undefined,
        permission_level: values.permission_level as PermissionLevel,
        phone: values.phone || undefined,
        position: values.position || undefined,
        employee_id: values.employee_id || undefined,
        reporting_manager_id: values.reporting_manager_id ? Number(values.reporting_manager_id) : undefined,
        areas_of_responsibility: responsibilities,
        timezone: values.timezone || undefined,
        notifications_email: values.notifications_email,
        notifications_sms: values.notifications_sms,
        is_active: values.is_active,
        is_verified: values.is_verified,
        mfa_enabled: values.mfa_enabled,
        onboarding_steps: onboardingSteps,
      }

      await api('/user-management', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setSuccessMessage('User created successfully and onboarding plan captured.')
      setOnboardingSteps([])
      setAiResponse(undefined)
      setResponsibilitiesText('Policy compliance\nRisk ownership')
      reset({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        role: values.role,
        password: '',
        department_id: undefined,
        permission_level: values.permission_level,
        phone: '',
        position: '',
        employee_id: '',
        reporting_manager_id: undefined,
        timezone: values.timezone,
        notifications_email: true,
        notifications_sms: false,
        is_active: true,
        is_verified: false,
        mfa_enabled: false,
      })
      onCreated()
    } catch (error) {
      console.error('Unable to create user', error)
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">Create User Account</CardTitle>
        <CardDescription>
          Provision users, define governance context, and launch an AI-assisted onboarding journey.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" placeholder="Jane" {...register('first_name')} />
              {formState.errors.first_name && (
                <p className="text-xs text-red-500">{formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" placeholder="Doe" {...register('last_name')} />
              {formState.errors.last_name && (
                <p className="text-xs text-red-500">{formState.errors.last_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <Input id="email" type="email" placeholder="jane.doe@company.com" {...register('email')} />
              {formState.errors.email && <p className="text-xs text-red-500">{formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="jane.doe" {...register('username')} />
              {formState.errors.username && (
                <p className="text-xs text-red-500">{formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={roleValue} onValueChange={(value) => setValue('role', value)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {options?.roles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select
                value={watch('department_id') ?? UNASSIGNED_VALUE}
                onValueChange={(value) =>
                  setValue('department_id', value === UNASSIGNED_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="department_id">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {options?.departments.map((dept) => (
                    <SelectItem key={dept.id} value={String(dept.id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission_level">Permission Level</Label>
              <Select
                value={watch('permission_level')}
                onValueChange={(value) => setValue('permission_level', value as PermissionLevel)}
              >
                <SelectTrigger id="permission_level">
                  <SelectValue placeholder="Select permission" />
                </SelectTrigger>
                <SelectContent>
                  {options?.permission_levels.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_manager_id">Reporting Manager</Label>
              <Select
                value={watch('reporting_manager_id') ?? UNASSIGNED_VALUE}
                onValueChange={(value) =>
                  setValue('reporting_manager_id', value === UNASSIGNED_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="reporting_manager_id">
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {options?.managers.map((manager) => (
                    <SelectItem key={manager.id} value={String(manager.id)}>
                      {manager.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+1 555 123 4567" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" placeholder="Compliance Manager" {...register('position')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID</Label>
              <Input id="employee_id" placeholder="EMP-00123" {...register('employee_id')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={watch('timezone') ?? 'UTC'} onValueChange={(value) => setValue('timezone', value)}>
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {options?.timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex items-center gap-2">
                <Input id="password" type="text" placeholder="Generate secure password" {...register('password')} />
                <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                  Generate
                </Button>
              </div>
              {formState.errors.password && (
                <p className="text-xs text-red-500">{formState.errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Responsibilities</Label>
              <Textarea
                value={responsibilitiesText}
                onChange={(event) => setResponsibilitiesText(event.target.value)}
                rows={5}
                placeholder={'Policy compliance\nRisk ownership'}
              />
              <p className="text-xs text-muted-foreground">
                Enter one responsibility per line. These guide AI recommendations and access insights.
              </p>
            </div>
            <div className="space-y-3 rounded-md border border-green-200 p-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI Onboarding Guidance</p>
                  <p className="text-xs text-muted-foreground">Fine-tune before generating the automated plan.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Experience Level</Label>
                  <Select value={experienceLevel} onValueChange={(value) => setExperienceLevel(value as typeof experienceLevel)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tool_stack">Tool Stack</Label>
                  <Input
                    id="tool_stack"
                    value={toolStack}
                    onChange={(event) => setToolStack(event.target.value)}
                    placeholder="Comma-separated applications"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Remote Worker</p>
                    <p className="text-[11px] text-muted-foreground">Add remote-readiness tasks.</p>
                  </div>
                  <Switch checked={remoteWorker} onCheckedChange={setRemoteWorker} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Require MFA</p>
                    <p className="text-[11px] text-muted-foreground">Prioritise secure access setup.</p>
                  </div>
                  <Switch checked={!watch('mfa_enabled')} onCheckedChange={(value) => setValue('mfa_enabled', !value)} />
                </div>
              </div>
              <Button type="button" variant="secondary" disabled={aiLoading} onClick={handleAiAssist} className="w-full">
                {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate AI Onboarding Plan
              </Button>
              {aiResponse && (
                <div className="rounded-md border border-green-100 bg-green-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">AI Recommendations</p>
                  <p className="mt-1">Permissions: {aiResponse.recommended_permissions.join(', ') || 'Default role-based'}</p>
                  <p className="mt-1">Resources: {aiResponse.resource_recommendations.join(', ') || 'Standard onboarding kits'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Implementation Steps</h3>
                <p className="text-xs text-muted-foreground">
                  Sequenced onboarding steps with ownership and timing for a smooth start.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                <Plus className="mr-1 h-4 w-4" /> Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-md border border-green-100 bg-green-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-green-700">Step Title</Label>
                      <Input
                        value={step.title}
                        onChange={(event) => handleStepChange(index, { title: event.target.value })}
                      />
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Owner Role</Label>
                          <Input
                            value={step.owner_role ?? ''}
                            onChange={(event) => handleStepChange(index, { owner_role: event.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Due in (days)</Label>
                          <Input
                            type="number"
                            value={step.due_in_days ?? ''}
                            onChange={(event) =>
                              handleStepChange(index, {
                                due_in_days: event.target.value ? Number(event.target.value) : undefined,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Notes</Label>
                          <Input
                            value={step.notes ?? ''}
                            onChange={(event) => handleStepChange(index, { notes: event.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStep(index)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!onboardingSteps.length && (
                <div className="rounded-md border border-dashed border-green-200 p-4 text-sm text-muted-foreground">
                  Use AI assist or manually add steps to orchestrate the onboarding journey.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Active</p>
                <p className="text-[11px] text-muted-foreground">Allow immediate system access.</p>
              </div>
              <Switch checked={watch('is_active')} onCheckedChange={(value) => setValue('is_active', value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Verified</p>
                <p className="text-[11px] text-muted-foreground">Mark identity verification complete.</p>
              </div>
              <Switch checked={watch('is_verified')} onCheckedChange={(value) => setValue('is_verified', value)} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Notifications (Email)</p>
                <p className="text-[11px] text-muted-foreground">Send alerts via email.</p>
              </div>
              <Switch
                checked={watch('notifications_email')}
                onCheckedChange={(value) => setValue('notifications_email', value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">Notifications (SMS)</p>
                <p className="text-[11px] text-muted-foreground">Enable mobile alerts.</p>
              </div>
              <Switch
                checked={watch('notifications_sms')}
                onCheckedChange={(value) => setValue('notifications_sms', value)}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <Sparkles className="mt-0.5 h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {responsibilities.map((item) => (
                <Badge key={item} variant="secondary" className="bg-green-100 text-green-700">
                  {item}
                </Badge>
              ))}
            </div>
            <Button type="submit" disabled={submitting} className="sm:w-auto">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
              Create User
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
