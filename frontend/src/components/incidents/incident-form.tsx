"use client"

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  IncidentAttachmentInput,
  IncidentClassificationResponse,
  IncidentDuplicateDetectionResponse,
  IncidentFormValues,
  IncidentOptionsResponse,
  IncidentSeverity,
  IncidentSeverityAssessmentResponse,
  IncidentTimelineResponse,
} from '@/types/incidents'
import { api } from '@/lib/api'
import { AlertTriangle, Loader2, PlusCircle, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IncidentFormProps {
  options?: IncidentOptionsResponse
  onCreated?: () => void
}

interface AttachmentDraft extends IncidentAttachmentInput {
  id: string
}

const INCIDENT_SEVERITY_OPTIONS: IncidentSeverity[] = ['Low', 'Medium', 'High', 'Critical']

export function IncidentForm({ options, onCreated }: IncidentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<IncidentFormValues>({
    defaultValues: {
      title: '',
      incident_type: options?.incident_types[0] ?? 'Safety Incident',
      incident_category: undefined,
      department_id: undefined,
      occurred_at: new Date().toISOString().slice(0, 16),
      severity: 'Medium',
      impact_assessment: '',
      immediate_actions: '',
      detailed_description: '',
      what_happened: '',
      root_cause: '',
      contributing_factors: '',
      people_involved_ids: [],
      witness_ids: [],
      equipment_involved: '',
      immediate_notification_ids: [],
      escalation_path: undefined,
      external_notifications: [],
      public_disclosure_required: false,
      attachments: [],
    },
  })

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [categorySuggestion, setCategorySuggestion] = useState<IncidentClassificationResponse | null>(null)
  const [severitySuggestion, setSeveritySuggestion] = useState<IncidentSeverityAssessmentResponse | null>(null)
  const [duplicateMatches, setDuplicateMatches] = useState<IncidentDuplicateDetectionResponse | null>(null)
  const [timelineRecommendation, setTimelineRecommendation] = useState<IncidentTimelineResponse | null>(null)

  const watchedType = watch('incident_type')
  const watchedCategory = watch('incident_category')
  const watchedDescription = watch('detailed_description')
  const watchedImpact = watch('impact_assessment')
  const watchedImmediateActions = watch('immediate_actions')
  const watchedTitle = watch('title')
  const watchedOccurredAt = watch('occurred_at')
  const watchedSeverity = watch('severity')

  useEffect(() => {
    if (!options?.incident_categories) return
    const categoriesForType = options.incident_categories[watchedType]
    if (categoriesForType && categoriesForType.length) {
      if (!watchedCategory || !categoriesForType.includes(watchedCategory)) {
        setValue('incident_category', categoriesForType[0])
      }
    } else {
      setValue('incident_category', undefined)
    }
  }, [watchedType, watchedCategory, options, setValue])

  useEffect(() => {
    if (!watchedTitle || !watchedDescription || watchedDescription.length < 40) {
      setCategorySuggestion(null)
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const result = await api<IncidentClassificationResponse>('/incidents/ai/classify', {
          method: 'POST',
          body: JSON.stringify({
            title: watchedTitle,
            incident_type: watchedType,
            description: watchedDescription,
            impact_assessment: watchedImpact,
          }),
          signal: controller.signal,
        })
        setCategorySuggestion(result)
        if (!watchedCategory && result.suggested_category) {
          setValue('incident_category', result.suggested_category)
        }
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          console.error('Classification error', error)
        }
      }
    }, 500)
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [watchedTitle, watchedDescription, watchedType, watchedImpact, watchedCategory, setValue])

  useEffect(() => {
    if (!watchedDescription || watchedDescription.length < 60) {
      setSeveritySuggestion(null)
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const result = await api<IncidentSeverityAssessmentResponse>('/incidents/ai/assess-severity', {
          method: 'POST',
          body: JSON.stringify({
            description: watchedDescription,
            impact_assessment: watchedImpact,
            immediate_actions: watchedImmediateActions,
          }),
          signal: controller.signal,
        })
        setSeveritySuggestion(result)
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          console.error('Severity assessment error', error)
        }
      }
    }, 500)
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [watchedDescription, watchedImpact, watchedImmediateActions])

  useEffect(() => {
    if (!watchedTitle || !watchedDescription || watchedDescription.length < 50 || !watchedOccurredAt) {
      setDuplicateMatches(null)
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const result = await api<IncidentDuplicateDetectionResponse>('/incidents/ai/detect-duplicates', {
          method: 'POST',
          body: JSON.stringify({
            title: watchedTitle,
            description: watchedDescription,
            occurred_at: new Date(watchedOccurredAt).toISOString(),
          }),
          signal: controller.signal,
        })
        setDuplicateMatches(result)
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          console.error('Duplicate detection error', error)
        }
      }
    }, 600)
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [watchedTitle, watchedDescription, watchedOccurredAt])

  useEffect(() => {
    if (!watchedOccurredAt || !watchedType || !watchedSeverity) {
      setTimelineRecommendation(null)
      return
    }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      try {
        const result = await api<IncidentTimelineResponse>('/incidents/ai/timeline', {
          method: 'POST',
          body: JSON.stringify({
            incident_type: watchedType,
            severity: watchedSeverity,
            occurred_at: new Date(watchedOccurredAt).toISOString(),
          }),
          signal: controller.signal,
        })
        setTimelineRecommendation(result)
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'AbortError') {
          console.error('Timeline recommendation error', error)
        }
      }
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [watchedOccurredAt, watchedType, watchedSeverity])

  const onSubmit = async (values: IncidentFormValues) => {
    setSubmitting(true)
    setFormMessage(null)
    try {
      const externalNotifications = Array.isArray(values.external_notifications)
        ? values.external_notifications
        : values.external_notifications
            ?.split(',')
            .map((entry) => entry.trim())
            .filter(Boolean) ?? []

      const payload: IncidentFormValues = {
        ...values,
        occurred_at: new Date(values.occurred_at).toISOString(),
        external_notifications: externalNotifications,
        attachments: attachments.map(({ id, ...rest }) => rest),
      }
      await api('/incidents', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setFormMessage('Incident reported successfully. Investigation team notified.')
      reset({
        ...values,
        title: '',
        impact_assessment: '',
        immediate_actions: '',
        detailed_description: '',
        what_happened: '',
        root_cause: '',
        contributing_factors: '',
        people_involved_ids: [],
        witness_ids: [],
        equipment_involved: '',
        immediate_notification_ids: [],
        external_notifications: [],
        public_disclosure_required: false,
      })
      setAttachments([])
      setCategorySuggestion(null)
      setSeveritySuggestion(null)
      setDuplicateMatches(null)
      onCreated?.()
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Failed to submit incident')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleUserSelection = (field: 'people_involved_ids' | 'witness_ids' | 'immediate_notification_ids', id: number) => {
    const current = new Set(watch(field))
    if (current.has(id)) {
      current.delete(id)
    } else {
      current.add(id)
    }
    setValue(field, Array.from(current))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    const newAttachments: AttachmentDraft[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      file_url: undefined,
      description: '',
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
    event.target.value = ''
  }

  const updateAttachmentDescription = (id: string, description: string) => {
    setAttachments((prev) => prev.map((attachment) => (attachment.id === id ? { ...attachment, description } : attachment)))
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  const categoriesForSelectedType = useMemo(() => {
    if (!options?.incident_categories) return []
    return options.incident_categories[watchedType] ?? []
  }, [watchedType, options])

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">Report New Incident</CardTitle>
        <CardDescription>
          Capture critical incident details, supporting evidence, and notification routing in one workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {formMessage && (
          <div className={cn('rounded-md border p-3 text-sm', formMessage.includes('successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600')}>
            {formMessage}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Incident Details</h3>
              <p className="text-sm text-muted-foreground">
                Provide concise context to classify and prioritise the incident.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incident-title">Incident Title</Label>
                <Input id="incident-title" placeholder="Short descriptive title" maxLength={200} {...register('title', { required: true })} />
                {errors.title && <p className="text-xs text-red-500">Title is required.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-type">Incident Type</Label>
                <select
                  id="incident-type"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('incident_type', { required: true })}
                >
                  {options?.incident_types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="incident-category">Incident Category</Label>
                <select
                  id="incident-category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('incident_category', { required: categoriesForSelectedType.length > 0 })}
                >
                  {categoriesForSelectedType.length ? (
                    categoriesForSelectedType.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))
                  ) : (
                    <option value="">Select category</option>
                  )}
                </select>
                {categorySuggestion && (
                  <p className="text-xs text-muted-foreground">
                    Suggested category: <strong>{categorySuggestion.suggested_category}</strong> — {categorySuggestion.rationale}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('department_id', {
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                >
                  <option value="">Select department</option>
                  {options?.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                      {department.site ? ` • ${department.site}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occurred-at">Date &amp; Time</Label>
                <Input id="occurred-at" type="datetime-local" {...register('occurred_at', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('severity', { required: true })}
                >
                  {INCIDENT_SEVERITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {severitySuggestion && (
                  <p className="text-xs text-muted-foreground">
                    Recommended: <strong>{severitySuggestion.recommended_severity}</strong> — confidence{' '}
                    {(severitySuggestion.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact-assessment">Impact Assessment</Label>
              <Textarea
                id="impact-assessment"
                rows={3}
                placeholder="Describe operational, regulatory, and customer impact."
                {...register('impact_assessment', { required: true })}
              />
              {errors.impact_assessment && <p className="text-xs text-red-500">Impact assessment is required.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="immediate-actions">Immediate Actions Taken</Label>
              <Textarea id="immediate-actions" rows={3} placeholder="Summarise containment or mitigation steps." {...register('immediate_actions')} />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Incident Narrative</h3>
              <p className="text-sm text-muted-foreground">
                Document the event with sufficient detail for investigators and auditors.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detailed-description">Detailed Description</Label>
              <Textarea
                id="detailed-description"
                rows={6}
                placeholder="Provide a thorough narrative of the incident."
                {...register('detailed_description', { required: true })}
              />
              {errors.detailed_description && <p className="text-xs text-red-500">Detailed description is required.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="what-happened">What Happened?</Label>
              <Textarea
                id="what-happened"
                rows={4}
                placeholder="Summarise the sequence of events."
                {...register('what_happened', { required: true })}
              />
              {errors.what_happened && <p className="text-xs text-red-500">This field is required.</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="root-cause">Root Cause (if known)</Label>
                <Textarea id="root-cause" rows={3} placeholder="Initial root cause hypothesis." {...register('root_cause')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contributing-factors">Contributing Factors</Label>
                <Textarea id="contributing-factors" rows={3} placeholder="Note any contributing circumstances." {...register('contributing_factors')} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">People &amp; Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Identify stakeholders and configure escalation workflow.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>People Involved</Label>
                <UserChecklist
                  options={options?.users ?? []}
                  selected={watch('people_involved_ids')}
                  onToggle={(id) => toggleUserSelection('people_involved_ids', id)}
                  emptyLabel="Assign team members involved in the incident."
                />
              </div>
              <div className="space-y-2">
                <Label>Witnesses</Label>
                <UserChecklist
                  options={options?.users ?? []}
                  selected={watch('witness_ids')}
                  onToggle={(id) => toggleUserSelection('witness_ids', id)}
                  emptyLabel="Add witnesses or observers if known."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Immediate Notification Recipients</Label>
                <UserChecklist
                  options={options?.users ?? []}
                  selected={watch('immediate_notification_ids')}
                  onToggle={(id) => toggleUserSelection('immediate_notification_ids', id)}
                  emptyLabel="Select at least one person to notify immediately."
                />
                {watch('immediate_notification_ids').length === 0 && (
                  <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Immediate notification is required.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="external-notifications">External Notifications</Label>
              <Textarea
                id="external-notifications"
                rows={2}
                placeholder="List regulatory bodies, customers, or vendors to notify."
                {...register('external_notifications')}
              />
              <p className="text-xs text-muted-foreground">Separate multiple recipients with commas.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="public-disclosure"
                type="checkbox"
                className="h-4 w-4 rounded border-muted"
                {...register('public_disclosure_required')}
              />
              <Label htmlFor="public-disclosure" className="text-sm">
                Public disclosure required
              </Label>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Evidence &amp; Attachments</h3>
              <p className="text-sm text-muted-foreground">
                Attach supporting files or capture onsite media. Maximum 50MB per file.
              </p>
            </div>
            <div className="space-y-3">
              <label
                htmlFor="incident-files"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-green-200 p-6 text-center text-sm text-muted-foreground transition hover:border-green-400 hover:bg-green-50"
              >
                <UploadCloud className="mb-2 h-6 w-6 text-primary" />
                <span>Drag and drop or click to upload files</span>
                <span className="text-xs text-muted-foreground">Images, videos, documents, audio (max 50MB per file)</span>
              </label>
              <Input id="incident-files" type="file" multiple className="hidden" onChange={handleFileChange} />
              {attachments.length > 0 && (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-md border border-green-200 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{attachment.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.file_size ?? 0) / 1024 < 1024
                              ? `${((attachment.file_size ?? 0) / 1024).toFixed(1)} KB`
                              : `${((attachment.file_size ?? 0) / (1024 * 1024)).toFixed(1)} MB`}
                          </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(attachment.id)}>
                          Remove
                        </Button>
                      </div>
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground">Evidence Description</Label>
                        <Textarea
                          rows={2}
                          value={attachment.description ?? ''}
                          onChange={(event) => updateAttachmentDescription(attachment.id, event.target.value)}
                          placeholder="Provide context for this evidence."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {duplicateMatches?.matches.length ? (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <h3 className="mb-2 font-semibold text-amber-700">Possible duplicate incidents detected</h3>
              <ul className="space-y-1 text-amber-700">
                {duplicateMatches.matches.map((match) => (
                  <li key={match.incident_id}>
                    <span className="font-medium">{match.incident_code}</span> — {match.title} (similarity {Math.round(match.similarity * 100)}%)
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {timelineRecommendation && (
            <section className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
              <h3 className="font-semibold text-sky-800">AI Investigation Timeline</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Target resolution date {new Date(timelineRecommendation.target_resolution_date).toLocaleDateString()} —{' '}
                {timelineRecommendation.priority_rationale}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {timelineRecommendation.timeline_guidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <Button type="submit" className="bg-red-500 hover:bg-red-600" disabled={submitting || watch('immediate_notification_ids').length === 0}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Report Incident
            </Button>
            <p className="text-xs text-muted-foreground">
              Automated escalation paths and resource planning are generated after submission.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface UserChecklistProps {
  options: IncidentOptionsResponse['users']
  selected: number[]
  onToggle: (id: number) => void
  emptyLabel: string
}

function UserChecklist({ options, selected, onToggle, emptyLabel }: UserChecklistProps) {
  if (!options.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-input p-3">
      {options.map((user) => {
        const isSelected = selected.includes(user.id)
        return (
          <label key={user.id} className="flex cursor-pointer items-center justify-between text-sm">
            <div>
              <span className="font-medium text-slate-900">{user.name}</span>
              {user.role && <span className="ml-2 text-xs text-muted-foreground">{user.role}</span>}
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-muted"
              checked={isSelected}
              onChange={() => onToggle(user.id)}
            />
          </label>
        )
      })}
    </div>
  )
}
