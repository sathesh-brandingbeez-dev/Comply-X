"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Clock,
  Loader2,
  Users,
} from "lucide-react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/api"
import { AuditStatus, RiskLevel } from "@/types/audits"

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

const RISK_COLOR: Record<RiskLevel, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
}

type TaskStatus = "not_started" | "in_progress" | "completed"

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDaysToDate(date: Date, amount: number) {
  const base = startOfDay(date)
  base.setDate(base.getDate() + amount)
  return base
}

function formatDateKey(date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map((segment) => Number.parseInt(segment, 10))
  return new Date(year, month - 1, day)
}

type AuditPlanMilestone = {
  name: string
  start_date: string
  end_date: string
  status: AuditStatus
}

type AuditPlanTask = {
  name: string
  owner: string
  due_date: string
  status: TaskStatus
}

type AuditPlanResource = {
  role: string
  name: string
  allocated_hours: number
}

type AuditPlanDetail = {
  id: number
  title: string
  audit_type: string
  status: AuditStatus
  risk_level: RiskLevel
  lead_auditor: string
  departments: string[]
  start_date: string
  end_date: string
  objectives: string[]
  scope: string
  milestones: AuditPlanMilestone[]
  tasks: AuditPlanTask[]
  resources: AuditPlanResource[]
  notes: string
  progress: number
  compliance_frameworks?: string[]
}

type PlanState = {
  loading: boolean
  data: AuditPlanDetail | null
  error: string | null
}

const today = startOfDay(new Date())
const addDays = (days: number) => formatDateKey(addDaysToDate(today, days))

const FALLBACK_PLANS: Record<number, AuditPlanDetail> = {
  1: {
    id: 1,
    title: "ISO 27001 Surveillance Audit",
    audit_type: "it_security_audit",
    status: "scheduled",
    risk_level: "high",
    lead_auditor: "Alex Rivera",
    departments: ["Information Security", "Infrastructure"],
    start_date: addDays(0),
    end_date: addDays(4),
    objectives: [
      "Validate continued compliance with ISO 27001 Annex A controls.",
      "Assess remediation effectiveness for prior non-conformities.",
    ],
    scope:
      "The audit covers network security, incident response, vendor risk management, and physical security controls across the primary data centre.",
    milestones: [
      {
        name: "Planning & Kick-off",
        start_date: addDays(0),
        end_date: addDays(1),
        status: "scheduled",
      },
      {
        name: "Fieldwork & Evidence Collection",
        start_date: addDays(1),
        end_date: addDays(3),
        status: "scheduled",
      },
      {
        name: "Reporting & Wrap-up",
        start_date: addDays(3),
        end_date: addDays(4),
        status: "draft",
      },
    ],
    tasks: [
      { name: "Kick-off meeting with stakeholders", owner: "Alex Rivera", due_date: addDays(0), status: "completed" },
      { name: "Collect evidence from SIEM platform", owner: "Jamie Chen", due_date: addDays(2), status: "in_progress" },
      { name: "Review vendor risk assessments", owner: "Priya Sharma", due_date: addDays(3), status: "not_started" },
    ],
    resources: [
      { role: "Lead Auditor", name: "Alex Rivera", allocated_hours: 24 },
      { role: "Security Analyst", name: "Jamie Chen", allocated_hours: 18 },
      { role: "Compliance Specialist", name: "Priya Sharma", allocated_hours: 16 },
    ],
    notes: "Focus on critical assets and ensure alignment with updated ISO 27001:2022 clauses.",
    progress: 35,
    compliance_frameworks: ["ISO 27001", "NIST CSF"],
  },
  2: {
    id: 2,
    title: "Quarterly Internal Controls Review",
    audit_type: "internal_audit",
    status: "in_progress",
    risk_level: "medium",
    lead_auditor: "Priya Sharma",
    departments: ["Finance", "Procurement"],
    start_date: addDays(7),
    end_date: addDays(9),
    objectives: [
      "Assess design and operating effectiveness of key financial controls.",
      "Evaluate procurement policy adherence and segregation of duties.",
    ],
    scope:
      "The engagement covers procure-to-pay, expense management, and financial reporting controls for Q3.",
    milestones: [
      { name: "Planning & Risk Assessment", start_date: addDays(7), end_date: addDays(7), status: "completed" },
      { name: "Fieldwork", start_date: addDays(8), end_date: addDays(8), status: "in_progress" },
      { name: "Reporting", start_date: addDays(9), end_date: addDays(9), status: "scheduled" },
    ],
    tasks: [
      { name: "Review purchase order approvals", owner: "Priya Sharma", due_date: addDays(8), status: "in_progress" },
      { name: "Sample test expense claims", owner: "Jordan Blake", due_date: addDays(9), status: "not_started" },
      { name: "Prepare draft findings", owner: "Alex Rivera", due_date: addDays(10), status: "not_started" },
    ],
    resources: [
      { role: "Lead Auditor", name: "Priya Sharma", allocated_hours: 20 },
      { role: "Senior Auditor", name: "Jordan Blake", allocated_hours: 18 },
    ],
    notes: "Coordinate with finance leadership for walkthroughs and ensure remediation owners are identified early.",
    progress: 62,
    compliance_frameworks: ["COSO", "SOX"],
  },
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
}

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
}

