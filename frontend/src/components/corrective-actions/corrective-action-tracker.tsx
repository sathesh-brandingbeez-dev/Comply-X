"use client"

import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  CorrectiveActionDetail,
  CorrectiveActionListItem,
  CorrectiveActionMetric,
  CorrectiveActionMetricInput,
  CorrectiveActionStep,
  CorrectiveActionStepInput,
  CorrectiveActionStepStatus,
  CorrectiveActionUpdateType,
} from '@/types/corrective-actions'
import { Activity, CalendarDays, Loader2, RefreshCcw, Target, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CorrectiveActionTrackerProps {
  actions: CorrectiveActionListItem[]
  selectedAction?: CorrectiveActionDetail
  listLoading: boolean
  detailLoading: boolean
  onSelectAction: (id: number) => void
  onRefresh: () => void
  onUpdateStep: (stepId: number, payload: CorrectiveActionStepInput) => Promise<void>
  onUpdateMetric: (metricId: number, payload: CorrectiveActionMetricInput) => Promise<void>
  onAddUpdate: (
    payload: {
      update_type: CorrectiveActionUpdateType
      description: string
    }
  ) => Promise<void>
}

const STATUS_BADGE: Record<string, string> = {
  Open: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'In Progress': 'bg-amber-50 text-amber-600 border border-amber-100',
  Completed: 'bg-green-100 text-green-700 border border-green-200',
  Closed: 'bg-slate-100 text-slate-600 border border-slate-200',
  Cancelled: 'bg-rose-50 text-rose-600 border border-rose-100',
}

export function CorrectiveActionTracker({
  actions,
  selectedAction,
  listLoading,
  detailLoading,
  onSelectAction,
  onRefresh,
  onUpdateStep,
  onUpdateMetric,
  onAddUpdate,
}: CorrectiveActionTrackerProps) {
  const [stepDrafts, setStepDrafts] = useState<Record<number, CorrectiveActionStepInput>>({})
  const [metricDrafts, setMetricDrafts] = useState<Record<number, CorrectiveActionMetricInput>>({})
  const [updateType, setUpdateType] = useState<CorrectiveActionUpdateType>('Progress Update')
  const [updateDescription, setUpdateDescription] = useState('')
  const [submittingStep, setSubmittingStep] = useState<number | null>(null)
  const [submittingMetric, setSubmittingMetric] = useState<number | null>(null)
  const [submittingUpdate, setSubmittingUpdate] = useState(false)

  useEffect(() => {
    if (!selectedAction) return
    const drafts: Record<number, CorrectiveActionStepInput> = {}
    selectedAction.steps.forEach((step) => {
      drafts[step.id] = {
        description: step.description,
        status: step.status,
        responsible_person_id: step.responsible_person_id ?? undefined,
        due_date: step.due_date ?? undefined,
        progress_notes: step.progress_notes ?? undefined,
        completion_date: step.completion_date ?? undefined,
      }
    })
    setStepDrafts(drafts)

    const metricDraftState: Record<number, CorrectiveActionMetricInput> = {}
    selectedAction.metrics.forEach((metric) => {
      metricDraftState[metric.id] = {
        metric_name: metric.metric_name,
        target_value: metric.target_value ?? undefined,
        actual_value: metric.actual_value ?? undefined,
        measurement_method: metric.measurement_method ?? undefined,
        measurement_date: metric.measurement_date ?? undefined,
      }
    })
    setMetricDrafts(metricDraftState)
    setUpdateDescription('')
    setUpdateType('Progress Update')
  }, [selectedAction])

  const daysToDue = useMemo(() => {
    if (!selectedAction?.overall_due_date) return null
    const due = new Date(selectedAction.overall_due_date)
    const diff = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }, [selectedAction])

  const handleStepChange = (stepId: number, patch: Partial<CorrectiveActionStepInput>) => {
    setStepDrafts((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...patch },
    }))
  }

  const submitStep = async (step: CorrectiveActionStep) => {
    const payload = stepDrafts[step.id]
    if (!payload) return
    setSubmittingStep(step.id)
    try {
      await onUpdateStep(step.id, payload)
    } finally {
      setSubmittingStep(null)
    }
  }

  const handleMetricChange = (metricId: number, patch: Partial<CorrectiveActionMetricInput>) => {
    setMetricDrafts((prev) => ({
      ...prev,
      [metricId]: { ...prev[metricId], ...patch },
    }))
  }

  const submitMetric = async (metric: CorrectiveActionMetric) => {
    const payload = metricDrafts[metric.id]
    if (!payload) return
    setSubmittingMetric(metric.id)
    try {
      await onUpdateMetric(metric.id, payload)
    } finally {
      setSubmittingMetric(null)
    }
  }

  const submitUpdate = async () => {
    if (!updateDescription.trim()) return
    setSubmittingUpdate(true)
    try {
      await onAddUpdate({ update_type: updateType, description: updateDescription.trim() })
      setUpdateDescription('')
    } finally {
      setSubmittingUpdate(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-4 border-green-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-slate-900">Action Register</CardTitle>
            <CardDescription>Navigate corrective actions by priority and due date.</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {listLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-14 rounded-md border border-green-100 bg-green-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => {
                const isSelected = selectedAction?.id === action.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => onSelectAction(action.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-3 text-left text-sm transition',
                      isSelected
                        ? 'border-green-400 bg-green-50 shadow-sm'
                        : 'border-green-100 bg-white hover:border-green-300 hover:bg-green-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">{action.title}</span>
                      <Badge variant="outline" className={STATUS_BADGE[action.status] ?? ''}>
                        {action.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{action.priority} priority</span>
                      <span>{action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No due date'}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-green-100">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, Math.round(action.progress_percent))}%` }}
                      />
                    </div>
                  </button>
                )
              })}
              {!actions.length && (
                <div className="rounded-md border border-dashed border-green-200 p-4 text-xs text-muted-foreground">
                  No corrective actions recorded yet.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 border-green-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-slate-900">
                {selectedAction ? selectedAction.title : 'Select a corrective action'}
              </CardTitle>
              {selectedAction && (
                <CardDescription>
                  Action ID {selectedAction.action_code} · Owner {selectedAction.action_owner_name ?? 'Unassigned'}
                </CardDescription>
              )}
            </div>
            {selectedAction && (
              <Badge variant="outline" className={STATUS_BADGE[selectedAction.status] ?? ''}>
                {selectedAction.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {detailLoading || !selectedAction ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-12 rounded-md border border-green-100 bg-green-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <InfoTile icon={Target} label="Progress" value={`${Math.round(selectedAction.progress_percent)}%`}>
                  <Progress value={selectedAction.progress_percent} className="mt-2" />
                </InfoTile>
                <InfoTile
                  icon={CalendarDays}
                  label="Due Date"
                  value={selectedAction.overall_due_date ? new Date(selectedAction.overall_due_date).toLocaleDateString() : '—'}
                >
                  {daysToDue != null && (
                    <p className="text-xs text-muted-foreground">
                      {daysToDue >= 0 ? `${daysToDue} days remaining` : `${Math.abs(daysToDue)} days overdue`}
                    </p>
                  )}
                </InfoTile>
                <InfoTile
                  icon={TrendingUp}
                  label="Effectiveness"
                  value={
                    selectedAction.ai_insights?.effectiveness_score != null
                      ? `${selectedAction.ai_insights.effectiveness_score.toFixed(1)}%`
                      : '—'
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    {selectedAction.ai_insights?.timeline_advice ?? 'AI-driven forecast available once metrics captured.'}
                  </p>
                </InfoTile>
                <InfoTile icon={Activity} label="Priority" value={selectedAction.priority}>
                  <p className="text-xs text-muted-foreground">Impact {selectedAction.impact} · Urgency {selectedAction.urgency}</p>
                </InfoTile>
              </div>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Implementation Steps</h3>
                  <span className="text-xs text-muted-foreground">Update progress to keep AI forecasts current.</span>
                </div>
                <div className="space-y-3">
                  {selectedAction.steps.map((step) => (
                    <div key={step.id} className="rounded-lg border border-green-100 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{step.description}</h4>
                          <p className="text-xs text-muted-foreground">
                            {step.responsible_person_name ?? 'Unassigned'} ·{' '}
                            {step.due_date ? new Date(step.due_date).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-sky-50 text-sky-600">
                          {stepDrafts[step.id]?.status ?? step.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Select
                            value={stepDrafts[step.id]?.status ?? step.status}
                            onValueChange={(value) => handleStepChange(step.id, { status: value as CorrectiveActionStepStatus })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(['Not Started', 'In Progress', 'Completed', 'Delayed'] as CorrectiveActionStepStatus[]).map(
                                (status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={stepDrafts[step.id]?.completion_date ?? step.completion_date ?? ''}
                            onChange={(event) => handleStepChange(step.id, { completion_date: event.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Textarea
                            rows={2}
                            placeholder="Progress notes"
                            value={stepDrafts[step.id]?.progress_notes ?? ''}
                            onChange={(event) => handleStepChange(step.id, { progress_notes: event.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => submitStep(step)}
                          disabled={submittingStep === step.id}
                        >
                          {submittingStep === step.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Progress
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selectedAction.steps.length && (
                    <div className="rounded-md border border-dashed border-green-200 p-4 text-xs text-muted-foreground">
                      No implementation steps recorded.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Success Metrics</h3>
                  <span className="text-xs text-muted-foreground">Track actuals to evaluate effectiveness.</span>
                </div>
                <div className="space-y-3">
                  {selectedAction.metrics.map((metric) => (
                    <div key={metric.id} className="rounded-lg border border-green-100 p-4">
                      <div className="text-sm font-semibold text-slate-900">{metric.metric_name}</div>
                      <div className="mt-2 grid gap-3 md:grid-cols-4">
                        <div>
                          <LabelValue label="Target" value={metric.target_value ?? '—'} />
                        </div>
                        <div>
                          <LabelValue label="Measurement" value={metricDrafts[metric.id]?.measurement_method ?? metric.measurement_method ?? '—'} />
                        </div>
                        <div className="space-y-2">
                          <LabelValue label="Actual" value="" hideValue />
                          <Input
                            value={metricDrafts[metric.id]?.actual_value ?? metric.actual_value ?? ''}
                            onChange={(event) => handleMetricChange(metric.id, { actual_value: event.target.value })}
                            placeholder="Update actual"
                          />
                        </div>
                        <div className="space-y-2">
                          <LabelValue label="Measured On" value="" hideValue />
                          <Input
                            type="date"
                            value={metricDrafts[metric.id]?.measurement_date ?? metric.measurement_date ?? ''}
                            onChange={(event) => handleMetricChange(metric.id, { measurement_date: event.target.value })}
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => submitMetric(metric)}
                          disabled={submittingMetric === metric.id}
                        >
                          {submittingMetric === metric.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Metric
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!selectedAction.metrics.length && (
                    <div className="rounded-md border border-dashed border-green-200 p-4 text-xs text-muted-foreground">
                      Metrics will appear after they are defined in the action plan.
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Communication Log</h3>
                  <span className="text-xs text-muted-foreground">Maintain a transparent activity trail.</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-green-100 p-4">
                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <Select value={updateType} onValueChange={(value) => setUpdateType(value as CorrectiveActionUpdateType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              [
                                'Progress Update',
                                'Issue Report',
                                'Resource Change',
                                'Timeline Change',
                                'Escalation',
                                'Review',
                                'Comment',
                              ] as CorrectiveActionUpdateType[]
                            ).map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-3">
                        <Textarea
                          rows={2}
                          placeholder="Log update details"
                          value={updateDescription}
                          onChange={(event) => setUpdateDescription(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button type="button" size="sm" onClick={submitUpdate} disabled={submittingUpdate}>
                        {submittingUpdate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Update
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <TableHeader className="bg-green-50">
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAction.updates.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="align-top text-xs text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="align-top text-xs">{entry.update_type}</TableCell>
                          <TableCell className="align-top text-xs">{entry.created_by_name ?? '—'}</TableCell>
                          <TableCell className="whitespace-pre-line text-sm text-slate-700">{entry.description}</TableCell>
                        </TableRow>
                      ))}
                      {!selectedAction.updates.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                            No updates logged yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoTile({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-green-100 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
      {children}
    </div>
  )
}

function LabelValue({ label, value, hideValue = false }: { label: string; value: string; hideValue?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {!hideValue && <p className="text-sm text-slate-700">{value}</p>}
    </div>
  )
}
