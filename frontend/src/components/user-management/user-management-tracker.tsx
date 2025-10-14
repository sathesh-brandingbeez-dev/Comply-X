'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Activity, CheckCircle, Loader2, RefreshCcw, Search, ShieldAlert } from 'lucide-react'
import type {
  UserManagementDetail,
  UserManagementListItem,
  UserManagementUpdate,
} from '@/types/user-management'
import { cn } from '@/lib/utils'

interface UserManagementTrackerProps {
  users: UserManagementListItem[]
  selectedUser?: UserManagementDetail
  listLoading: boolean
  detailLoading: boolean
  onSelectUser: (id: number) => void
  onRefresh: () => void
  onUpdateUser: (id: number, payload: UserManagementUpdate) => Promise<void>
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Inactive: 'bg-rose-50 text-rose-700 border border-rose-200',
  'Pending Verification': 'bg-amber-50 text-amber-700 border border-amber-200',
}

export function UserManagementTracker({
  users,
  selectedUser,
  listLoading,
  detailLoading,
  onSelectUser,
  onRefresh,
  onUpdateUser,
}: UserManagementTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingField, setUpdatingField] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.department ?? '').toLowerCase().includes(term)
    )
  }, [users, searchTerm])

  const handleToggle = async (field: keyof UserManagementUpdate, value: boolean) => {
    if (!selectedUser) return
    setUpdatingField(field)
    try {
      await onUpdateUser(selectedUser.id, { [field]: value })
    } finally {
      setUpdatingField(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-4 border-green-200 shadow-sm">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">User Directory</CardTitle>
              <CardDescription>Search and select users to manage access.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, department"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {listLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 rounded-md border border-green-100 bg-green-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const isSelected = selectedUser?.id === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onSelectUser(user.id)}
                    className={cn(
                      'w-full rounded-md border px-3 py-3 text-left transition',
                      isSelected
                        ? 'border-green-400 bg-green-50 shadow-sm'
                        : 'border-green-100 bg-white hover:border-green-300 hover:bg-green-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className={STATUS_STYLES[user.status] ?? 'border-green-200'}>
                        {user.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{user.department ?? 'Unassigned'}</span>
                      <span>{user.risk_score.toFixed(1)} risk</span>
                    </div>
                  </button>
                )
              })}
              {!filteredUsers.length && (
                <div className="rounded-md border border-dashed border-green-200 p-4 text-xs text-muted-foreground">
                  No users found for the provided search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-8 border-green-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">
              {selectedUser ? selectedUser.full_name : 'Select a user'}
            </CardTitle>
            <CardDescription>
              {selectedUser ? selectedUser.email : 'Choose a user from the directory to view access insights.'}
            </CardDescription>
          </div>
          {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </CardHeader>
        <CardContent className="space-y-6">
          {!selectedUser ? (
            <div className="rounded-md border border-dashed border-green-200 p-6 text-center text-sm text-muted-foreground">
              Select a user to view detailed analytics, onboarding progress, and access controls.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border border-green-100 bg-green-50 p-4">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {selectedUser.role.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="rounded-md border border-green-100 bg-green-50 p-4">
                  <p className="text-xs text-muted-foreground">Permission Level</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">
                    {selectedUser.permission_level.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="rounded-md border border-green-100 bg-green-50 p-4">
                  <p className="text-xs text-muted-foreground">Engagement Score</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedUser.engagement_score}</p>
                </div>
                <div className="rounded-md border border-green-100 bg-green-50 p-4">
                  <p className="text-xs text-muted-foreground">Attrition Risk</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{selectedUser.attrition_risk}</p>
                    <Badge variant="outline" className="border-amber-200 text-amber-700">
                      {selectedUser.risk_level}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-md border border-green-100 p-4">
                  <p className="text-sm font-semibold text-slate-900">Access Controls</p>
                  <div className="space-y-3 text-xs text-muted-foreground">
                    {selectedUser.access_insights.map((insight) => (
                      <p key={insight}>{insight}</p>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Active</p>
                        <p className="text-[11px] text-muted-foreground">Enable or suspend access.</p>
                      </div>
                      <Switch
                        checked={selectedUser.is_active}
                        disabled={updatingField === 'is_active'}
                        onCheckedChange={(value) => handleToggle('is_active', value)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Verified</p>
                        <p className="text-[11px] text-muted-foreground">Identity confirmed.</p>
                      </div>
                      <Switch
                        checked={selectedUser.is_verified}
                        disabled={updatingField === 'is_verified'}
                        onCheckedChange={(value) => handleToggle('is_verified', value)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">MFA Enabled</p>
                        <p className="text-[11px] text-muted-foreground">Critical for privileged roles.</p>
                      </div>
                      <Switch
                        checked={selectedUser.mfa_enabled}
                        disabled={updatingField === 'mfa_enabled'}
                        onCheckedChange={(value) => handleToggle('mfa_enabled', value)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-green-100 bg-green-50 p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-900">Notifications</p>
                        <p className="text-[11px] text-muted-foreground">Email alerts enabled.</p>
                      </div>
                      <Badge variant="outline" className="border-green-200 text-green-700">
                        {selectedUser.areas_of_responsibility.length} focus areas
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-green-100 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Onboarding Progress</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedUser.onboarding_progress.toFixed(1)}% completion across verification signals.
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50/50">
                        <TableHead className="text-xs text-slate-700">Step</TableHead>
                        <TableHead className="text-xs text-slate-700">Owner</TableHead>
                        <TableHead className="text-xs text-slate-700">Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.onboarding_steps.map((step, index) => (
                        <TableRow key={`${step.title}-${index}`}>
                          <TableCell className="text-xs text-slate-900">{step.title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{step.owner ?? 'TBC'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {step.due_date ? new Date(step.due_date).toLocaleDateString() : 'Planning'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!selectedUser.onboarding_steps.length && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                            No onboarding steps recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-green-100 p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    <p className="text-sm font-semibold text-slate-900">Activity Timeline</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {selectedUser.activity_timeline.map((activity) => (
                      <div key={`${activity.activity_type}-${activity.timestamp}`} className="rounded-md border border-green-100 bg-green-50 p-3">
                        <p className="text-xs font-semibold text-slate-900">{activity.activity_type}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleString()} — {activity.description}
                        </p>
                      </div>
                    ))}
                    {!selectedUser.activity_timeline.length && (
                      <div className="rounded-md border border-dashed border-green-200 p-3 text-xs text-muted-foreground">
                        No recent activity captured for this user.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-green-100 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-500" />
                    <p className="text-sm font-semibold text-slate-900">Risk Indicators</p>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      Last login:{' '}
                      {selectedUser.last_login
                        ? new Date(selectedUser.last_login).toLocaleDateString()
                        : 'No login recorded'}
                    </p>
                    <p>Manager: {selectedUser.manager ?? 'Not assigned'}</p>
                    <p>Department: {selectedUser.department ?? 'Unassigned'}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