export default function AuditPlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [state, setState] = useState<PlanState>({ loading: true, data: null, error: null })

  const parsedId = Number(params?.id)
  const auditId = Number.isNaN(parsedId) ? null : parsedId

  useEffect(() => {
    if (auditId === null) {
      setState({ loading: false, data: null, error: "Audit plan could not be found." })
      return () => {}
    }
    let isMounted = true
    const fetchPlan = async () => {
      try {
        const response = await api<AuditPlanDetail>(`/api/audits/${auditId}/plan`)
        if (isMounted) {
          setState({ loading: false, data: response, error: null })
        }
      } catch (error) {
        const fallback = FALLBACK_PLANS[auditId] ?? null
        if (isMounted) {
          setState({
            loading: false,
            data: fallback,
            error: fallback
              ? "Unable to load live audit plan. Displaying intelligent fallback data."
              : "Audit plan could not be found.",
          })
        }
      }
    }
    fetchPlan()
    return () => {
      isMounted = false
    }
  }, [auditId])

  const plan = state.data

  const milestoneProgress = useMemo(() => {
    if (!plan) return 0
    if (plan.milestones.length === 0) return 0
    const completed = plan.milestones.filter((item) => item.status === "completed").length
    const inProgress = plan.milestones.filter((item) => item.status === "in_progress").length
    return Math.round(((completed + inProgress * 0.5) / plan.milestones.length) * 100)
  }, [plan])

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" size="sm" className="-ml-3" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {plan && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_COLOR[plan.status]}>{STATUS_LABELS[plan.status]}</Badge>
                  <Badge className={RISK_COLOR[plan.risk_level]}>{plan.risk_level.toUpperCase()} RISK</Badge>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">{plan?.title ?? "Audit Plan"}</h1>
            <p className="text-sm text-gray-500">Detailed execution plan, milestones, and resource allocations for this audit.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/audits")}>Return to Dashboard</Button>
            <Button className="bg-primary text-white hover:bg-primary/90">Export Plan</Button>
          </div>
        </div>

        {state.loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : plan ? (
          <div className="space-y-6">
            {state.error && (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="flex items-center gap-3 py-4 text-sm text-amber-800">
                  <AlertTriangle className="h-5 w-5" /> {state.error}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CalendarDays className="h-5 w-5 text-primary" /> Schedule Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-600">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-base font-semibold text-gray-800">
                          {parseDateOnly(plan.start_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="text-base font-semibold text-gray-800">
                          {parseDateOnly(plan.end_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Lead Auditor</p>
                        <p className="text-base font-semibold text-gray-800">{plan.lead_auditor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Departments</p>
                        <p className="text-base font-semibold text-gray-800">{plan.departments.join(", ")}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Objectives</p>
                      <ul className="mt-2 space-y-2">
                        {plan.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Scope</p>
                      <p className="mt-2 leading-relaxed text-gray-600">{plan.scope}</p>
                    </div>
                    {plan.compliance_frameworks && plan.compliance_frameworks.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">Frameworks</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {plan.compliance_frameworks.map((framework) => (
                            <Badge key={framework} variant="secondary" className="bg-slate-100 text-slate-700">
                              {framework}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="h-5 w-5 text-primary" /> Milestones & Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-600">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Overall Progress</span>
                        <span>{plan.progress}% complete</span>
                      </div>
                      <Progress value={plan.progress} />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                        <span>Milestone Completion</span>
                        <span>{milestoneProgress}%</span>
                      </div>
                      <Progress value={milestoneProgress} className="bg-slate-100" />
                    </div>
                    <div className="space-y-3">
                      {plan.milestones.map((milestone, index) => (
                        <div key={index} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-gray-800">{milestone.name}</p>
                            <Badge className={STATUS_COLOR[milestone.status]}>{STATUS_LABELS[milestone.status]}</Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {parseDateOnly(milestone.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              {" – "}
                              {parseDateOnly(milestone.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-primary" /> Audit Team & Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-600">
                    <div className="space-y-3">
                      {plan.resources.map((resource, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                          <div>
                            <p className="font-semibold text-gray-800">{resource.name}</p>
                            <p className="text-xs uppercase tracking-wide text-gray-500">{resource.role}</p>
                          </div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {resource.allocated_hours} hrs
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Key Notes</p>
                      <p className="mt-2 leading-relaxed text-gray-600">{plan.notes}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClipboardList className="h-5 w-5 text-primary" /> Priority Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-gray-600">
                    {plan.tasks.map((task, index) => (
                      <div key={index} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-800">{task.name}</p>
                          <Badge className={TASK_STATUS_COLOR[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Owner:</span> {task.owner}
                          <span className="mx-2">•</span>
                          <span>
                            Due {parseDateOnly(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-sm text-gray-500">
              The requested audit plan is not available.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
