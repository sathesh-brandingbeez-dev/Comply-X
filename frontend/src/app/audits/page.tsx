"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronDown,
  FileDown,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Users,
  Clock,
  Sparkles,
} from "lucide-react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import {
  AuditAIRecommendations,
  AuditCalendarEvent,
  AuditPlanningDashboard,
  AuditStatus,
  DepartmentOption,
} from "@/types/audits"

const STATUS_LABELS: Record<AuditStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
}

const STATUS_COLOR: Record<AuditStatus, string> = {
  draft: "bg-gray-200 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
}

const RISK_COLOR: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

type ViewMode = "month" | "week" | "day"

type AuditPlanningState = {
  data: AuditPlanningDashboard | null
  loading: boolean
  error: string | null
}

const VIEW_LABELS: Record<ViewMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
}

const TEMPLATE_OPTIONS = [
  "Internal Audit",
  "Compliance Audit",
  "Quality Audit",
  "Financial Audit",
  "IT Audit",
  "Risk Assessment Audit",
  "Custom Template",
]

const FALLBACK_DASHBOARD: AuditPlanningDashboard = {
  calendar_events: [
    {
      id: 1,
      audit_id: 1,
      title: "ISO 27001 Surveillance Audit",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "scheduled",
      audit_type: "it_security_audit",
      lead_auditor: "Alex Rivera",
      department_names: ["Information Security", "Infrastructure"],
      risk_level: "high",
      quick_actions: ["View Plan", "Assign Resources"],
    },
    {
      id: 2,
      audit_id: 2,
      title: "Quarterly Internal Controls Review",
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "in_progress",
      audit_type: "internal_audit",
      lead_auditor: "Priya Sharma",
      department_names: ["Finance", "Procurement"],
      risk_level: "medium",
      quick_actions: ["View Plan", "Open Checklist"],
    },
  ],
  legend: {
    scheduled: "bg-blue-500",
    in_progress: "bg-green-500",
    completed: "bg-emerald-600",
    draft: "bg-gray-400",
    on_hold: "bg-amber-500",
  },
  audits: [
    {
      id: 1,
      title: "ISO 27001 Surveillance Audit",
      audit_type: "it_security_audit",
      departments: ["Information Security", "Infrastructure"],
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "scheduled",
      progress: 35,
      lead_auditor: "Alex Rivera",
      risk_level: "high",
    },
    {
      id: 2,
      title: "Quarterly Internal Controls Review",
      audit_type: "internal_audit",
      departments: ["Finance", "Procurement"],
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "in_progress",
      progress: 62,
      lead_auditor: "Priya Sharma",
      risk_level: "medium",
    },
  ],
  summary: {
    total_audits: 2,
    scheduled: 1,
    in_progress: 1,
    completed: 0,
    overdue: 0,
    average_progress: 48,
  },
  ai_recommendations: {
    intelligent_schedule: [
      "Prioritise ISO 27001 Surveillance Audit due to its high risk profile.",
      "Prepare kickoff briefing for Quarterly Internal Controls Review next Monday.",
    ],
    resource_allocation: [
      "Balance workload by limiting auditors to 2 concurrent engagements.",
      "Allocate at least 30% of effort to evidence validation for high risk audits.",
    ],
    duration_predictions: [
      "Predicted average audit duration: 32 hours.",
      "High risk audits require approximately 40 hours based on current plan.",
    ],
  },
}

function getAuditTypeBadge(type: string) {
  const mapping: Record<string, string> = {
    internal_audit: "bg-slate-100 text-slate-700",
    compliance_audit: "bg-indigo-100 text-indigo-700",
    quality_audit: "bg-purple-100 text-purple-700",
    financial_audit: "bg-amber-100 text-amber-700",
    it_security_audit: "bg-cyan-100 text-cyan-700",
    risk_assessment_audit: "bg-rose-100 text-rose-700",
    operational_audit: "bg-teal-100 text-teal-700",
    environmental_audit: "bg-lime-100 text-lime-700",
    health_safety_audit: "bg-orange-100 text-orange-700",
    custom_template: "bg-gray-100 text-gray-600",
  }
  return mapping[type] ?? "bg-gray-100 text-gray-600"
}

