"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mail,
  Plus,
  Sparkles,
  Users,
} from "lucide-react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import {
  AuditBasicInfoAIResponse,
  AuditChecklistAIResponse,
  AuditChecklistSection,
  AuditEmailTemplates,
  AuditNotificationAIResponse,
  AuditNotificationSettings,
  AuditRecord,
  AuditResourceAllocation,
  AuditReviewAIResponse,
  AuditSchedulingAIResponse,
  AuditTimelineEntry,
  AuditType,
  RiskLevel,
  AuditQuestionType,
  DepartmentOption,
  AuditWizardOptions,
  UserOption,
} from "@/types/audits"

interface WizardQuestion {
  id: string
  questionText: string
  questionType: AuditQuestionType
  evidenceRequired: boolean
  scoringWeight: number
  riskImpact: RiskLevel
  guidanceNotes?: string
}

interface WizardSection {
  id: string
  title: string
  description: string
  weight: number
  required: boolean
  questions: WizardQuestion[]
}

const AUDIT_TYPE_OPTIONS: { label: string; value: AuditType }[] = [
  { label: "Internal Audit", value: "internal_audit" },
  { label: "Compliance Audit", value: "compliance_audit" },
  { label: "Quality Management System Audit", value: "quality_audit" },
  { label: "Financial Audit", value: "financial_audit" },
  { label: "IT/Security Audit", value: "it_security_audit" },
  { label: "Operational Audit", value: "operational_audit" },
  { label: "Environmental Audit", value: "environmental_audit" },
  { label: "Health & Safety Audit", value: "health_safety_audit" },
  { label: "Risk Assessment Audit", value: "risk_assessment_audit" },
  { label: "Custom Template", value: "custom_template" },
]

const RISK_OPTIONS: { label: string; value: RiskLevel }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
]

const QUESTION_TYPES: { label: string; value: AuditQuestionType }[] = [
  { label: "Yes / No", value: "yes_no" },
  { label: "Multiple Choice", value: "multiple_choice" },
  { label: "Text Response", value: "text" },
  { label: "Rating", value: "rating" },
  { label: "Evidence Upload", value: "evidence" },
]

const DEFAULT_TIMELINE: AuditTimelineEntry[] = [
  { phase: "Planning", start_date: "", end_date: "", completion: 25 },
  { phase: "Fieldwork", start_date: "", end_date: "", completion: 10 },
  { phase: "Reporting", start_date: "", end_date: "", completion: 0 },
]

const FALLBACK_DEPARTMENTS: DepartmentOption[] = [
  { id: 1, name: "Information Security" },
  { id: 2, name: "Finance" },
  { id: 3, name: "Operations" },
  { id: 4, name: "Quality" },
]

const STEPS = [
  { id: 1, title: "Basic Information", description: "Define audit scope, objectives, and risk" },
  { id: 2, title: "Scheduling & Resources", description: "Plan timeline and assign the audit team" },
  { id: 3, title: "Audit Checklist", description: "Build sections and intelligent questions" },
  { id: 4, title: "Communication", description: "Configure notifications and messaging" },
  { id: 5, title: "Review & Confirmation", description: "Validate with AI and launch" },
]

const COMPLIANCE_LIBRARY = [
  "ISO 27001",
  "ISO 9001",
  "SOC 2",
  "SOX",
  "GDPR",
  "HIPAA",
  "NIST CSF",
  "ISO 14001",
  "OSHA",
]

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function createSection(seed?: Partial<WizardSection>): WizardSection {
  return {
    id: generateId(),
    title: seed?.title ?? "New Section",
    description: seed?.description ?? "",
    weight: seed?.weight ?? 25,
    required: seed?.required ?? true,
    questions: seed?.questions ?? [],
  }
}

function createQuestion(seed?: Partial<WizardQuestion>): WizardQuestion {
  return {
    id: generateId(),
    questionText: seed?.questionText ?? "",
    questionType: seed?.questionType ?? "text",
    evidenceRequired: seed?.evidenceRequired ?? false,
    scoringWeight: seed?.scoringWeight ?? 5,
    riskImpact: seed?.riskImpact ?? "medium",
    guidanceNotes: seed?.guidanceNotes ?? "",
  }
}

function formatUserName(user?: UserOption | null): string {
  if (!user) return ""
  const first = (user.first_name ?? "").trim()
  const last = (user.last_name ?? "").trim()
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last
  const fallback = (user.username ?? user.email ?? "").split("@")[0]?.trim()
  return fallback && fallback.length > 0 ? fallback : `User ${user.id}`
}

function AuditCreationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])
  const [submissionState, setSubmissionState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [userOptions, setUserOptions] = useState<UserOption[]>([])

  const [basicInfo, setBasicInfo] = useState({
    title: "",
    auditType: "internal_audit" as AuditType,
    departments: [] as number[],
    scope: "",
    objective: "",
    complianceFrameworks: [] as string[],
    riskLevel: "medium" as RiskLevel,
  })

  const [scheduling, setScheduling] = useState({
    startDate: "",
    endDate: "",
    estimatedDuration: 0,
    leadAuditorId: "",
    auditTeamIds: [] as number[],
    externalAuditors: "",
    auditeeContacts: [] as number[],
    meetingRoom: "",
    specialRequirements: "",
  })

  const [resourceAllocations, setResourceAllocations] = useState<AuditResourceAllocation[]>([])
  const [timeline, setTimeline] = useState<AuditTimelineEntry[]>(DEFAULT_TIMELINE)

  const [sections, setSections] = useState<WizardSection[]>([createSection({ title: "Governance" })])

  const [notifications, setNotifications] = useState({
    settings: {
      audit_announcement: true,
      daily_reminders: false,
      progress_updates: true,
      completion_notifications: true,
    } as AuditNotificationSettings,
    templates: {
      audit_announcement: "",
      daily_reminder: "",
      completion_notice: "",
    } as AuditEmailTemplates,
    distributionList: [] as number[],
    ccList: [] as string[],
    bccList: [] as string[],
  })

  const [basicInfoAI, setBasicInfoAI] = useState<AuditBasicInfoAIResponse | null>(null)
  const [schedulingAI, setSchedulingAI] = useState<AuditSchedulingAIResponse | null>(null)
  const [checklistAI, setChecklistAI] = useState<AuditChecklistAIResponse | null>(null)
  const [notificationAI, setNotificationAI] = useState<AuditNotificationAIResponse | null>(null)
  const [reviewAI, setReviewAI] = useState<AuditReviewAIResponse | null>(null)

  const [aiLoading, setAiLoading] = useState({
    basic: false,
    scheduling: false,
    checklist: false,
    notifications: false,
    review: false,
  })

  useEffect(() => {
    const template = searchParams.get("template")
    if (template) {
      const matching = AUDIT_TYPE_OPTIONS.find((item) => item.label.toLowerCase().includes(template.toLowerCase()))
      if (matching) {
        setBasicInfo((prev) => ({ ...prev, auditType: matching.value }))
      }
    }
  }, [searchParams])

  useEffect(() => {
    let active = true

    const loadOptions = async () => {
      try {
        const response = await api<AuditWizardOptions>("/api/audits/options")
        if (!active) return

        if (response?.departments?.length) {
          setDepartmentOptions(response.departments)
        } else {
          setDepartmentOptions(FALLBACK_DEPARTMENTS)
        }

        const sanitizedUsers: UserOption[] = (response?.users ?? [])
          .filter((user): user is UserOption => user != null && typeof user.id === "number")
          .map((user) => {
            const firstName = (user.first_name ?? "").trim()
            const lastName = (user.last_name ?? "").trim()

            if (firstName || lastName) {
              return { ...user, first_name: firstName, last_name: lastName }
            }

            const fallbackName = formatUserName(user)
            return { ...user, first_name: fallbackName, last_name: "" }
          })

        setUserOptions(sanitizedUsers)
      } catch (error) {
        if (!active) return
        console.error("Failed to load audit creation options", error)
        setDepartmentOptions(FALLBACK_DEPARTMENTS)
        setUserOptions([])
      }
    }

    loadOptions()

    return () => {
      active = false
    }
  }, [])

  const selectedDepartments = useMemo(
    () => departmentOptions.filter((option) => basicInfo.departments.includes(option.id)).map((option) => option.name),
    [departmentOptions, basicInfo.departments],
  )

  const selectedAuditTeamMembers = useMemo(
    () => userOptions.filter((option) => scheduling.auditTeamIds.includes(option.id)),
    [userOptions, scheduling.auditTeamIds],
  )

  const selectedAuditeeContacts = useMemo(
    () => userOptions.filter((option) => scheduling.auditeeContacts.includes(option.id)),
    [userOptions, scheduling.auditeeContacts],
  )

  const distributionListMembers = useMemo(
    () => userOptions.filter((option) => notifications.distributionList.includes(option.id)),
    [userOptions, notifications.distributionList],
  )

  useEffect(() => {
    if (!basicInfo.auditType || basicInfo.departments.length === 0 || departmentOptions.length === 0) {
      return
    }
    const controller = new AbortController()
    const loadBasicInfoAI = async () => {
      setAiLoading((prev) => ({ ...prev, basic: true }))
      try {
        const response = await api<AuditBasicInfoAIResponse>("/api/audits/ai/basic-info", {
          method: "POST",
          body: JSON.stringify({
            audit_type: basicInfo.auditType,
            departments: selectedDepartments,
            scope: basicInfo.scope || undefined,
          }),
          signal: controller.signal,
        })
        setBasicInfoAI(response)
        setBasicInfo((prev) => ({
          ...prev,
          scope: prev.scope || response.suggested_scope,
          objective: prev.objective || response.suggested_objective,
          complianceFrameworks:
            prev.complianceFrameworks.length > 0 ? prev.complianceFrameworks : response.suggested_compliance_frameworks,
          riskLevel: response.predicted_risk_level,
        }))
      } catch (error) {
        // ignore
      } finally {
        setAiLoading((prev) => ({ ...prev, basic: false }))
      }
    }
    loadBasicInfoAI()
    return () => controller.abort()
  }, [basicInfo.auditType, basicInfo.departments, departmentOptions, selectedDepartments, basicInfo.scope])

  useEffect(() => {
    setNotifications((prev) => {
      const combined = Array.from(new Set([...scheduling.auditTeamIds, ...scheduling.auditeeContacts]))
      const isSameLength = combined.length === prev.distributionList.length
      const hasSameMembers = isSameLength && combined.every((id) => prev.distributionList.includes(id))
      if (hasSameMembers) {
        return prev
      }
      return { ...prev, distributionList: combined }
    })
  }, [scheduling.auditTeamIds, scheduling.auditeeContacts])

  useEffect(() => {
    if (!scheduling.startDate && !scheduling.endDate) {
      return
    }
    setTimeline((prev) =>
      prev.map((entry, index, arr) => {
        const updated: AuditTimelineEntry = { ...entry }
        if (scheduling.startDate) {
          if (index === 0 || !updated.start_date) {
            updated.start_date = scheduling.startDate
          }
        }
        if (scheduling.endDate) {
          if (index === arr.length - 1 || !updated.end_date) {
            updated.end_date = scheduling.endDate
          }
        }
        return updated
      }),
    )
  }, [scheduling.startDate, scheduling.endDate])

  const handleSchedulingAI = async () => {
    if (!scheduling.startDate || !scheduling.endDate || !scheduling.leadAuditorId) {
      return
    }
    setAiLoading((prev) => ({ ...prev, scheduling: true }))
    try {
      const response = await api<AuditSchedulingAIResponse>("/api/audits/ai/scheduling", {
        method: "POST",
        body: JSON.stringify({
          audit_type: basicInfo.auditType,
          risk_level: basicInfo.riskLevel,
          start_date: scheduling.startDate,
          end_date: scheduling.endDate,
          lead_auditor_id: Number(scheduling.leadAuditorId),
          team_member_ids: scheduling.auditTeamIds,
          auditee_contact_ids: scheduling.auditeeContacts,
        }),
      })
      setSchedulingAI(response)
      setScheduling((prev) => ({
        ...prev,
        estimatedDuration: response.suggested_duration_hours,
        meetingRoom: response.recommended_meeting_room ?? prev.meetingRoom,
        auditTeamIds: Array.from(
          new Set([
            ...prev.auditTeamIds,
            ...response.recommended_team.filter((id) => id !== Number(prev.leadAuditorId)),
          ]),
        ),
      }))
      setResourceAllocations(response.allocation_plan)
    } catch (error) {
      // ignore
    } finally {
      setAiLoading((prev) => ({ ...prev, scheduling: false }))
    }
  }

  const handleChecklistAI = async () => {
    setAiLoading((prev) => ({ ...prev, checklist: true }))
    try {
      const response = await api<AuditChecklistAIResponse>("/api/audits/ai/checklist", {
        method: "POST",
        body: JSON.stringify({
          audit_type: basicInfo.auditType,
          compliance_frameworks: basicInfo.complianceFrameworks,
          risk_level: basicInfo.riskLevel,
        }),
      })
      setChecklistAI(response)
      setSections((prev) => {
        const generated = response.sections.map((section) =>
          createSection({
            title: section.title,
            description: section.description ?? "",
            weight: section.weight,
            required: section.is_required,
            questions: section.questions.map((question) =>
              createQuestion({
                questionText: question.question_text,
                questionType: question.question_type,
                evidenceRequired: question.evidence_required,
                scoringWeight: question.scoring_weight,
                riskImpact: question.risk_impact,
                guidanceNotes: question.guidance_notes,
              }),
            ),
          }),
        )
        return [...prev, ...generated]
      })
    } catch (error) {
      // ignore
    } finally {
      setAiLoading((prev) => ({ ...prev, checklist: false }))
    }
  }

  const handleNotificationAI = async () => {
    if (!scheduling.startDate || !scheduling.endDate) {
      return
    }
    setAiLoading((prev) => ({ ...prev, notifications: true }))
    try {
      const response = await api<AuditNotificationAIResponse>("/api/audits/ai/notifications", {
        method: "POST",
        body: JSON.stringify({
          audit_type: basicInfo.auditType,
          start_date: scheduling.startDate,
          end_date: scheduling.endDate,
          recipients: notifications.distributionList,
        }),
      })
      setNotificationAI(response)
      setNotifications({
        settings: response.notification_settings,
        templates: response.email_templates,
        distributionList: response.distribution_list_ids,
        ccList: response.cc_list,
        bccList: response.bcc_list,
      })
    } catch (error) {
      // ignore
    } finally {
      setAiLoading((prev) => ({ ...prev, notifications: false }))
    }
  }

  useEffect(() => {
    if (currentStep !== 5) {
      return
    }
    if (!basicInfo.title || !scheduling.startDate || !scheduling.endDate || !scheduling.leadAuditorId) {
      return
    }
    const runReview = async () => {
      setAiLoading((prev) => ({ ...prev, review: true }))
      try {
        const payload = buildPayload()
        const response = await api<AuditReviewAIResponse>("/api/audits/ai/review", {
          method: "POST",
          body: JSON.stringify({ audit: payload }),
        })
        setReviewAI(response)
      } catch (error) {
        // ignore
      } finally {
        setAiLoading((prev) => ({ ...prev, review: false }))
      }
    }
    runReview()
  }, [currentStep])

  const toggleDepartment = (id: number) => {
    setBasicInfo((prev) => ({
      ...prev,
      departments: prev.departments.includes(id)
        ? prev.departments.filter((deptId) => deptId !== id)
        : [...prev.departments, id],
    }))
  }

  const toggleTeamMember = (id: number) => {
    setScheduling((prev) => ({
      ...prev,
      auditTeamIds: prev.auditTeamIds.includes(id)
        ? prev.auditTeamIds.filter((memberId) => memberId !== id)
        : [...prev.auditTeamIds, id],
    }))
  }

  const toggleAuditeeContact = (id: number) => {
    setScheduling((prev) => ({
      ...prev,
      auditeeContacts: prev.auditeeContacts.includes(id)
        ? prev.auditeeContacts.filter((contactId) => contactId !== id)
        : [...prev.auditeeContacts, id],
    }))
  }

  const openNativeDatePicker = (event: ReactMouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const picker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker

    if (typeof picker !== "function") {
      return
    }

    const nativeEvent = event.nativeEvent
    const isPointerEvent =
      typeof PointerEvent !== "undefined" && nativeEvent instanceof PointerEvent && nativeEvent.isTrusted

    if (!isPointerEvent) {
      return
    }

    try {
      picker.call(input)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Unable to open native date picker", error)
      }
    }
  }

  const addCcEmail = (email: string) => {
    if (!email) return
    setNotifications((prev) => ({ ...prev, ccList: [...prev.ccList, email] }))
  }

  const addBccEmail = (email: string) => {
    if (!email) return
    setNotifications((prev) => ({ ...prev, bccList: [...prev.bccList, email] }))
  }

  const removeCcEmail = (email: string) => {
    setNotifications((prev) => ({ ...prev, ccList: prev.ccList.filter((item) => item !== email) }))
  }

  const removeBccEmail = (email: string) => {
    setNotifications((prev) => ({ ...prev, bccList: prev.bccList.filter((item) => item !== email) }))
  }

  const addSection = () => setSections((prev) => [...prev, createSection()])

  const updateSection = (sectionId: string, updates: Partial<WizardSection>) => {
    setSections((prev) => prev.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)))
  }

  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId))
  }

  const addQuestion = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, createQuestion()] }
          : section,
      ),
    )
  }

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<WizardQuestion>) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId ? { ...question, ...updates } : question,
              ),
            }
          : section,
      ),
    )
  }

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter((question) => question.id !== questionId),
            }
          : section,
      ),
    )
  }

  const buildPayload = (): AuditRecord => {
    const sectionPayloads = sections.map((section, index) => ({
      title: section.title,
      description: section.description,
      weight: section.weight,
      is_required: section.required,
      order_index: index,
      questions: section.questions.map((question, qIndex) => ({
        question_text: question.questionText,
        question_type: question.questionType,
        evidence_required: question.evidenceRequired,
        scoring_weight: question.scoringWeight,
        risk_impact: question.riskImpact,
        guidance_notes: question.guidanceNotes,
        order_index: qIndex,
      })),
    })) as unknown as AuditChecklistSection[]

    const leadAuditor = userOptions.find((user) => user.id === Number(scheduling.leadAuditorId))

    const payload: AuditRecord = {
      id: 0,
      title: basicInfo.title,
      audit_type: basicInfo.auditType,
      risk_level: basicInfo.riskLevel,
      departments: basicInfo.departments,
      department_names: selectedDepartments,
      scope: basicInfo.scope,
      objective: basicInfo.objective,
      compliance_frameworks: basicInfo.complianceFrameworks,
      planned_start_date: scheduling.startDate,
      planned_end_date: scheduling.endDate,
      estimated_duration_hours: scheduling.estimatedDuration,
      lead_auditor_id: Number(scheduling.leadAuditorId),
      audit_team_ids: scheduling.auditTeamIds,
      external_auditors: scheduling.externalAuditors || undefined,
      auditee_contact_ids: scheduling.auditeeContacts,
      meeting_room: scheduling.meetingRoom || undefined,
      special_requirements: scheduling.specialRequirements || undefined,
      notification_settings: notifications.settings,
      email_templates: notifications.templates,
      distribution_list_ids: notifications.distributionList,
      cc_list: notifications.ccList,
      bcc_list: notifications.bccList,
      launch_option: "launch_immediately",
      resource_allocation: resourceAllocations,
      timeline: timeline.map((entry) => ({
        ...entry,
        start_date: entry.start_date || scheduling.startDate,
        end_date: entry.end_date || scheduling.endDate,
      })),
      sections: sectionPayloads,
      status: "draft",
      progress: 0,
      lead_auditor_name: (() => {
        const name = formatUserName(leadAuditor)
        return name ? name : undefined
      })(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return payload
  }

  const handleSubmit = async () => {
    setSubmissionState("submitting")
    setSubmissionError(null)
    try {
      const payload = buildPayload()
      await api<AuditRecord>("/api/audits", {
        method: "POST",
        body: JSON.stringify({
          title: payload.title,
          audit_type: payload.audit_type,
          risk_level: payload.risk_level,
          departments: payload.departments,
          scope: payload.scope,
          objective: payload.objective,
          compliance_frameworks: payload.compliance_frameworks,
          planned_start_date: payload.planned_start_date,
          planned_end_date: payload.planned_end_date,
          estimated_duration_hours: payload.estimated_duration_hours,
          lead_auditor_id: payload.lead_auditor_id,
          audit_team_ids: payload.audit_team_ids,
          external_auditors: payload.external_auditors,
          auditee_contact_ids: payload.auditee_contact_ids,
          meeting_room: payload.meeting_room,
          special_requirements: payload.special_requirements,
          notification_settings: payload.notification_settings,
          email_templates: payload.email_templates,
          distribution_list_ids: payload.distribution_list_ids,
          cc_list: payload.cc_list,
          bcc_list: payload.bcc_list,
          launch_option: payload.launch_option,
          resource_allocation: payload.resource_allocation,
          timeline: payload.timeline,
          sections: payload.sections.map((section) => ({
            title: section.title,
            description: section.description,
            weight: section.weight,
            is_required: section.is_required,
            order_index: section.order_index,
            questions: section.questions.map((question) => ({
              question_text: question.question_text,
              question_type: question.question_type,
              evidence_required: question.evidence_required,
              scoring_weight: question.scoring_weight,
              risk_impact: question.risk_impact,
              guidance_notes: question.guidance_notes,
              order_index: question.order_index,
            })),
          })),
        }),
      })
      setSubmissionState("success")
      setTimeout(() => router.push("/audits"), 1200)
    } catch (error: any) {
      setSubmissionError(error?.message ?? "Unable to create audit. Please try again.")
      setSubmissionState("error")
    }
  }

  const canProceedToNext = () => {
    if (currentStep === 1) {
      return (
        basicInfo.title.trim().length > 0 &&
        basicInfo.scope.trim().length > 0 &&
        basicInfo.objective.trim().length > 0 &&
        basicInfo.departments.length > 0
      )
    }
    if (currentStep === 2) {
      return (
        scheduling.startDate !== "" &&
        scheduling.endDate !== "" &&
        scheduling.leadAuditorId !== "" &&
        scheduling.auditeeContacts.length > 0
      )
    }
    if (currentStep === 3) {
      return sections.length > 0 && sections.every((section) => section.questions.length > 0)
    }
    if (currentStep === 4) {
      return notifications.distributionList.length > 0
    }
    return true
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create Audit</h1>
            <p className="text-sm text-gray-500">
              Intelligent five-step wizard to assemble a comprehensive audit plan with AI guidance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={(currentStep / STEPS.length) * 100} className="w-40" />
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`rounded-lg border p-4 text-sm ${
                step.id === currentStep
                  ? "border-primary bg-primary/5 text-primary"
                  : step.id < currentStep
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-500"
              }`}
            >
              <p className="font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" /> Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audit Title *</Label>
                  <Input
                    value={basicInfo.title}
                    onChange={(event) => setBasicInfo((prev) => ({ ...prev, title: event.target.value }))}
                    maxLength={200}
                    placeholder="e.g. ISO 27001 Surveillance Audit"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Audit Type *</Label>
                  <Select
                    value={basicInfo.auditType}
                    onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, auditType: value as AuditType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audit type" />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Departments *</Label>
                  <div className="grid max-h-36 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                    {departmentOptions.map((department) => (
                      <label key={department.id} className="flex items-center justify-between text-sm">
                        <span>{department.name}</span>
                        <Switch
                          checked={basicInfo.departments.includes(department.id)}
                          onCheckedChange={() => toggleDepartment(department.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Risk Level</Label>
                  <Select
                    value={basicInfo.riskLevel}
                    onValueChange={(value) => setBasicInfo((prev) => ({ ...prev, riskLevel: value as RiskLevel }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {basicInfoAI && (
                    <p className="text-xs text-emerald-600">
                      AI predicted risk level: {basicInfoAI.predicted_risk_level.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audit Scope *</Label>
                  <Textarea
                    value={basicInfo.scope}
                    onChange={(event) => setBasicInfo((prev) => ({ ...prev, scope: event.target.value }))}
                    maxLength={1000}
                    rows={5}
                    placeholder="Outline the processes, sites, or controls that fall within the scope of this audit."
                  />
                  {basicInfoAI && (
                    <p className="text-xs text-gray-500">Suggested scope: {basicInfoAI.suggested_scope}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Audit Objective *</Label>
                  <Textarea
                    value={basicInfo.objective}
                    onChange={(event) => setBasicInfo((prev) => ({ ...prev, objective: event.target.value }))}
                    maxLength={1000}
                    rows={5}
                    placeholder="Detail the purpose of this audit and the expected outcomes."
                  />
                  {basicInfoAI && (
                    <p className="text-xs text-gray-500">AI objective suggestion: {basicInfoAI.suggested_objective}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Compliance Frameworks</Label>
                <div className="flex flex-wrap gap-2">
                  {COMPLIANCE_LIBRARY.map((framework) => {
                    const selected = basicInfo.complianceFrameworks.includes(framework)
                    return (
                      <Badge
                        key={framework}
                        variant={selected ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() =>
                          setBasicInfo((prev) => ({
                            ...prev,
                            complianceFrameworks: selected
                              ? prev.complianceFrameworks.filter((item) => item !== framework)
                              : [...prev.complianceFrameworks, framework],
                          }))
                        }
                      >
                        {framework}
                      </Badge>
                    )
                  })}
                </div>
                {basicInfoAI && basicInfoAI.suggested_compliance_frameworks.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Suggested frameworks: {basicInfoAI.suggested_compliance_frameworks.join(", ")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" /> Scheduling & Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Planned Start Date *</Label>
                  <Input
                    type="date"
                    min={today}
                    value={scheduling.startDate}
                    onClick={openNativeDatePicker}
                    onChange={(event) => {
                      const value = event.target.value
                      setScheduling((prev) => {
                        const adjustedEndDate =
                          prev.endDate && prev.endDate < value ? value : prev.endDate

                        setTimeline((prevTimeline) =>
                          prevTimeline.map((entry, index) => {
                            if (index === 0) {
                              return { ...entry, start_date: value }
                            }

                            if (index === prevTimeline.length - 1 && adjustedEndDate) {
                              return { ...entry, end_date: adjustedEndDate }
                            }

                            return entry
                          }),
                        )

                        return {
                          ...prev,
                          startDate: value,
                          endDate: adjustedEndDate,
                        }
                      })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Planned End Date *</Label>
                  <Input
                    type="date"
                    min={scheduling.startDate || today}
                    value={scheduling.endDate}
                    onClick={openNativeDatePicker}
                    onChange={(event) => {
                      const value = event.target.value
                      setScheduling((prev) => {
                        const minimumEndDate = prev.startDate || today
                        const adjustedValue = value < minimumEndDate ? minimumEndDate : value

                        setTimeline((prevTimeline) =>
                          prevTimeline.map((entry, index) =>
                            index === prevTimeline.length - 1
                              ? { ...entry, end_date: adjustedValue }
                              : entry,
                          ),
                        )

                        return { ...prev, endDate: adjustedValue }
                      })
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lead Auditor *</Label>
                  <Select
                    value={scheduling.leadAuditorId}
                    onValueChange={(value) => setScheduling((prev) => ({ ...prev, leadAuditorId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {userOptions.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {formatUserName(user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estimated Duration (Hours)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={scheduling.estimatedDuration || ""}
                    onChange={(event) =>
                      setScheduling((prev) => ({
                        ...prev,
                        estimatedDuration: Number(event.target.value ?? 0),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audit Team</Label>
                  <div className="grid max-h-32 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 text-sm">
                    {userOptions.map((user) => (
                      <label key={user.id} className="flex items-center justify-between">
                        <span>{formatUserName(user)}</span>
                        <Switch
                          checked={scheduling.auditTeamIds.includes(user.id)}
                          onCheckedChange={() => toggleTeamMember(user.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Auditee Contacts *</Label>
                  <div className="grid max-h-32 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 text-sm">
                    {userOptions.map((user) => (
                      <label key={user.id} className="flex items-center justify-between">
                        <span>{formatUserName(user)}</span>
                        <Switch
                          checked={scheduling.auditeeContacts.includes(user.id)}
                          onCheckedChange={() => toggleAuditeeContact(user.id)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Selected Audit Team</Label>
                  {selectedAuditTeamMembers.length === 0 ? (
                    <p className="text-sm text-gray-500">No team members selected yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedAuditTeamMembers.map((member) => (
                        <Badge key={member.id} variant="secondary">
                          {formatUserName(member)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Selected Auditee Contacts</Label>
                  {selectedAuditeeContacts.length === 0 ? (
                    <p className="text-sm text-gray-500">No auditee contacts selected yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedAuditeeContacts.map((contact) => (
                        <Badge key={contact.id} variant="outline">
                          {formatUserName(contact)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>External Auditors</Label>
                  <Input
                    value={scheduling.externalAuditors}
                    onChange={(event) => setScheduling((prev) => ({ ...prev, externalAuditors: event.target.value }))}
                    placeholder="Name(s) of external auditors"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meeting Room</Label>
                  <Input
                    value={scheduling.meetingRoom}
                    onChange={(event) => setScheduling((prev) => ({ ...prev, meetingRoom: event.target.value }))}
                    placeholder="e.g. Collaboration Hub"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Special Requirements</Label>
                <Textarea
                  value={scheduling.specialRequirements}
                  onChange={(event) => setScheduling((prev) => ({ ...prev, specialRequirements: event.target.value }))}
                  rows={3}
                  placeholder="List facility access, equipment, or travel requirements."
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={handleSchedulingAI} disabled={aiLoading.scheduling}>
                  {aiLoading.scheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} AI Schedule Suggestion
                </Button>
                {schedulingAI && (
                  <p className="text-sm text-emerald-600">
                    Suggested duration {schedulingAI.suggested_duration_hours} hours • {schedulingAI.recommended_meeting_room}
                  </p>
                )}
              </div>

              {resourceAllocations.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">
                    Resource Allocation Plan
                  </div>
                  <div className="divide-y divide-gray-100 text-sm">
                    {resourceAllocations.map((allocation) => (
                      <div key={allocation.user_id} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <p className="font-medium text-gray-700">{allocation.user_name}</p>
                          <p className="text-xs text-gray-500">{allocation.role}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary">{allocation.allocated_hours} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" /> Audit Checklist Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={addSection}>
                  <Plus className="mr-2 h-4 w-4" /> Add Section
                </Button>
                <Button type="button" variant="secondary" onClick={handleChecklistAI} disabled={aiLoading.checklist}>
                  {aiLoading.checklist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Checklist with AI
                </Button>
                {checklistAI && checklistAI.recommendations.length > 0 && (
                  <p className="text-sm text-emerald-600">AI recommends: {checklistAI.recommendations.join(" • ")}</p>
                )}
              </div>

              <div className="space-y-4">
                {sections.map((section) => (
                  <div key={section.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Section Title</Label>
                            <Input
                              value={section.title}
                              onChange={(event) => updateSection(section.id, { title: event.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Weight</Label>
                            <Input
                              type="number"
                              value={section.weight}
                              onChange={(event) => updateSection(section.id, { weight: Number(event.target.value ?? 0) })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={section.description}
                            onChange={(event) => updateSection(section.id, { description: event.target.value })}
                            rows={3}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <Switch
                            checked={section.required}
                            onCheckedChange={(checked) => updateSection(section.id, { required: checked })}
                          />
                          Required Section
                        </label>
                      </div>
                      <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeSection(section.id)}>
                        Remove
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {section.questions.map((question) => (
                        <div key={question.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Question Text</Label>
                              <Textarea
                                value={question.questionText}
                                onChange={(event) => updateQuestion(section.id, question.id, { questionText: event.target.value })}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Question Type</Label>
                              <Select
                                value={question.questionType}
                                onValueChange={(value) => updateQuestion(section.id, question.id, { questionType: value as AuditQuestionType })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {QUESTION_TYPES.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Scoring Weight</Label>
                              <Input
                                type="number"
                                value={question.scoringWeight}
                                onChange={(event) =>
                                  updateQuestion(section.id, question.id, { scoringWeight: Number(event.target.value ?? 0) })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Risk Impact</Label>
                              <Select
                                value={question.riskImpact}
                                onValueChange={(value) => updateQuestion(section.id, question.id, { riskImpact: value as RiskLevel })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {RISK_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Evidence Required</Label>
                              <div className="flex h-10 items-center rounded-md border border-gray-200 px-3">
                                <Switch
                                  checked={question.evidenceRequired}
                                  onCheckedChange={(checked) => updateQuestion(section.id, question.id, { evidenceRequired: checked })}
                                />
                                <span className="ml-3 text-sm text-gray-600">Yes</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Guidance Notes</Label>
                            <Textarea
                              value={question.guidanceNotes}
                              onChange={(event) => updateQuestion(section.id, question.id, { guidanceNotes: event.target.value })}
                              rows={2}
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => removeQuestion(section.id, question.id)}>
                              Remove Question
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addQuestion(section.id)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" /> Communication & Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700">Notification Settings</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {(
                    [
                      { key: "audit_announcement", label: "Audit Announcement" },
                      { key: "daily_reminders", label: "Daily Reminders" },
                      { key: "progress_updates", label: "Progress Updates" },
                      { key: "completion_notifications", label: "Completion Notifications" },
                    ] as { key: keyof AuditNotificationSettings; label: string }[]
                  ).map((setting) => (
                    <label key={setting.key} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                      <span>{setting.label}</span>
                      <Switch
                        checked={notifications.settings[setting.key]}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            settings: { ...prev.settings, [setting.key]: checked },
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Announcement Email</Label>
                  <Textarea
                    value={notifications.templates.audit_announcement}
                    onChange={(event) =>
                      setNotifications((prev) => ({
                        ...prev,
                        templates: { ...prev.templates, audit_announcement: event.target.value },
                      }))
                    }
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Reminder</Label>
                  <Textarea
                    value={notifications.templates.daily_reminder}
                    onChange={(event) =>
                      setNotifications((prev) => ({
                        ...prev,
                        templates: { ...prev.templates, daily_reminder: event.target.value },
                      }))
                    }
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Completion Notice</Label>
                  <Textarea
                    value={notifications.templates.completion_notice}
                    onChange={(event) =>
                      setNotifications((prev) => ({
                        ...prev,
                        templates: { ...prev.templates, completion_notice: event.target.value },
                      }))
                    }
                    rows={4}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Distribution List *</Label>
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                    {distributionListMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Select audit team members or auditee contacts to build the distribution list.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {distributionListMembers.map((member) => (
                          <Badge key={member.id} variant="secondary" className="bg-white text-gray-700">
                            {formatUserName(member)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Recipients are automatically synced from the selected audit team and auditee contacts.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>CC</Label>
                    <EmailListEditor emails={notifications.ccList} onAdd={addCcEmail} onRemove={removeCcEmail} />
                  </div>
                  <div className="space-y-2">
                    <Label>BCC</Label>
                    <EmailListEditor emails={notifications.bccList} onAdd={addBccEmail} onRemove={removeBccEmail} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={handleNotificationAI} disabled={aiLoading.notifications}>
                  {aiLoading.notifications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Communication Plan
                </Button>
                {notificationAI && notificationAI.timing_recommendations.length > 0 && (
                  <p className="text-sm text-emerald-600">
                    Timing tips: {notificationAI.timing_recommendations.join(" • ")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Review & Confirmation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <SummaryTile title="Audit Title" value={basicInfo.title} />
                <SummaryTile
                  title="Audit Type"
                  value={
                    AUDIT_TYPE_OPTIONS.find((option) => option.value === basicInfo.auditType)?.label ??
                    basicInfo.auditType
                  }
                />
                <SummaryTile title="Departments" value={selectedDepartments.join(", ")} />
                <SummaryTile
                  title="Schedule"
                  value={`${scheduling.startDate || ""} → ${scheduling.endDate || ""}`}
                />
                <SummaryTile
                  title="Audit Team"
                  value={selectedAuditTeamMembers.map((member) => formatUserName(member)).join(", ")}
                />
                <SummaryTile
                  title="Auditee Contacts"
                  value={selectedAuditeeContacts.map((contact) => formatUserName(contact)).join(", ")}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">Resource Allocation</div>
                <div className="divide-y divide-gray-100 text-sm">
                  {resourceAllocations.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">No resource allocation suggestions yet.</p>
                  ) : (
                    resourceAllocations.map((allocation) => (
                      <div key={allocation.user_id} className="flex items-center justify-between px-4 py-2">
                        <div>
                          <p className="font-medium text-gray-700">{allocation.user_name}</p>
                          <p className="text-xs text-gray-500">{allocation.role}</p>
                        </div>
                        <span className="text-sm font-semibold text-primary">{allocation.allocated_hours} hrs</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 p-3 text-sm font-semibold text-gray-700">Timeline</div>
                <div className="divide-y divide-gray-100 text-sm">
                  {timeline.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="font-medium text-gray-700">{entry.phase}</p>
                        <p className="text-xs text-gray-500">{entry.start_date || "TBD"} → {entry.end_date || "TBD"}</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">{entry.completion ?? 0}% ready</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold text-gray-700">AI Validation</Label>
                {aiLoading.review ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" /> Running automated review...
                  </div>
                ) : reviewAI ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      <p className="font-semibold">Validation</p>
                      <ul className="list-disc space-y-1 pl-4">
                        {reviewAI.validation_messages.map((message, index) => (
                          <li key={index}>{message}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      <p className="font-semibold">Optimisation Opportunities</p>
                      <ul className="list-disc space-y-1 pl-4">
                        {reviewAI.optimisation_opportunities.length > 0 ? (
                          reviewAI.optimisation_opportunities.map((message, index) => <li key={index}>{message}</li>)
                        ) : (
                          <li>No optimisation opportunities detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">AI review insights will appear when prerequisites are complete.</p>
                )}
              </div>

              {submissionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" /> {submissionError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={currentStep === 1 || submissionState === "submitting"}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <div className="flex items-center gap-3">
            {currentStep < STEPS.length && (
              <Button disabled={!canProceedToNext()} onClick={() => setCurrentStep((prev) => Math.min(STEPS.length, prev + 1))}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {currentStep === STEPS.length && (
              <Button onClick={handleSubmit} disabled={submissionState === "submitting"}>
                {submissionState === "submitting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Create Audit
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function AuditCreationPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex h-full flex-1 items-center justify-center p-6">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading audit creation wizard…</span>
          </div>
        </DashboardLayout>
      }
    >
      <AuditCreationContent />
    </Suspense>
  )
}

function SummaryTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-gray-700">{value || "—"}</p>
    </div>
  )
}

function EmailListEditor({ emails, onAdd, onRemove }: { emails: string[]; onAdd: (email: string) => void; onRemove: (email: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="email@example.com" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onAdd(value.trim())
            setValue("")
          }}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {emails.map((email) => (
          <Badge key={email} variant="secondary" className="flex items-center gap-2">
            {email}
            <button type="button" onClick={() => onRemove(email)} className="text-xs text-red-500">
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}
