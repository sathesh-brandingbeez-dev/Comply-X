"use client"

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CorrectiveActionDashboard } from '@/components/corrective-actions/corrective-action-dashboard'
import { CorrectiveActionForm } from '@/components/corrective-actions/corrective-action-form'
import { CorrectiveActionTracker } from '@/components/corrective-actions/corrective-action-tracker'
import { api } from '@/lib/api'
import {
  CorrectiveActionDashboardResponse,
  CorrectiveActionDetail,
  CorrectiveActionListResponse,
  CorrectiveActionMetricInput,
  CorrectiveActionOptionsResponse,
  CorrectiveActionStepInput,
  CorrectiveActionUpdateType,
} from '@/types/corrective-actions'

export default function CorrectiveActionsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'tracking'>('dashboard')
  const [dashboard, setDashboard] = useState<CorrectiveActionDashboardResponse | undefined>()
  const [options, setOptions] = useState<CorrectiveActionOptionsResponse | undefined>()
  const [actions, setActions] = useState<CorrectiveActionListResponse | undefined>()
  const [selectedAction, setSelectedAction] = useState<CorrectiveActionDetail | undefined>()
  const [selectedActionId, setSelectedActionId] = useState<number | undefined>()
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchOptions()
    fetchDashboard()
    fetchActions()
  }, [])

  useEffect(() => {
    if (selectedActionId != null) {
      fetchActionDetail(selectedActionId)
    }
  }, [selectedActionId])

  const fetchOptions = async () => {
    try {
      const data = await api<CorrectiveActionOptionsResponse>('/corrective-actions/options')
      setOptions(data)
    } catch (error) {
      console.error('Unable to load corrective action options', error)
    }
  }

  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const data = await api<CorrectiveActionDashboardResponse>('/corrective-actions/dashboard')
      setDashboard(data)
    } catch (error) {
      console.error('Unable to load corrective action dashboard', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchActions = async () => {
    setActionsLoading(true)
    try {
      const data = await api<CorrectiveActionListResponse>('/corrective-actions')
      setActions(data)
      if (!selectedActionId && data.items.length) {
        setSelectedActionId(data.items[0].id)
      }
      if (selectedActionId && !data.items.find((item) => item.id === selectedActionId) && data.items.length) {
        setSelectedActionId(data.items[0].id)
      }
      if (!data.items.length) {
        setSelectedAction(undefined)
        setSelectedActionId(undefined)
      }
    } catch (error) {
      console.error('Unable to load corrective actions', error)
    } finally {
      setActionsLoading(false)
    }
  }

  const fetchActionDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const data = await api<CorrectiveActionDetail>(`/corrective-actions/${id}`)
      setSelectedAction(data)
    } catch (error) {
      console.error('Unable to load corrective action detail', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleActionCreated = () => {
    fetchDashboard()
    fetchActions()
    setActiveTab('tracking')
  }

  const handleSelectAction = (id: number) => {
    setSelectedActionId(id)
    setActiveTab('tracking')
  }

  const handleUpdateStep = async (stepId: number, payload: CorrectiveActionStepInput) => {
    if (!selectedAction) return
    await api(`/corrective-actions/${selectedAction.id}/steps/${stepId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    fetchActionDetail(selectedAction.id)
    fetchDashboard()
    fetchActions()
  }

  const handleUpdateMetric = async (metricId: number, payload: CorrectiveActionMetricInput) => {
    if (!selectedAction) return
    await api(`/corrective-actions/${selectedAction.id}/metrics/${metricId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    fetchActionDetail(selectedAction.id)
    fetchDashboard()
  }

  const handleAddUpdate = async (payload: { update_type: CorrectiveActionUpdateType; description: string }) => {
    if (!selectedAction) return
    await api(`/corrective-actions/${selectedAction.id}/updates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    fetchActionDetail(selectedAction.id)
    fetchDashboard()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Corrective Actions</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Orchestrate, track, and evaluate corrective and preventive actions with AI-assisted prioritisation.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <TabsList className="bg-green-50">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="create">Create Action</TabsTrigger>
            <TabsTrigger value="tracking">Tracking & Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <CorrectiveActionDashboard data={dashboard} loading={dashboardLoading} onRefresh={fetchDashboard} />
          </TabsContent>

          <TabsContent value="create">
            <CorrectiveActionForm options={options} onCreated={handleActionCreated} />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <CorrectiveActionTracker
              actions={actions?.items ?? []}
              selectedAction={selectedAction}
              listLoading={actionsLoading}
              detailLoading={detailLoading}
              onSelectAction={handleSelectAction}
              onRefresh={() => {
                fetchActions()
                fetchDashboard()
                if (selectedActionId) fetchActionDetail(selectedActionId)
              }}
              onUpdateStep={handleUpdateStep}
              onUpdateMetric={handleUpdateMetric}
              onAddUpdate={handleAddUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
