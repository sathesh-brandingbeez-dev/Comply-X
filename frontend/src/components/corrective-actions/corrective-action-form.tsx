"use client"

import { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Loader2, PlusCircle, Sparkles, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import {
  CorrectiveActionAIRequest,
  CorrectiveActionAIResponse,
  CorrectiveActionFormValues,
  CorrectiveActionOptionsResponse,
  CorrectiveActionPriority,
  CorrectiveActionStepInput,
  CorrectiveActionStepStatus,
} from '@/types/corrective-actions'

interface CorrectiveActionFormProps {
  options?: CorrectiveActionOptionsResponse
  onCreated?: () => void
}

const PRIORITY_OPTIONS: CorrectiveActionPriority[] = ['Low', 'Medium', 'High', 'Critical']
const DEFAULT_STEP: CorrectiveActionStepInput = { description: '', status: 'Not Started' }

export function CorrectiveActionForm({ options, onCreated }: CorrectiveActionFormProps) {
  const defaultOwnerId = options?.users[0]?.id ?? 0

  const defaultValues = useMemo<CorrectiveActionFormValues>(
    () => ({
      title: '',
      action_type: options?.action_types[0] ?? 'Short-term Corrective Action',
      source_reference: options?.source_references[0] ?? 'Incident Report',
      reference_id: '',
      department_ids: [],
      priority: 'High',
      impact: 'High',
      urgency: 'High',
      problem_statement: '',
      root_cause: '',
      contributing_factors: '',
      impact_assessment: '',
      current_controls: '',
      evidence_files: [],
      corrective_action_description: '',
      steps: [DEFAULT_STEP],
      overall_due_date: new Date().toISOString().slice(0, 10),
      action_owner_id: defaultOwnerId,
      review_team_ids: [],
      budget_required: undefined,
      approval_required: false,
      approver_id: undefined,
      evaluation_due_date: undefined,
      evaluation_method: options?.evaluation_methods[0],
      success_metrics: [],
    }),
    [defaultOwnerId, options]
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CorrectiveActionFormValues>({
    defaultValues,
  })

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: 'steps' })
  const {
    fields: metricFields,
    append: appendMetric,
    remove: removeMetric,
  } = useFieldArray({ control, name: 'success_metrics' })

  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([])
  const [selectedReviewTeam, setSelectedReviewTeam] = useState<number[]>([])
  const [aiResponse, setAiResponse] = useState<CorrectiveActionAIResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [evidenceNotes, setEvidenceNotes] = useState('')

  const approvalRequired = watch('approval_required')
  const selectedOwnerId = watch('action_owner_id')

  useEffect(() => {
    if (!options) return
    if (!selectedOwnerId && options.users.length) {
      setValue('action_owner_id', options.users[0].id)
    }
  }, [options, selectedOwnerId, setValue])

  useEffect(() => {
    setValue('department_ids', selectedDepartments)
  }, [selectedDepartments, setValue])

  useEffect(() => {
    setValue('review_team_ids', selectedReviewTeam)
  }, [selectedReviewTeam, setValue])

  const toggleDepartment = (deptId: number) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  const toggleReviewer = (userId: number) => {
    setSelectedReviewTeam((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const ownerOptions = options?.users ?? []

  const handleAiAssist = async () => {
    if (!options) return
    const formValues = watch()
    if (!formValues.problem_statement || !formValues.root_cause || !formValues.impact_assessment) {
      setErrorMessage('Provide problem statement, root cause, and impact assessment for AI assistance.')
      return
    }
    setAiLoading(true)
    setErrorMessage(null)
    try {
      const sanitizedSteps = (formValues.steps ?? []).map((step) => ({
        ...step,
        due_date: step.due_date ? step.due_date : undefined,
        completion_date: step.completion_date ? step.completion_date : undefined,
      }))

      const payload: CorrectiveActionAIRequest = {
        action_type: formValues.action_type,
        priority: formValues.priority,
        impact: formValues.impact,
        urgency: formValues.urgency,
        problem_statement: formValues.problem_statement,
        root_cause: formValues.root_cause,
        impact_assessment: formValues.impact_assessment,
        current_controls: formValues.current_controls,
        existing_steps: sanitizedSteps,
      }
      const response = await api<CorrectiveActionAIResponse>('/corrective-actions/ai/assist', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setAiResponse(response)
      setFormMessage('AI recommendations generated. Review insights below.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to generate AI recommendations at this time.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiSteps = () => {
    if (!aiResponse?.recommended_steps?.length) return
    aiResponse.recommended_steps.forEach((step) => appendStep(step))
    setFormMessage('AI steps added to the implementation plan.')
  }

  const applyAiMetrics = () => {
    if (!aiResponse?.recommended_metrics?.length) return
    aiResponse.recommended_metrics.forEach((metric) => appendMetric(metric))
    setFormMessage('AI metrics added to success criteria.')
  }

  const onSubmit = async (values: CorrectiveActionFormValues) => {
    if (!options) return
    setSubmitting(true)
    setErrorMessage(null)
    setFormMessage(null)
    try {
      const evidenceFiles = evidenceNotes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((entry, index) => ({
          file_name: entry,
          file_url: entry.startsWith('http') ? entry : undefined,
          uploaded_by_id: undefined,
          uploaded_at: undefined,
          file_type: undefined,
        }))

        const stepsPayload = values.steps.map((step) => ({
        ...step,
        status: step.status ?? 'Not Started',
        due_date: step.due_date ? step.due_date : undefined,
        completion_date: step.completion_date ? step.completion_date : undefined,
      }))

      const metricsPayload = values.success_metrics.map((metric) => ({
        ...metric,
        measurement_date: metric.measurement_date ? metric.measurement_date : undefined,
      }))

      const payload = {
        ...values,
        department_ids: selectedDepartments,
        review_team_ids: selectedReviewTeam,
        action_owner_id: Number(values.action_owner_id),
        approver_id: values.approver_id ? Number(values.approver_id) : undefined,
        budget_required:
          values.budget_required != null ? Number(values.budget_required) : undefined,
        evaluation_due_date: values.evaluation_due_date ? values.evaluation_due_date : undefined,
        evidence_files: evidenceFiles,
        steps: stepsPayload,
        success_metrics: metricsPayload,
      }

      await api('/corrective-actions', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setFormMessage('Corrective action created successfully.')
      setAiResponse(null)
      setEvidenceNotes('')
      setSelectedDepartments([])
      setSelectedReviewTeam([])
      reset(defaultValues)
      if (onCreated) onCreated()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create corrective action.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!options) {
    return (
      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle>Corrective Action Plan</CardTitle>
          <CardDescription>Loading form configuration…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Corrective Action Details</CardTitle>
          <CardDescription>Define action metadata, context, and desired outcome.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Action Title</Label>
            <Input id="title" placeholder="Summarise the corrective action" {...register('title', { required: true })} />
            {errors.title && <p className="text-xs text-red-500">Title is required.</p>}
          </div>

          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={watch('action_type')} onValueChange={(value) => setValue('action_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.action_types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source Reference</Label>
            <Select value={watch('source_reference')} onValueChange={(value) => setValue('source_reference', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.source_references.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference_id">Reference ID</Label>
            <Input id="reference_id" placeholder="Link to incident, audit, or record" {...register('reference_id')} />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={watch('priority')} onValueChange={(value) => setValue('priority', value as CorrectiveActionPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Impact</Label>
            <Select value={watch('impact')} onValueChange={(value) => setValue('impact', value as CorrectiveActionPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((impact) => (
                  <SelectItem key={impact} value={impact}>
                    {impact}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select value={watch('urgency')} onValueChange={(value) => setValue('urgency', value as CorrectiveActionPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((urgency) => (
                  <SelectItem key={urgency} value={urgency}>
                    {urgency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overall_due_date">Overall Due Date</Label>
            <Input id="overall_due_date" type="date" {...register('overall_due_date', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>Action Owner</Label>
            <Select
              value={String(watch('action_owner_id') ?? '')}
              onValueChange={(value) => setValue('action_owner_id', Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Department(s)</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.departments.map((dept) => (
                <label key={dept.id} className="flex items-center gap-2 rounded-md border border-green-100 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-green-200"
                    checked={selectedDepartments.includes(dept.id)}
                    onChange={() => toggleDepartment(dept.id)}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{dept.name}</span>
                    {dept.code && <span className="ml-1 text-xs text-muted-foreground">({dept.code})</span>}
                  </span>
                </label>
              ))}
            </div>
            {selectedDepartments.length === 0 && (
              <p className="text-xs text-amber-600">Select at least one department.</p>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="problem_statement">Problem Statement</Label>
            <Textarea
              id="problem_statement"
              rows={3}
              placeholder="Describe the problem and observed symptoms"
              {...register('problem_statement', { required: true })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="root_cause">Root Cause</Label>
            <Textarea
              id="root_cause"
              rows={3}
              placeholder="Summarise the confirmed root cause"
              {...register('root_cause', { required: true })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="contributing_factors">Contributing Factors</Label>
            <Textarea
              id="contributing_factors"
              rows={2}
              placeholder="List contributing factors (optional)"
              {...register('contributing_factors')}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="impact_assessment">Impact Assessment</Label>
            <Textarea
              id="impact_assessment"
              rows={3}
              placeholder="Describe the operational, customer, or compliance impact"
              {...register('impact_assessment', { required: true })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="current_controls">Current Controls</Label>
            <Textarea
              id="current_controls"
              rows={2}
              placeholder="Document current controls or mitigations"
              {...register('current_controls')}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="corrective_action_description">Corrective Action Description</Label>
            <Textarea
              id="corrective_action_description"
              rows={3}
              placeholder="Outline the corrective strategy and objectives"
              {...register('corrective_action_description', { required: true })}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="evidence">Supporting Evidence Links</Label>
            <Textarea
              id="evidence"
              rows={3}
              placeholder="Paste links or filenames (one per line)"
              value={evidenceNotes}
              onChange={(event) => setEvidenceNotes(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Optional: reference documents, images, or logs.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-slate-900">AI Guidance</CardTitle>
            <CardDescription>
              Generate suggested steps, resources, and metrics based on risk profile and problem context.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleAiAssist} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate AI Plan
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!aiResponse?.recommended_steps?.length}
              onClick={applyAiSteps}
            >
              Apply Steps
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!aiResponse?.recommended_metrics?.length}
              onClick={applyAiMetrics}
            >
              Apply Metrics
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiResponse ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-green-100 bg-green-50/60 p-4">
                <h4 className="text-sm font-semibold text-slate-900">Predicted Effectiveness</h4>
                <p className="text-2xl font-bold text-primary">{aiResponse.insights.effectiveness_score?.toFixed(1) ?? '—'}%</p>
                <p className="text-xs text-muted-foreground">
                  Success probability {Math.round((aiResponse.insights.success_probability ?? 0) * 100)}%.
                </p>
              </div>
              <div className="rounded-lg border border-green-100 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Resource Recommendations</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {aiResponse.insights.resource_recommendations.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-green-100 bg-white p-4">
                <h4 className="text-sm font-semibold text-slate-900">Escalation Guidance</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  {aiResponse.insights.escalation_recommendations.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              {aiResponse.insights.timeline_advice && (
                <div className="rounded-lg border border-green-100 bg-white p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Timeline Advice</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{aiResponse.insights.timeline_advice}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Provide incident context and click “Generate AI Plan” to receive tailored recommendations.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Implementation Steps</CardTitle>
          <CardDescription>Break down the action plan into accountable steps with due dates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stepFields.map((field, index) => {
            const responsiblePersonId = watch(`steps.${index}.responsible_person_id` as const);
            return (
              <div key={field.id} className="rounded-lg border border-green-100 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Step {index + 1}</h4>
                  {stepFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2 space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    placeholder="Describe the step"
                    {...register(`steps.${index}.description` as const, { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsible Person</Label>
                  <Select
                    value={responsiblePersonId !== undefined ? String(responsiblePersonId) : undefined}
                    onValueChange={(value) =>
                      setValue(
                        `steps.${index}.responsible_person_id`,
                        value === "unassigned" ? undefined : Number(value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {ownerOptions.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" {...register(`steps.${index}.due_date` as const)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={watch(`steps.${index}.status`) ?? 'Not Started'}
                    onValueChange={(value) => setValue(`steps.${index}.status`, value as CorrectiveActionStepStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.step_statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resources Required</Label>
                  <Input {...register(`steps.${index}.resources_required` as const)} placeholder="People, tools, or budget" />
                </div>
                <div className="space-y-2">
                  <Label>Success Criteria</Label>
                  <Input {...register(`steps.${index}.success_criteria` as const)} placeholder="Completion definition" />
                </div>
              </div>
            </div>
            );
          })}
          <Button type="button" variant="outline" onClick={() => appendStep(DEFAULT_STEP)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Step
          </Button>
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Success Metrics</CardTitle>
          <CardDescription>Define how effectiveness will be evaluated post implementation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricFields.map((field, index) => (
            <div key={field.id} className="grid gap-3 md:grid-cols-4 rounded-lg border border-green-100 p-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Metric Name</Label>
                <Input {...register(`success_metrics.${index}.metric_name` as const, { required: true })} placeholder="e.g. Defect rate" />
              </div>
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input {...register(`success_metrics.${index}.target_value` as const)} placeholder="e.g. &lt; 2%" />
              </div>
              <div className="space-y-2">
                <Label>Measurement Method</Label>
                <Input {...register(`success_metrics.${index}.measurement_method` as const)} placeholder="Audit, sampling…" />
              </div>
              <div className="space-y-2">
                <Label>Measurement Date</Label>
                <Input type="date" {...register(`success_metrics.${index}.measurement_date` as const)} />
              </div>
              <div className="space-y-2">
                <Label>Actual Value</Label>
                <Input {...register(`success_metrics.${index}.actual_value` as const)} placeholder="Update post evaluation" />
              </div>
              <div className="flex items-end justify-end">
                <Button type="button" variant="ghost" size="icon" onClick={() => removeMetric(index)}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => appendMetric({ metric_name: '' })} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Metric
          </Button>
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Governance & Approvals</CardTitle>
          <CardDescription>Select reviewers, budget considerations, and approval routing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label>Review Team</Label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {options.users.map((user) => (
                <label key={user.id} className="flex items-center gap-2 rounded-md border border-green-100 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-green-200"
                    checked={selectedReviewTeam.includes(user.id)}
                    onChange={() => toggleReviewer(user.id)}
                  />
                  <span className="text-slate-900">{user.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_required">Budget Required (optional)</Label>
            <Input id="budget_required" type="number" step="0.01" {...register('budget_required', { valueAsNumber: true })} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-green-100 px-3 py-2">
            <div>
              <Label className="text-sm font-medium text-slate-900">Approval Required</Label>
              <p className="text-xs text-muted-foreground">Toggle if leadership approval is needed.</p>
            </div>
            <Switch checked={approvalRequired} onCheckedChange={(checked) => setValue('approval_required', checked)} />
          </div>

          {approvalRequired && (
            <div className="space-y-2">
              <Label>Approver</Label>
              <Select
                value={watch('approver_id') ? String(watch('approver_id')) : ''}
                onValueChange={(value) => setValue('approver_id', value ? Number(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Evaluation Method</Label>
            <Select
              value={watch('evaluation_method') ?? ''}
              onValueChange={(value) => setValue('evaluation_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {options.evaluation_methods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluation_due_date">Evaluation Due Date</Label>
            <Input id="evaluation_due_date" type="date" {...register('evaluation_due_date')} />
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {errorMessage}
        </div>
      )}
      {formMessage && !errorMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{formMessage}</div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => reset()} disabled={submitting}>
          Reset
        </Button>
        <Button type="submit" disabled={submitting || selectedDepartments.length === 0}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Corrective Action
        </Button>
      </div>
    </form>
  )
}
