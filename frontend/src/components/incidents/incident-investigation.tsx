"use client"

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  IncidentDetail,
  IncidentEscalationResponse,
  IncidentInvestigationActivity,
  IncidentInvestigationInsightsResponse,
  IncidentListItem,
  IncidentOptionsResponse,
  IncidentSeverity,
} from '@/types/incidents'
import { api } from '@/lib/api'
import {
  Activity,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCcw,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IncidentInvestigationProps {
  incidents: IncidentListItem[]
  loading: boolean
  onRefresh: () => void
  options?: IncidentOptionsResponse
}

interface RootCauseDraft {
  id?: number
  description: string
  category: string
  impact_level: IncidentSeverity
}

interface ActivityDraft {
  activity_time: string
  activity_type: string
  investigator_id?: number | ''
  description?: string
  findings?: string
  evidence_url?: string
  follow_up_required: boolean
}

const ACTIVITY_TYPES = [
  'Interview',
  'Evidence Collection',
  'Analysis',
  'Site Visit',
  'Expert Consultation',
  'Testing',
  'Research',
  'Other',
]

const RCA_CATEGORIES = ['Human', 'Process', 'System', 'Environment']
const IMPACT_LEVELS: IncidentSeverity[] = ['Low', 'Medium', 'High', 'Critical']

type InvestigationState = NonNullable<IncidentDetail['investigation']>

export function IncidentInvestigation({ incidents, loading, onRefresh, options }: IncidentInvestigationProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<IncidentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rootFactors, setRootFactors] = useState<RootCauseDraft[]>([])
  const [activityForm, setActivityForm] = useState<ActivityDraft>({
    activity_time: new Date().toISOString().slice(0, 16),
    activity_type: ACTIVITY_TYPES[0],
    investigator_id: '',
    description: '',
    findings: '',
    evidence_url: '',
    follow_up_required: false,
  })
  const [savingInvestigation, setSavingInvestigation] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [aiInsights, setAiInsights] = useState<IncidentInvestigationInsightsResponse | null>(null)
  const [escalationAdvice, setEscalationAdvice] = useState<IncidentEscalationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!incidents.length) {
      setSelectedId(null)
      setDetail(null)
      return
    }
    if (selectedId == null) {
      setSelectedId(incidents[0].id)
    }
  }, [incidents, selectedId])

  useEffect(() => {
    if (selectedId == null) return
    const fetchDetail = async () => {
      setDetailLoading(true)
      setError(null)
      try {
        const response = await api<IncidentDetail>(`/incidents/${selectedId}`)
        setDetail(response)
        setRootFactors(
          response.investigation?.root_cause_factors.map((factor) => ({
            id: factor.id,
            description: factor.description,
            category: factor.category,
            impact_level: factor.impact_level,
          })) ?? []
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load incident detail')
      } finally {
        setDetailLoading(false)
      }
    }
    fetchDetail()
  }, [selectedId])

  const handleUpdateInvestigation = async () => {
    if (!detail) return
    setSavingInvestigation(true)
    try {
      const payload = {
        status: detail.investigation?.status,
        priority: detail.investigation?.priority,
        assigned_investigator_id: detail.investigation?.assigned_investigator_id ?? null,
        investigation_team_ids: detail.investigation?.investigation_team_ids ?? [],
        target_resolution_date: detail.investigation?.target_resolution_date ?? null,
        actual_resolution_date: detail.investigation?.actual_resolution_date ?? null,
        rca_method: detail.investigation?.rca_method ?? null,
        primary_root_cause: detail.investigation?.primary_root_cause ?? null,
        rca_notes: detail.investigation?.rca_notes ?? null,
        root_cause_factors: rootFactors.map((factor) => ({
          description: factor.description,
          category: factor.category,
          impact_level: factor.impact_level,
        })),
      }
      const updated = await api<IncidentDetail>(`/incidents/${detail.id}/investigation`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setDetail(updated)
      setRootFactors(
        updated.investigation?.root_cause_factors.map((factor) => ({
          id: factor.id,
          description: factor.description,
          category: factor.category,
          impact_level: factor.impact_level,
        })) ?? []
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save investigation update')
    } finally {
      setSavingInvestigation(false)
    }
  }

  const handleAddActivity = async () => {
    if (!detail) return
    setSavingActivity(true)
    try {
      const payload = {
        ...activityForm,
        investigator_id: activityForm.investigator_id ? Number(activityForm.investigator_id) : null,
        activity_time: new Date(activityForm.activity_time).toISOString(),
      }
      const result = await api<IncidentInvestigationActivity>(`/incidents/${detail.id}/activities`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const updated = await api<IncidentDetail>(`/incidents/${detail.id}`)
      setDetail(updated)
      setActivityForm({
        activity_time: new Date().toISOString().slice(0, 16),
        activity_type: ACTIVITY_TYPES[0],
        investigator_id: '',
        description: '',
        findings: '',
        evidence_url: '',
        follow_up_required: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record activity')
    } finally {
      setSavingActivity(false)
    }
  }

  const requestAiInsights = async () => {
    if (!detail) return
    try {
      const response = await api<IncidentInvestigationInsightsResponse>('/incidents/ai/investigation-insights', {
        method: 'POST',
        body: JSON.stringify({
          incident_id: detail.id,
          incident_type: detail.incident_type,
          severity: detail.severity,
          description: detail.detailed_description,
          contributing_factors: detail.contributing_factors,
        }),
      })
      setAiInsights(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch AI insights')
    }
  }

  const requestEscalation = async () => {
    if (!detail) return
    try {
      const response = await api<IncidentEscalationResponse>('/incidents/ai/escalation-path', {
        method: 'POST',
        body: JSON.stringify({
          severity: detail.severity,
          department_id: detail.department_id,
        }),
      })
      setEscalationAdvice(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch escalation guidance')
    }
  }

  const selectedInvestigator = detail?.investigation?.assigned_investigator_id ?? null

  const teamSelection = detail?.investigation?.investigation_team_ids ?? []

  const toggleTeamMember = (id: number) => {
    if (!detail) return
    const current = new Set(detail.investigation?.investigation_team_ids ?? [])
    if (current.has(id)) {
      current.delete(id)
    } else {
      current.add(id)
    }
    setDetail({
      ...detail,
      investigation: detail.investigation
        ? { ...detail.investigation, investigation_team_ids: Array.from(current) }
        : undefined,
    })
  }

  const updateInvestigationField = <K extends keyof InvestigationState>(key: K, value: InvestigationState[K]) => {
    if (!detail) return
    setDetail({
      ...detail,
      investigation: detail.investigation ? { ...detail.investigation, [key]: value } : undefined,
    })
  }

  const severityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-600'
      case 'High':
        return 'bg-orange-100 text-orange-600'
      case 'Medium':
        return 'bg-amber-100 text-amber-600'
      default:
        return 'bg-emerald-100 text-emerald-600'
    }
  }

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-900">Incident Investigation</CardTitle>
        <CardDescription>
          Coordinate investigation workflow, capture timeline activities, and leverage AI guidance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Investigation Queue</h3>
            <p className="text-sm text-muted-foreground">Select an incident to review status, assignments, and timeline.</p>
          </div>
          <Button variant="outline" className="flex items-center gap-2" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh list
          </Button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-green-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Incident</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((item) => {
                const isSelected = item.id === selectedId
                return (
                  <TableRow
                    key={item.id}
                    className={cn('cursor-pointer', isSelected && 'bg-green-50')}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.incident_code}</div>
                      <div className="text-sm text-muted-foreground">{item.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityBadge(item.severity)}>{item.severity}</Badge>
                    </TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.department_name ?? 'Unassigned'}</TableCell>
                    <TableCell>{new Date(item.reported_at).toLocaleString()}</TableCell>
                    <TableCell>
                      {item.overdue ? (
                        <Badge className="bg-red-100 text-red-600">Overdue</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-600">On Track</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {incidents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No incidents available. Report an incident to begin investigations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {detailLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading incident details...
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h4 className="text-sm font-semibold text-slate-800">Incident Summary</h4>
                <p className="mt-1 text-sm text-muted-foreground">{detail.impact_assessment}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" /> Occurred {new Date(detail.occurred_at).toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-4 space-y-2">
                <Label className="text-sm font-semibold">Status</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={detail.investigation?.status ?? 'Open'}
                  onChange={(event) => updateInvestigationField('status', event.target.value as IncidentDetail['investigation']['status'])}
                >
                  <option value="Open">Open</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                <Label className="text-sm font-semibold">Priority</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={detail.investigation?.priority ?? 'Medium'}
                  onChange={(event) => updateInvestigationField('priority', event.target.value as IncidentDetail['investigation']['priority'])}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-4 space-y-2">
                <Label className="text-sm font-semibold">Assigned Investigator</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedInvestigator ?? ''}
                  onChange={(event) =>
                    updateInvestigationField(
                      'assigned_investigator_id',
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                >
                  <option value="">Select investigator</option>
                  {options?.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <Label className="text-sm font-semibold">Target Resolution Date</Label>
                <Input
                  type="date"
                  value={detail.investigation?.target_resolution_date ?? ''}
                  onChange={(event) => updateInvestigationField('target_resolution_date', event.target.value || null)}
                />
                <Label className="text-sm font-semibold">Actual Resolution Date</Label>
                <Input
                  type="date"
                  value={detail.investigation?.actual_resolution_date ?? ''}
                  onChange={(event) => updateInvestigationField('actual_resolution_date', event.target.value || null)}
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Investigation Team</h4>
                  <p className="text-sm text-muted-foreground">Add supporting investigators to collaborate on findings.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={requestAiInsights}>
                  <Sparkles className="mr-2 h-4 w-4" /> Get AI guidance
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {options?.users.map((user) => {
                  const isSelected = teamSelection.includes(user.id)
                  return (
                    <label
                      key={user.id}
                      className={cn('flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm',
                        isSelected ? 'border-green-400 bg-green-50' : 'border-border')}
                    >
                      <span>{user.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTeamMember(user.id)}
                        className="h-4 w-4 rounded border-muted"
                      />
                    </label>
                  )
                })}
                {!options?.users.length && (
                  <p className="text-sm text-muted-foreground md:col-span-3">Invite team members via user management to build an investigation team.</p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Root Cause Analysis</h4>
                  <p className="text-sm text-muted-foreground">Capture factors contributing to the incident.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRootFactors((prev) => [
                      ...prev,
                      { description: '', category: RCA_CATEGORIES[0], impact_level: 'Medium' },
                    ])
                  }
                >
                  Add factor
                </Button>
              </div>
              <div className="space-y-3">
                {rootFactors.length === 0 && (
                  <p className="text-sm text-muted-foreground">No root cause factors recorded yet.</p>
                )}
                {rootFactors.map((factor, index) => (
                  <div key={factor.id ?? index} className="grid gap-2 rounded-lg border border-green-200 p-3 md:grid-cols-4">
                    <div className="md:col-span-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                      <Textarea
                        rows={2}
                        value={factor.description}
                        onChange={(event) =>
                          setRootFactors((prev) => {
                            const updated = [...prev]
                            updated[index] = { ...factor, description: event.target.value }
                            return updated
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={factor.category}
                        onChange={(event) =>
                          setRootFactors((prev) => {
                            const updated = [...prev]
                            updated[index] = { ...factor, category: event.target.value }
                            return updated
                          })
                        }
                      >
                        {RCA_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Impact</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={factor.impact_level}
                        onChange={(event) =>
                          setRootFactors((prev) => {
                            const updated = [...prev]
                            updated[index] = { ...factor, impact_level: event.target.value as IncidentSeverity }
                            return updated
                          })
                        }
                      >
                        {IMPACT_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Investigation Notes</h4>
                <p className="text-sm text-muted-foreground">Document investigation progress, findings, and next steps.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">RCA Method</Label>
                  <Input
                    value={detail.investigation?.rca_method ?? ''}
                    placeholder="e.g. 5 Whys, Fishbone"
                    onChange={(event) => updateInvestigationField('rca_method', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Primary Root Cause</Label>
                  <Input
                    value={detail.investigation?.primary_root_cause ?? ''}
                    onChange={(event) => updateInvestigationField('primary_root_cause', event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Investigation Notes</Label>
                <Textarea
                  rows={3}
                  value={detail.investigation?.rca_notes ?? ''}
                  onChange={(event) => updateInvestigationField('rca_notes', event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={handleUpdateInvestigation} disabled={savingInvestigation}>
                  {savingInvestigation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Investigation
                </Button>
                <Button type="button" variant="outline" onClick={requestEscalation}>
                  Generate escalation guidance
                </Button>
              </div>
              {aiInsights && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
                  <h5 className="font-semibold">AI Root Cause Insights</h5>
                  <p className="mt-1">Suggested primary cause: {aiInsights.suggested_primary_cause ?? 'Gather more evidence'}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {aiInsights.contributing_factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                  <h6 className="mt-3 text-xs font-semibold uppercase tracking-wide">Timeline Guidance</h6>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                    {aiInsights.timeline_guidance.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {escalationAdvice && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <h5 className="font-semibold">Recommended Escalation Path</h5>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {escalationAdvice.steps.map((step, index) => (
                      <li key={`${step}-${index}`}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Investigation Timeline</h4>
                <p className="text-sm text-muted-foreground">Log interviews, evidence collection, and follow-up tasks.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-sm">Activity Time</Label>
                  <Input
                    type="datetime-local"
                    value={activityForm.activity_time}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, activity_time: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Activity Type</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={activityForm.activity_type}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, activity_type: event.target.value }))}
                  >
                    {ACTIVITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Investigator</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={activityForm.investigator_id}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, investigator_id: event.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {options?.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Follow-up Required</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-muted"
                      checked={activityForm.follow_up_required}
                      onChange={(event) => setActivityForm((prev) => ({ ...prev, follow_up_required: event.target.checked }))}
                    />
                    <span className="text-xs text-muted-foreground">Create follow-up task</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm">Description</Label>
                  <Textarea
                    rows={3}
                    value={activityForm.description ?? ''}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Findings</Label>
                  <Textarea
                    rows={3}
                    value={activityForm.findings ?? ''}
                    onChange={(event) => setActivityForm((prev) => ({ ...prev, findings: event.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" onClick={handleAddActivity} disabled={savingActivity}>
                  {savingActivity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                  Add Activity
                </Button>
                <span className="text-xs text-muted-foreground">
                  Timeline entries feed into audit trails and closure reporting.
                </span>
              </div>

              <div className="space-y-3">
                {detail.investigation?.activities.length ? (
                  detail.investigation.activities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="font-medium text-slate-900">{activity.activity_type}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(activity.activity_time).toLocaleString()}
                        </div>
                      </div>
                      {activity.description && <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>}
                      {activity.findings && (
                        <p className="mt-1 text-sm text-slate-700">
                          <span className="font-medium">Findings:</span> {activity.findings}
                        </p>
                      )}
                      {activity.follow_up_required && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Follow-up required
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No investigation activities recorded yet.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
