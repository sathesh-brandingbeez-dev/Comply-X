"use client"

import type { ComponentType } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RefreshCcw,
  ClipboardList,
  AlertTriangle,
  AlarmClock,
  CheckCircle2,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  BrainCircuit,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  CorrectiveActionDashboardResponse,
  CorrectiveActionPriority,
  PriorityActionItem,
} from '@/types/corrective-actions'

interface CorrectiveActionDashboardProps {
  data?: CorrectiveActionDashboardResponse
  loading: boolean
  onRefresh: () => void
}

const STATUS_COLORS: Record<string, string> = {
  Open: '#14b8a6',
  'In Progress': '#f97316',
  Completed: '#22c55e',
  Closed: '#64748b',
  Cancelled: '#94a3b8',
}

const PRIORITY_BADGE: Record<CorrectiveActionPriority, string> = {
  Low: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  Medium: 'bg-sky-50 text-sky-600 border border-sky-100',
  High: 'bg-amber-50 text-amber-600 border border-amber-100',
  Critical: 'bg-rose-50 text-rose-600 border border-rose-100',
}

const TYPE_COLORS = ['#0ea5e9', '#14b8a6', '#f97316', '#6366f1', '#facc15']

export function CorrectiveActionDashboard({ data, loading, onRefresh }: CorrectiveActionDashboardProps) {
  const summary = data?.summary
  const analytics = data?.analytics
  const priorityLists = data?.priority_lists

  const summaryCards = summary
    ? [
        {
          label: 'Total Actions',
          value: summary.total_actions,
          helper:
            summary.trend_delta != null
              ? `${summary.trend_delta > 0 ? '▲' : summary.trend_delta < 0 ? '▼' : '▬'} ${Math.abs(
                  summary.trend_delta
                ).toFixed(1)}%`
              : '—',
          icon: ClipboardList,
        },
        {
          label: 'Open Actions',
          value: summary.open_actions,
          helper: 'Active workload',
          icon: AlertTriangle,
        },
        {
          label: 'Overdue',
          value: summary.overdue_actions,
          helper: 'Require escalation',
          icon: AlarmClock,
        },
        {
          label: 'Completed This Month',
          value: summary.completed_this_month,
          helper: 'Closure velocity',
          icon: CheckCircle2,
        },
        {
          label: 'Avg. Effectiveness',
          value: summary.average_effectiveness != null ? `${summary.average_effectiveness.toFixed(1)}%` : '—',
          helper: 'AI predicted',
          icon: Sparkles,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Corrective Actions Intelligence</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Monitor remediation performance, AI-prioritised risks, and completion trends to keep improvement programmes on
            track.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="outline" onClick={onRefresh} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <span>Last updated {data ? new Date(data.last_refreshed).toLocaleString() : '—'}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, idx) => (
              <Card key={idx} className="border-green-200">
                <CardContent className="p-5 space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => (
              <Card key={card.label} className="border-green-200 shadow-sm">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">{card.label}</span>
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
                  <span className="text-xs text-muted-foreground">{card.helper}</span>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <LineChartIcon className="h-5 w-5 text-primary" /> Completion Trend
            </CardTitle>
            <CardDescription>Review closure momentum with forward-looking projections.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.completion_trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.completion_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed_count" name="Completed" stroke="#22c55e" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="predicted_count"
                    name="Predicted"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={LineChartIcon} message="Completion insights will appear once actions are recorded." />
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <PieChartIcon className="h-5 w-5 text-emerald-500" /> Status Distribution
            </CardTitle>
            <CardDescription>Balance of open, in-progress, and closed actions.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.status_distribution.some((item) => item.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.status_distribution} dataKey="count" nameKey="status" outerRadius={100} label>
                    {analytics.status_distribution.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#0f172a'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={PieChartIcon} message="Status mix will populate as actions progress." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <BarChart3 className="h-5 w-5 text-sky-500" /> Actions by Department
            </CardTitle>
            <CardDescription>Identify departments with highest remediation workload.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.department_distribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.department_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department_name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart3} message="Department analytics will appear after assignments." />
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <BrainCircuit className="h-5 w-5 text-purple-500" /> Action Type Mix
            </CardTitle>
            <CardDescription>Balance of immediate, preventive, and long-term initiatives.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.type_distribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.type_distribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="action_type" type="category" width={160} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {analytics.type_distribution.map((entry, idx) => (
                      <Cell key={entry.action_type} fill={TYPE_COLORS[idx % TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BrainCircuit} message="Action types will populate with new submissions." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> AI Highlights
          </CardTitle>
          <CardDescription>Automated insights based on risk scores, timelines, and predicted effectiveness.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : data && data.ai_highlights.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {data.ai_highlights.map((highlight) => (
                <li key={highlight} className="rounded-md border border-green-200 bg-green-50/60 p-4 text-sm text-slate-700">
                  {highlight}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Sparkles} message="AI will surface notable callouts as activity grows." />
          )}
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900">Priority Action Queues</CardTitle>
          <CardDescription>Focus execution on the most critical remediation workstreams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : priorityLists ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <PriorityTable title="High Priority" actions={priorityLists.high_priority} emptyMessage="No high risk actions." />
              <PriorityTable title="Overdue" actions={priorityLists.overdue} emptyMessage="Great job—nothing overdue." />
              <PriorityTable title="Due This Week" actions={priorityLists.due_this_week} emptyMessage="No actions due within 7 days." />
              <PriorityTable title="Recently Completed" actions={priorityLists.recently_completed} emptyMessage="No recent completions." />
            </div>
          ) : (
            <EmptyState icon={ClipboardList} message="Priority queues will populate as actions are created." />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PriorityTable({
  title,
  actions,
  emptyMessage,
}: {
  title: string
  actions: PriorityActionItem[]
  emptyMessage: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-muted-foreground">{actions.length} items</span>
      </div>
      {actions.length ? (
        <div className="overflow-hidden rounded-lg border border-green-100">
          <Table>
            <TableHeader className="bg-green-50">
              <TableRow>
                <TableHead className="w-32">Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action) => (
                <TableRow key={action.id} className="hover:bg-green-50/60">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{action.title}</span>
                      <span className="text-xs text-muted-foreground">{action.action_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{action.status}</span>
                      <span
                        className={cn(
                          'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          PRIORITY_BADGE[action.priority],
                        )}
                      >
                        {action.priority}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{action.owner_name ?? 'Unassigned'}</div>
                    {action.due_date && (
                      <div className="text-xs text-muted-foreground">
                        Due {new Date(action.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-slate-900">
                    {Math.round(action.progress_percent)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-green-200 p-4 text-xs text-muted-foreground">{emptyMessage}</div>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  message,
}: {
  icon: ComponentType<{ className?: string }>
  message: string
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-green-200 bg-white/60 p-6 text-center text-sm text-muted-foreground">
      <Icon className="h-6 w-6 text-primary" />
      <p>{message}</p>
    </div>
  )
}
