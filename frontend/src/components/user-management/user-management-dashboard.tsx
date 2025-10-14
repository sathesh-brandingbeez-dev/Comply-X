import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  LineChart,
  Line,
} from 'recharts'
import { RefreshCcw, ShieldCheck, Users, UserCheck, AlertTriangle, Zap } from 'lucide-react'
import type { UserManagementDashboardResponse, UserManagementPriorityUser } from '@/types/user-management'
import { cn } from '@/lib/utils'

interface UserManagementDashboardProps {
  data?: UserManagementDashboardResponse
  loading: boolean
  onRefresh: () => void
}

const STATUS_COLORS = ['#22c55e', '#f97316', '#f43f5e', '#0ea5e9']
const ROLE_COLORS = ['#0ea5e9', '#6366f1', '#22c55e', '#f59e0b', '#f97316', '#ec4899']

const EmptyState = () => (
  <div className="rounded-md border border-dashed border-green-200 p-6 text-center text-sm text-muted-foreground">
    No user analytics available yet. Add users to see real-time insights.
  </div>
)

const renderPriorityTable = (title: string, users: UserManagementPriorityUser[], badgeColor: string) => (
  <Card className="border-green-200 shadow-sm">
    <CardHeader>
      <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
      <CardDescription>Top spotlighted accounts needing attention.</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-green-50/50">
            <TableHead className="text-slate-700">User</TableHead>
            <TableHead className="text-slate-700">Role</TableHead>
            <TableHead className="text-slate-700">Department</TableHead>
            <TableHead className="text-right text-slate-700">Risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium text-slate-900">{user.full_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('capitalize border', badgeColor)}>
                  {user.role.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.department ?? 'Unassigned'}</TableCell>
              <TableCell className="text-right text-sm font-semibold text-slate-900">{user.risk_score}</TableCell>
            </TableRow>
          ))}
          {!users.length && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                No records to display.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

export function UserManagementDashboard({ data, loading, onRefresh }: UserManagementDashboardProps) {
  if (loading) {
    return (
      <Card className="border-green-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900">User Management Overview</CardTitle>
            <CardDescription>Summarised health metrics across your workforce.</CardDescription>
          </div>
          <Button variant="outline" size="icon" disabled>
            <RefreshCcw className="h-4 w-4 animate-spin" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-md border border-green-100 bg-green-50 animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return <EmptyState />
  }

  const { summary, analytics, priority_lists, ai_summary } = data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Management Overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor account health, access posture, and AI-prioritised workforce actions.
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} className="border-green-200 text-primary">
          <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Users</CardDescription>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.total_users}</div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Active Accounts</CardDescription>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.active_users}</div>
            <p className="text-xs text-muted-foreground">{summary.mfa_enabled_rate}% have MFA enabled</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Pending Verification</CardDescription>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.pending_verification}</div>
            <p className="text-xs text-muted-foreground">Users awaiting identity verification</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Average Tenure</CardDescription>
            <ShieldCheck className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.average_tenure_days.toFixed(1)} days</div>
            <p className="text-xs text-muted-foreground">{summary.new_this_month} new users this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-green-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Status Distribution</CardTitle>
            <CardDescription>User accounts by lifecycle status.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.status_distribution} dataKey="count" nameKey="status" innerRadius={60} outerRadius={90}>
                  {analytics.status_distribution.map((entry, index) => (
                    <Cell key={`slice-${entry.status}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} users`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-green-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Role Mix</CardTitle>
            <CardDescription>Distribution of user roles in the platform.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.role_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                <XAxis dataKey="role" tickFormatter={(role: string) => role.replace(/_/g, ' ')} stroke="#047857" />
                <YAxis stroke="#047857" allowDecimals={false} />
                <Tooltip formatter={(value: number) => `${value} users`} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.role_distribution.map((entry, index) => (
                    <Cell key={`role-${entry.role}`} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-green-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">User Growth Trend</CardTitle>
            <CardDescription>Monthly onboarding pattern.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.growth_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis dataKey="period" stroke="#047857" />
                <YAxis stroke="#047857" allowDecimals={false} />
                <Tooltip formatter={(value: number) => `${value} new users`} />
                <Line type="monotone" dataKey="user_count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-green-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Department Insights</CardTitle>
            <CardDescription>Headcount distribution across teams.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.department_distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                <XAxis type="number" stroke="#047857" allowDecimals={false} />
                <YAxis dataKey="department_name" type="category" stroke="#047857" width={160} />
                <Tooltip formatter={(value: number) => `${value} users`} />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">AI Workforce Spotlight</CardTitle>
            <CardDescription>Predictive insights from platform analytics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50 p-3">
              <Zap className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Health Score</p>
                <p className="text-xs text-muted-foreground">{ai_summary.workforce_health_score}/100 projected onboarding health</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">Focus Areas</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
                {ai_summary.recommended_focus.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Risk Alerts</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-amber-700">
                {ai_summary.risk_alerts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">{ai_summary.narrative}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderPriorityTable('Critical Access Owners', priority_lists.key_roles, 'border-cyan-200 text-cyan-700 bg-cyan-50')}
        {renderPriorityTable('Inactive Accounts', priority_lists.inactive_accounts, 'border-amber-200 text-amber-700 bg-amber-50')}
        {renderPriorityTable('Pending Verification', priority_lists.pending_verification, 'border-rose-200 text-rose-700 bg-rose-50')}
        {renderPriorityTable('Recently Added', priority_lists.recently_added, 'border-emerald-200 text-emerald-700 bg-emerald-50')}
      </div>
    </div>
  )
}
