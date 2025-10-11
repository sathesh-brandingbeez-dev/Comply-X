"use client"

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { IncidentDashboard } from '@/components/incidents/incident-dashboard'
import { IncidentForm } from '@/components/incidents/incident-form'
import { IncidentInvestigation } from '@/components/incidents/incident-investigation'
import { IncidentDashboardResponse, IncidentListResponse, IncidentOptionsResponse } from '@/types/incidents'
import { api } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, FilePlus2, NotebookPen, UserCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function IncidentReportingPage() {
  const [dashboard, setDashboard] = useState<IncidentDashboardResponse | undefined>()
  const [options, setOptions] = useState<IncidentOptionsResponse | undefined>()
  const [incidents, setIncidents] = useState<IncidentListResponse | undefined>()
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [incidentsLoading, setIncidentsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'investigation'>('dashboard')
  const [incidentError, setIncidentError] = useState<string | null>(null)
  const [assignedToMe, setAssignedToMe] = useState(false)

  useEffect(() => {
    fetchOptions()
    fetchDashboard()
    fetchIncidents()
  }, [])

  const fetchOptions = async () => {
    try {
      const data = await api<IncidentOptionsResponse>('/incidents/options')
      setOptions(data)
    } catch (error) {
      console.error('Unable to load incident options', error)
    }
  }

  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const data = await api<IncidentDashboardResponse>('/incidents/dashboard')
      setDashboard(data)
    } catch (error) {
      console.error('Unable to load dashboard', error)
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchIncidents = async (query: { assigned_to_me?: boolean } = {}) => {
    setIncidentsLoading(true)
    setIncidentError(null)
    try {
      const params = new URLSearchParams()
      if (query.assigned_to_me) params.set('assigned_to_me', 'true')
      const data = await api<IncidentListResponse>(`/incidents${params.toString() ? `?${params}` : ''}`)
      setIncidents(data)
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Failed to load incidents')
    } finally {
      setIncidentsLoading(false)
    }
  }

  const handleIncidentCreated = () => {
    fetchDashboard()
    fetchIncidents({ assigned_to_me: assignedToMe })
    setActiveTab('investigation')
  }

  const handleRefreshList = () => {
    fetchIncidents({ assigned_to_me: assignedToMe })
    fetchDashboard()
  }

  const quickActions = [
    {
      label: 'Report Incident',
      description: 'Capture new incident details with evidence.',
      color: 'bg-red-500 hover:bg-red-600',
      icon: FilePlus2,
      onClick: () => setActiveTab('report'),
    },
    {
      label: 'My Incidents',
      description: 'Review investigations assigned to you.',
      color: 'bg-blue-500 hover:bg-blue-600',
      icon: UserCheck,
      onClick: () => {
        setAssignedToMe(true)
        fetchIncidents({ assigned_to_me: true })
        setActiveTab('investigation')
      },
    },
    {
      label: 'Generate Report',
      description: 'Create a summary report for stakeholders.',
      color: 'bg-emerald-500 hover:bg-emerald-600',
      icon: NotebookPen,
      onClick: () =>
        alert('Incident analytics report generation can be configured to export to PDF and slide decks.'),
    },
    {
      label: 'Export Data',
      description: 'Download incident dataset for analysis.',
      color: 'bg-purple-500 hover:bg-purple-600',
      icon: Download,
      onClick: () => alert('Incident data exported. Connect BI tools for automated synchronisation.'),
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Incident Reporting &amp; Investigation</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Track incident lifecycle from reporting through investigation with AI-supported insights for classification, severity
            assessment, and escalation planning.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Card key={action.label} className="border-green-200 shadow-sm">
              <CardContent className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{action.label}</span>
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
                <Button className={action.color} onClick={action.onClick}>
                  {action.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
          <TabsList className="bg-green-50">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="report">Report Incident</TabsTrigger>
            <TabsTrigger value="investigation">Investigation</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="space-y-6">
            <IncidentDashboard data={dashboard} loading={dashboardLoading} onRefresh={fetchDashboard} />
          </TabsContent>
          <TabsContent value="report">
            <IncidentForm options={options} onCreated={handleIncidentCreated} />
          </TabsContent>
          <TabsContent value="investigation" className="space-y-4">
            {incidentError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{incidentError}</div>
            )}
            <IncidentInvestigation
              incidents={incidents?.items ?? []}
              loading={incidentsLoading}
              onRefresh={handleRefreshList}
              options={options}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAssignedToMe(false)
                fetchIncidents()
              }}
            >
              Clear filters
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
