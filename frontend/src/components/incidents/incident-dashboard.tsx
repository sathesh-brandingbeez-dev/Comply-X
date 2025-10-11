"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  AlertCircle,
  BarChart2,
  BarChart3,
  Clock,
  Download,
  FileText,
  PieChart as PieChartIcon,
  RefreshCcw,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { IncidentDashboardResponse } from '@/types/incidents'
import { cn } from '@/lib/utils'

interface IncidentDashboardProps {
  data?: IncidentDashboardResponse
  loading: boolean
  onRefresh: () => void
}

const SEVERITY_COLORS: Record<string, string> = {
  Low: '#22c55e',
  Medium: '#facc15',
  High: '#f97316',
  Critical: '#ef4444',
}

const CATEGORY_COLORS = ['#16a34a', '#0ea5e9', '#ec4899', '#a855f7', '#14b8a6', '#f97316', '#facc15']

export function IncidentDashboard({ data, loading, onRefresh }: IncidentDashboardProps) {
  const summary = data?.summary
  const analytics = data?.analytics

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Incident Overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor incident volume, response effectiveness, and AI-driven recommendations in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button variant="outline" onClick={onRefresh} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
          <span>Last updated {data ? new Date(data.last_refreshed).toLocaleString() : '—'}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="border-green-200">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="mt-4 h-8 w-32" />
                <Skeleton className="mt-2 h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <DashboardStatCard
              icon={Activity}
              label="Total Incidents"
              value={summary.total_incidents}
              trend={summary.trend_change_percentage}
              trendDirection={summary.trend_direction}
              accent="text-primary"
            />
            <DashboardStatCard
              icon={ShieldAlert}
              label="Open Incidents"
              value={summary.open_incidents}
              badgeClass="bg-red-100 text-red-600"
            />
            <DashboardStatCard
              icon={CheckmarkCircle}
              label="Resolved This Month"
              value={summary.resolved_this_month}
              badgeClass="bg-emerald-100 text-emerald-600"
            />
            <DashboardStatCard
              icon={Clock}
              label="Avg. Resolution Time"
              value={
                summary.average_resolution_time_hours != null
                  ? `${summary.average_resolution_time_hours.toFixed(1)} hrs`
                  : '—'
              }
              badgeClass="bg-sky-100 text-sky-600"
              helper={`${summary.overdue_incidents} overdue`}
            />
          </>
        ) : (
          <Card className="border-green-200">
            <CardContent className="p-6 text-sm text-muted-foreground">
              No incident data available yet.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <BarChart3 className="h-5 w-5 text-primary" /> Incident Trend
            </CardTitle>
            <CardDescription>
              Track incident creation and resolution velocity with AI-enhanced projections.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="open_count" name="Reported" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolved_count" name="Resolved" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="predicted_count" name="Predicted" stroke="#f97316" strokeDasharray="6 6" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart2} message="Trend data will appear once incidents are logged." />
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <PieChartIcon className="h-5 w-5 text-rose-500" /> Category Mix
            </CardTitle>
            <CardDescription>Distribution of incidents by category.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.categories.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.categories} dataKey="count" nameKey="category" outerRadius={100} label>
                    {analytics.categories.map((entry, index) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={PieChartIcon} message="Categories will populate as incidents are classified." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Severity Distribution
            </CardTitle>
            <CardDescription>Assess current incident risk exposure.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.severity.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.severity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="severity" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {analytics.severity.map((entry) => (
                      <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity] || '#60a5fa'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={AlertCircle} message="Severity metrics will be available after incidents are logged." />
            )}
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <BarChart2 className="h-5 w-5 text-indigo-500" /> Department Performance
            </CardTitle>
            <CardDescription>Resolution velocity by department.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : analytics && analytics.department_performance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.department_performance} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="department_name" width={180} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average_resolution_hours" name="Avg. Hours" fill="#38bdf8" />
                  <Bar dataKey="open_count" name="Open" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={BarChart2} message="Department analytics will appear as incidents are investigated." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <FileText className="h-5 w-5 text-emerald-600" /> AI Insights
          </CardTitle>
          <CardDescription>
            Predictive intelligence summarising future load and resource actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {loading || !analytics ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Forecast</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analytics.ai.narrative}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Activity className="h-4 w-4 text-primary" />
                Expected next month load: <span className="font-semibold">{analytics.ai.forecast_next_month}</span>
                <span className="text-xs text-muted-foreground">
                  confidence {(analytics.ai.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
          {loading || !analytics ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800">Recommended Actions</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {analytics.ai.alerts.map((alert) => (
                  <li key={alert} className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-500" />
                    <span>{alert}</span>
                  </li>
                ))}
                {analytics.ai.resource_recommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2">
                    <Download className="mt-0.5 h-4 w-4 text-emerald-500" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface DashboardStatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  trend?: number | null
  trendDirection?: 'up' | 'down' | 'flat'
  badgeClass?: string
  accent?: string
  helper?: string
}

function DashboardStatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
  badgeClass,
  accent,
  helper,
}: DashboardStatCardProps) {
  return (
    <Card className="border-green-200 shadow-sm">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Icon className={cn('h-5 w-5 text-primary', accent)} />
        </div>
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        {typeof trend === 'number' && trendDirection ? (
          <div
            className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', {
              'bg-emerald-100 text-emerald-700': trendDirection === 'up',
              'bg-red-100 text-red-600': trendDirection === 'down',
              'bg-slate-100 text-slate-600': trendDirection === 'flat',
            })}
          >
            {trendDirection === 'up' ? '▲' : trendDirection === 'down' ? '▼' : '■'}{' '}
            {Math.abs(trend).toFixed(1)}%
          </div>
        ) : helper ? (
          <span className={cn('inline-flex items-center rounded-full px-2 py-1 text-xs font-medium', badgeClass)}>
            {helper}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-sm text-muted-foreground">
      <Icon className="h-8 w-8 text-gray-300" />
      <span>{message}</span>
    </div>
  )
}

function CheckmarkCircle(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={cn('h-5 w-5 text-emerald-500', props.className)}
    >
      <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