function getAuditIcon(type: string) {
  switch (type) {
    case "it_security_audit":
      return <ShieldCheck className="h-4 w-4 text-cyan-600" />
    case "financial_audit":
      return <Target className="h-4 w-4 text-amber-600" />
    case "internal_audit":
      return <CalendarDays className="h-4 w-4 text-slate-600" />
    case "compliance_audit":
      return <FileDown className="h-4 w-4 text-indigo-600" />
    default:
      return <Sparkles className="h-4 w-4 text-emerald-600" />
  }
}

function mapViewToLabel(view: ViewMode) {
  return VIEW_LABELS[view]
}

function createEventsIndex(events: AuditCalendarEvent[]) {
  const map = new Map<string, AuditCalendarEvent[]>()
  events.forEach((event) => {
    const dateKey = event.start_date
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)!.push(event)
  })
  return map
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debounced
}

export default function AuditPlanningPage() {
  const router = useRouter()
  const [state, setState] = useState<AuditPlanningState>({
    data: null,
    loading: true,
    error: null,
  })
  const [viewMode, setViewMode] = useState<ViewMode>("month")
  const [statusFilter, setStatusFilter] = useState<"all" | AuditStatus>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounced(searchTerm)
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [activeDate, setActiveDate] = useState(() => new Date())

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const data = await api<DepartmentOption[]>("/api/organization/departments")
        setDepartmentOptions(data)
      } catch (error) {
        setDepartmentOptions([
          { id: 1, name: "Information Security" },
          { id: 2, name: "Finance" },
          { id: 3, name: "Operations" },
          { id: 4, name: "Quality" },
        ])
      }
    }
    loadDepartments()
  }, [])

  useEffect(() => {
    const fetchDashboard = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }))
      const params = new URLSearchParams()
      params.set("view", viewMode)
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      if (departmentFilter !== "all") {
        params.set("department", departmentFilter)
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch)
      }
      try {
        const data = await api<AuditPlanningDashboard>(`/api/audits/dashboard?${params.toString()}`)
        setState({ data, loading: false, error: null })
      } catch (error) {
        setState({
          data: FALLBACK_DASHBOARD,
          loading: false,
          error: "Unable to load live audit data. Showing intelligent fallback.",
        })
      }
    }
    fetchDashboard()
  }, [viewMode, statusFilter, departmentFilter, debouncedSearch])

  const eventsIndex = useMemo(() => createEventsIndex(state.data?.calendar_events ?? []), [state.data])

  const monthMetadata = useMemo(() => {
    const reference = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1)
    const startDay = reference.getDay()
    const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startDay; i += 1) {
      cells.push(null)
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(reference.getFullYear(), reference.getMonth(), day))
    }
    return { cells, reference }
  }, [activeDate])

  const aiRecommendations: AuditAIRecommendations | undefined = state.data?.ai_recommendations

  const changeMonth = (direction: "next" | "prev") => {
    setActiveDate((current) => {
      const month = current.getMonth() + (direction === "next" ? 1 : -1)
      return new Date(current.getFullYear(), month, 1)
    })
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Audit Planning Dashboard</h1>
            <p className="text-sm text-gray-500">
              Coordinate audits, manage schedules, and leverage AI-assisted recommendations.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push("/audits/create")} className="bg-primary text-white hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" /> Create Audit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" /> Import Template <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Audit Templates</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TEMPLATE_OPTIONS.map((template) => (
                  <DropdownMenuItem
                    key={template}
                    onClick={() => router.push(`/audits/create?template=${encodeURIComponent(template)}`)}
                  >
                    {template}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={viewMode === mode ? "default" : "outline"}
                    onClick={() => setViewMode(mode)}
                  >
                    {mapViewToLabel(mode)} View
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search audits"
                    className="pl-9 min-w-[220px]"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AuditStatus | "all")}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Audits" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Audits</SelectItem>
                    {(Object.keys(STATUS_LABELS) as AuditStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setState((prev) => ({ ...prev }))}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarDays className="h-5 w-5 text-primary" /> Audit Calendar
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Visualise upcoming audits and quickly access key actions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => changeMonth("prev")} aria-label="Previous month">
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </Button>
                <div className="text-sm font-medium text-gray-600">
                  {activeDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </div>
                <Button variant="ghost" size="icon" onClick={() => changeMonth("next")} aria-label="Next month">
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {state.loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-gray-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid min-h-[320px] grid-cols-7 gap-2">
                    {monthMetadata.cells.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="rounded-lg border border-dashed border-gray-200 bg-gray-50" />
                      }
                      const key = day.toISOString().split("T")[0]
                      const events = eventsIndex.get(key) ?? []
                      return (
                        <div
                          key={key}
                          className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-600">{day.getDate()}</span>
                            <span className="text-[10px] text-gray-400">
                              {events.length > 0 ? `${events.length} audit${events.length > 1 ? "s" : ""}` : ""}
                            </span>
                          </div>
                          {events.map((event) => (
                            <div
                              key={event.id}
                              className="space-y-2 rounded-md border border-gray-100 bg-gradient-to-br from-white via-white to-green-50 p-2"
                            >
                              <div className="flex items-center gap-2">
                                {getAuditIcon(event.audit_type)}
                                <div>
                                  <p className="line-clamp-2 text-xs font-semibold text-gray-700">{event.title}</p>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(event.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                      {event.end_date !== event.start_date &&
                                        ` - ${new Date(event.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[event.status]}`}>
                                  {STATUS_LABELS[event.status]}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${RISK_COLOR[event.risk_level]}`}>
                                  {event.risk_level.toUpperCase()}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-medium text-gray-500">Lead: {event.lead_auditor}</p>
                                <p className="text-[10px] text-gray-400">
                                  {event.department_names.join(", ")}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {event.quick_actions.map((action) => (
                                  <Button key={action} size="sm" variant="secondary" className="h-6 px-2 text-[10px]">
                                    {action}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Legend:</span>
                    {Object.entries(state.data?.legend ?? {}).map(([status, colour]) => (
                      <span key={status} className="flex items-center gap-2">
                        <span className={`h-2 w-6 rounded-full ${colour}`} />
                        <span className="capitalize">{status.replace("_", " ")}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="h-5 w-5 text-primary" /> Planning Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <p className="text-xs text-gray-500">Total Audits</p>
                    <p className="text-xl font-semibold text-gray-800">{state.data?.summary.total_audits ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 shadow-sm">
                    <p className="text-xs text-blue-600">Scheduled</p>
                    <p className="text-xl font-semibold text-blue-700">{state.data?.summary.scheduled ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3 shadow-sm">
                    <p className="text-xs text-green-600">In Progress</p>
                    <p className="text-xl font-semibold text-green-700">{state.data?.summary.in_progress ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 shadow-sm">
                    <p className="text-xs text-emerald-600">Completed</p>
                    <p className="text-xl font-semibold text-emerald-700">{state.data?.summary.completed ?? 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Average Progress</p>
                  <Progress value={state.data?.summary.average_progress ?? 0} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" /> AI Planning Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                {aiRecommendations ? (
                  <>
                    <div>
                      <p className="font-medium text-gray-700">Intelligent Scheduling</p>
                      <ul className="mt-2 space-y-1">
                        {aiRecommendations.intelligent_schedule.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Resource Allocation</p>
                      <ul className="mt-2 space-y-1">
                        {aiRecommendations.resource_allocation.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Duration Predictions</p>
                      <ul className="mt-2 space-y-1">
                        {aiRecommendations.duration_predictions.map((item, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">AI insights will appear once audits are loaded.</p>
                )}
              </CardContent>
            </Card>

            {state.error && (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="py-4 text-sm text-amber-800">
                  {state.error}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Audit Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(state.data?.audits ?? FALLBACK_DASHBOARD.audits).map((audit) => (
                  <Card key={audit.id} className="border border-gray-100 shadow-sm">
                    <CardContent className="space-y-4 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-800">{audit.title}</h3>
                          <p className="text-xs text-gray-500">
                            {new Date(audit.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            {" – "}
                            {new Date(audit.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <Badge className={getAuditTypeBadge(audit.audit_type)}>
                          {audit.audit_type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {audit.lead_auditor}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 ${STATUS_COLOR[audit.status]}`}>
                          {STATUS_LABELS[audit.status]}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 ${RISK_COLOR[audit.risk_level]}`}>
                          {audit.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Departments</p>
                        <p className="text-sm text-gray-700">{audit.departments.join(", ")}</p>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>Progress</span>
                          <span>{audit.progress}%</span>
                        </div>
                        <Progress value={audit.progress} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/audits/${audit.id}`)}>
                          View Plan
                        </Button>
                        <Button size="sm" variant="secondary">
                          Open Checklist
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
