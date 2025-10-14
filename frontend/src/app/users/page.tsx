'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserManagementDashboard } from '@/components/user-management/user-management-dashboard'
import { UserManagementForm } from '@/components/user-management/user-management-form'
import { UserManagementTracker } from '@/components/user-management/user-management-tracker'
import { api } from '@/lib/api'
import type {
  UserManagementDashboardResponse,
  UserManagementDetail,
  UserManagementListResponse,
  UserManagementOptionsResponse,
  UserManagementUpdate,
} from '@/types/user-management'

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'tracking'>('dashboard')
  const [dashboard, setDashboard] = useState<UserManagementDashboardResponse | undefined>()
  const [options, setOptions] = useState<UserManagementOptionsResponse | undefined>()
  const [users, setUsers] = useState<UserManagementListResponse | undefined>()
  const [selectedUser, setSelectedUser] = useState<UserManagementDetail | undefined>()
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>()
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchOptions()
    fetchDashboard()
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedUserId != null) {
      fetchUserDetail(selectedUserId)
    }
  }, [selectedUserId])

  const fetchOptions = async () => {
    try {
      const data = await api<UserManagementOptionsResponse>('/user-management/options')
      setOptions(data)
    } catch (error) {
      console.error('Unable to load user management options', error)
    }
  }

  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const data = await api<UserManagementDashboardResponse>('/user-management/dashboard')
      setDashboard(data)
    } catch (error) {
      console.error('Unable to load user management dashboard', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchUsers = async () => {
    setListLoading(true)
    try {
      const data = await api<UserManagementListResponse>('/user-management')
      setUsers(data)
      if (!selectedUserId && data.items.length) {
        setSelectedUserId(data.items[0].id)
      }
      if (selectedUserId && !data.items.find((item) => item.id === selectedUserId) && data.items.length) {
        setSelectedUserId(data.items[0].id)
      }
      if (!data.items.length) {
        setSelectedUser(undefined)
        setSelectedUserId(undefined)
      }
    } catch (error) {
      console.error('Unable to load users', error)
    } finally {
      setListLoading(false)
    }
  }

  const fetchUserDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const data = await api<UserManagementDetail>(`/user-management/${id}`)
      setSelectedUser(data)
    } catch (error) {
      console.error('Unable to load user detail', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleUserCreated = () => {
    fetchDashboard()
    fetchUsers()
    setActiveTab('tracking')
  }

  const handleSelectUser = (id: number) => {
    setSelectedUserId(id)
    setActiveTab('tracking')
  }

  const handleUpdateUser = async (id: number, payload: UserManagementUpdate) => {
    await api(`/user-management/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    fetchDashboard()
    fetchUsers()
    fetchUserDetail(id)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Govern user access, monitor workforce readiness, and orchestrate onboarding experiences with AI assistance.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <TabsList className="bg-green-50">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="create">Create User</TabsTrigger>
            <TabsTrigger value="tracking">Directory &amp; Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <UserManagementDashboard data={dashboard} loading={dashboardLoading} onRefresh={fetchDashboard} />
          </TabsContent>

          <TabsContent value="create">
            <UserManagementForm options={options} onCreated={handleUserCreated} />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <UserManagementTracker
              users={users?.items ?? []}
              selectedUser={selectedUser}
              listLoading={listLoading}
              detailLoading={detailLoading}
              onSelectUser={handleSelectUser}
              onRefresh={() => {
                fetchUsers()
                fetchDashboard()
                if (selectedUserId) fetchUserDetail(selectedUserId)
              }}
              onUpdateUser={handleUpdateUser}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
