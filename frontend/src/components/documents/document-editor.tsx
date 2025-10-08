"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Save,
  Download,
  FileText,
  Eye,
  Edit,
  AlertTriangle,
  Loader2,
  Sparkles,
  Wand2,
  ListOrdered,
  Copy,
  Users,
  Clock,
  History,
  Undo2
} from 'lucide-react'
import { DocumentViewer } from './document-viewer'

interface Document {
  id: number
  title: string
  description?: string
  document_type: string
  status: string
  access_level: string
  category?: string
  filename: string
  file_size: number
  version: string
  created_by_id: number
  created_at: string
  updated_at: string
  next_review_date?: string
  mime_type?: string
}

interface DocumentVersionInfo {
  id: number
  version: string
  filename: string
  file_size: number
  file_hash: string
  change_summary?: string | null
  created_by_id: number
  created_at: string
}

interface DocumentEditorProps {
  document: Document
  isOpen: boolean
  onClose: () => void
  onSave: (updatedDocument: Partial<Document>) => Promise<void>
  onDownload: () => void
  onRefresh?: () => void
}

export function DocumentEditor({
  document,
  isOpen,
  onClose,
  onSave,
  onDownload,
  onRefresh
}: DocumentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [editedDocument, setEditedDocument] = useState<Partial<Document>>({})
  const [error, setError] = useState<string | null>(null)
  const [aiContext, setAiContext] = useState('')
  const [aiCompletion, setAiCompletion] = useState<string | null>(null)
  const [aiCompletionTips, setAiCompletionTips] = useState<string[]>([])
  const [aiCompletionLoading, setAiCompletionLoading] = useState(false)
  const [aiGrammarLoading, setAiGrammarLoading] = useState(false)
  const [aiGrammarIssues, setAiGrammarIssues] = useState<{ issue: string; severity?: string; suggestion?: string }[]>([])
  const [aiGrammarSummary, setAiGrammarSummary] = useState<string | null>(null)
  const [templateSuggestions, setTemplateSuggestions] = useState<{ name: string; description?: string; when_to_use?: string }[]>([])
  const [templateNotes, setTemplateNotes] = useState<string[]>([])
  const [outlineInput, setOutlineInput] = useState('')
  const [numberingLoading, setNumberingLoading] = useState(false)
  const [numberedSections, setNumberedSections] = useState<{ number: string; heading: string }[]>([])
  const [numberingNotes, setNumberingNotes] = useState<string[]>([])
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [workflowAssignments, setWorkflowAssignments] = useState<{ recommended: { id: number; name: string; role?: string; expertise?: string[]; workload?: string }[]; backup: { id: number; name: string; role?: string }[] }>({ recommended: [], backup: [] })
  const [workflowProgress, setWorkflowProgress] = useState<{ next_step?: string; automation?: string[]; blockers?: string[] }>({})
  const [workflowTimeline, setWorkflowTimeline] = useState<{ estimated_completion?: string; phase_estimates?: { phase: string; days?: number }[]; risk_level?: string; confidence?: number; notes?: string[] }>({})
  const [copiedCompletion, setCopiedCompletion] = useState(false)
  const [content, setContent] = useState('')
  const [initialContent, setInitialContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [contentMessage, setContentMessage] = useState<string | null>(null)
  const [supportsContentEditing, setSupportsContentEditing] = useState(false)
  const [canEditContent, setCanEditContent] = useState(false)
  const [contentSaving, setContentSaving] = useState(false)
  const [contentChangeSummary, setContentChangeSummary] = useState('')
  const [viewerRefreshKey, setViewerRefreshKey] = useState(0)
  const [contentTab, setContentTab] = useState<'preview' | 'edit'>('preview')
  const [versions, setVersions] = useState<DocumentVersionInfo[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionsError, setVersionsError] = useState<string | null>(null)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '')

  const documentTypes = [
    { value: 'policy', label: 'Policy' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'form', label: 'Form' },
    { value: 'template', label: 'Template' },
    { value: 'report', label: 'Report' },
    { value: 'manual', label: 'Manual' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'regulation', label: 'Regulation' },
    { value: 'audit_report', label: 'Audit Report' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'incident_report', label: 'Incident Report' },
    { value: 'training_material', label: 'Training Material' },
    { value: 'other', label: 'Other' }
  ]

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
    { value: 'expired', label: 'Expired' }
  ]

  const accessLevels = [
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Internal' },
    { value: 'confidential', label: 'Confidential' },
    { value: 'restricted', label: 'Restricted' }
  ]

  useEffect(() => {
    if (isOpen && document) {
      setEditedDocument({
        title: document.title,
        description: document.description,
        document_type: document.document_type,
        status: document.status,
        access_level: document.access_level,
        category: document.category
      })
      setAiContext(document.description || '')
      setAiCompletion(null)
      setAiCompletionTips([])
      setAiGrammarIssues([])
      setAiGrammarSummary(null)
      setNumberedSections([])
      setNumberingNotes([])
      setContent('')
      setInitialContent('')
      setContentError(null)
      setContentMessage(null)
      setContentChangeSummary('')
      setContentTab('preview')
      setViewerRefreshKey(0)
      fetchTemplateSuggestions()
      fetchWorkflowInsights()
    }
  }, [isOpen, document])

  useEffect(() => {
    if (!isEditing) {
      setContentTab('preview')
    }
  }, [isEditing])

  const handleSave = async () => {
    if (!editedDocument || !document) return

    setSaving(true)
    setError(null)

    try {
      await onSave(editedDocument)
      setIsEditing(false)
      onRefresh?.()
    } catch (error) {
      console.error('Error saving document:', error)
      setError('Failed to save document changes')
    } finally {
      setSaving(false)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditedDocument(prev => ({ ...prev, [field]: value }))
  }

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  const fetchDocumentContent = useCallback(async () => {
    const token = getAuthToken()
    if (!token || !document || !API_BASE_URL) return

    setContentLoading(true)
    setContentError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to load document content')
      }

      const data = await response.json()
      setContent(data.content || '')
      setInitialContent(data.content || '')
      setSupportsContentEditing(Boolean(data.supports_editing))
      setCanEditContent(Boolean(data.can_edit))
      setContentMessage(data.message || null)
    } catch (err: any) {
      setContentError(err.message || 'Failed to load document content')
    } finally {
      setContentLoading(false)
    }
  }, [API_BASE_URL, document])

  const fetchDocumentVersions = useCallback(async () => {
    const token = getAuthToken()
    if (!token || !document || !API_BASE_URL) return

    setVersionsLoading(true)
    setVersionsError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to load document versions')
      }

      const data = await response.json()
      const versionList: DocumentVersionInfo[] = Array.isArray(data)
        ? data.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : []
      setVersions(versionList)
    } catch (err: any) {
      setVersionsError(err.message || 'Failed to load document versions')
      setVersions([])
    } finally {
      setVersionsLoading(false)
    }
  }, [API_BASE_URL, document])

  useEffect(() => {
    if (isOpen && document) {
      fetchDocumentContent()
      fetchDocumentVersions()
    }
  }, [isOpen, document?.id, fetchDocumentContent, fetchDocumentVersions])

  const handleContentSave = async () => {
    if (!document || !API_BASE_URL) return
    if (!supportsContentEditing || !canEditContent) return

    const token = getAuthToken()
    if (!token) {
      setContentError('No authentication token found')
      return
    }

    setContentSaving(true)
    setContentError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/content`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          change_summary: contentChangeSummary || undefined
        })
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.detail || 'Failed to update document content')
      }

      const data = await response.json()
      setInitialContent(data.content || content)
      setContent(data.content || content)
      setContentMessage(data.message || 'Document content updated successfully')
      setContentChangeSummary('')
      setViewerRefreshKey(prev => prev + 1)
      await fetchDocumentVersions()
      onRefresh?.()
    } catch (err: any) {
      setContentError(err.message || 'Failed to update document content')
    } finally {
      setContentSaving(false)
    }
  }

  const handleVersionDownload = async (versionId: number) => {
    if (!document || !API_BASE_URL) return
    const token = getAuthToken()
    if (!token) {
      setVersionsError('No authentication token found')
      return
    }

    setVersionsError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/versions/${versionId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download document version')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.filename
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading version:', error)
      setVersionsError('Failed to download the selected version')
    }
  }

  const isContentDirty = supportsContentEditing && canEditContent && content !== initialContent
  const editTabDisabled = !supportsContentEditing
  const formatVersionDate = (value: string) => new Date(value).toLocaleString()
  const [latestVersion, ...previousVersions] = versions

  const fetchTemplateSuggestions = async () => {
    const token = getAuthToken()
    if (!token || !document || !API_BASE_URL) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/ai/editor/templates?document_type=${encodeURIComponent(document.document_type)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTemplateSuggestions(data.templates || [])
        setTemplateNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Template suggestion error:', error)
    }
  }

  const fetchWorkflowInsights = async () => {
    const token = getAuthToken()
    if (!token || !document || !API_BASE_URL) return

    setWorkflowLoading(true)
    setWorkflowError(null)

    try {
      const [assignRes, progressRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/documents/ai/workflow/assign`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ document_id: document.id })
        }),
        fetch(`${API_BASE_URL}/api/documents/ai/workflow/progress`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ document_id: document.id })
        }),
        fetch(`${API_BASE_URL}/api/documents/ai/workflow/timeline`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ document_id: document.id })
        })
      ])

      if (assignRes.ok) {
        const assignData = await assignRes.json()
        setWorkflowAssignments({
          recommended: assignData.recommended || [],
          backup: assignData.backup || []
        })
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setWorkflowProgress({
          next_step: progressData.next_step,
          automation: progressData.automation || [],
          blockers: progressData.blockers || []
        })
      }

      if (timelineRes.ok) {
        const timelineData = await timelineRes.json()
        setWorkflowTimeline({
          estimated_completion: timelineData.estimated_completion,
          phase_estimates: timelineData.phase_estimates || [],
          risk_level: timelineData.risk_level,
          confidence: timelineData.confidence,
          notes: timelineData.notes || []
        })
      }
    } catch (error) {
      console.error('Workflow AI error:', error)
      setWorkflowError('Unable to load AI workflow insights')
    } finally {
      setWorkflowLoading(false)
    }
  }

  const runAICompletion = async () => {
    const token = getAuthToken()
    if (!token || !API_BASE_URL) return

    setAiCompletionLoading(true)
    setAiCompletion(null)
    setAiCompletionTips([])

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/ai/editor/completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: aiContext,
          focus: editedDocument.document_type
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiCompletion(data.completion || '')
        setAiCompletionTips(data.tips || [])
      }
    } catch (error) {
      console.error('AI completion error:', error)
    } finally {
      setAiCompletionLoading(false)
    }
  }

  const runGrammarCheck = async () => {
    const token = getAuthToken()
    if (!token || !API_BASE_URL) return

    setAiGrammarLoading(true)
    setAiGrammarIssues([])
    setAiGrammarSummary(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/ai/editor/grammar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: aiContext || editedDocument.description || '',
          jurisdiction: editedDocument.access_level
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiGrammarIssues(data.issues || [])
        setAiGrammarSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Grammar check error:', error)
    } finally {
      setAiGrammarLoading(false)
    }
  }

  const runNumbering = async () => {
    const token = getAuthToken()
    if (!token || !outlineInput.trim() || !API_BASE_URL) return

    setNumberingLoading(true)
    setNumberedSections([])
    setNumberingNotes([])

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/ai/editor/numbering`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outline: outlineInput.split('\n').map(line => line.trim()).filter(Boolean)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setNumberedSections(data.numbered_sections || [])
        setNumberingNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Numbering error:', error)
    } finally {
      setNumberingLoading(false)
    }
  }

  const copyCompletion = async () => {
    if (!aiCompletion) return
    try {
      await navigator.clipboard.writeText(aiCompletion)
      setCopiedCompletion(true)
      setTimeout(() => setCopiedCompletion(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }


  const automationItems = workflowProgress.automation ?? []
  const blockerItems = workflowProgress.blockers ?? []
  const phaseEstimates = workflowTimeline.phase_estimates ?? []
  const timelineNotes = workflowTimeline.notes ?? []

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{document?.title}</span>
              {isEditing && (
                <span className="text-sm text-muted-foreground font-normal">
                  (Editing)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edit document metadata and content' : 'View document details and content'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Document Metadata */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold text-lg">Document Information</h3>
                
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editedDocument.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    readOnly={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editedDocument.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    readOnly={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    {isEditing ? (
                      <Select
                        value={editedDocument.document_type}
                        onValueChange={(value) => handleFieldChange('document_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={editedDocument.document_type || ''} readOnly />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select
                        value={editedDocument.status}
                        onValueChange={(value) => handleFieldChange('status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={editedDocument.status || ''} readOnly />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Access Level</Label>
                    {isEditing ? (
                      <Select
                        value={editedDocument.access_level}
                        onValueChange={(value) => handleFieldChange('access_level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {accessLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={editedDocument.access_level || ''} readOnly />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={editedDocument.category || ''}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      readOnly={!isEditing}
                    />
                  </div>
                </div>

                {/* File Information */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-medium">File Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Filename</Label>
                      <p>{document?.filename}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Size</Label>
                      <p>{document?.file_size ? `${Math.round(document.file_size / 1024)} KB` : 'Unknown'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Version</Label>
                      <p>{document?.version}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <p>{document?.created_at ? new Date(document.created_at).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                {templateSuggestions.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Smart template suggestions
                    </h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {templateSuggestions.map((template) => (
                        <li key={template.name} className="rounded border p-2 bg-muted/30">
                          <p className="font-medium text-foreground">{template.name}</p>
                          {template.description && <p>{template.description}</p>}
                          {template.when_to_use && <p className="text-xs text-muted-foreground">Use when: {template.when_to_use}</p>}
                        </li>
                      ))}
                    </ul>
                    {templateNotes.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {templateNotes.map((note, index) => (
                          <li key={`${note}-${index}`}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4 text-primary" />
                    Version History
                  </div>
                  <span className="text-xs text-muted-foreground">Current: v{document?.version}</span>
                </div>
                {versionsError && (
                  <Alert variant="destructive">
                    <AlertTitle>Unable to load versions</AlertTitle>
                    <AlertDescription>{versionsError}</AlertDescription>
                  </Alert>
                )}
                {versionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading versions...
                  </div>
                ) : versions.length > 0 ? (
                  <div className="space-y-4">
                    {latestVersion && (
                      <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-1">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span>
                            Version {latestVersion.version}
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              Latest
                            </span>
                          </span>
                          <Button variant="outline" size="sm" onClick={() => handleVersionDownload(latestVersion.id)}>
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatVersionDate(latestVersion.created_at)}</p>
                        {latestVersion.change_summary && (
                          <p className="text-xs text-muted-foreground">Notes: {latestVersion.change_summary}</p>
                        )}
                      </div>
                    )}

                    {previousVersions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Previous versions
                        </p>
                        <div className="space-y-3">
                          {previousVersions.map((version) => (
                            <div key={version.id} className="rounded border p-3 space-y-1 bg-muted/30">
                              <div className="flex items-center justify-between text-sm font-medium">
                                <span>Version {version.version}</span>
                                <Button variant="outline" size="sm" onClick={() => handleVersionDownload(version.id)}>
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">{formatVersionDate(version.created_at)}</p>
                              {version.change_summary && (
                                <p className="text-xs text-muted-foreground">Notes: {version.change_summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No previous versions captured yet. Save content changes to build history.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Document Viewer/Editor */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Document Content</h3>
                  <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                <Tabs
                  value={contentTab}
                  onValueChange={(value) => setContentTab(value as 'preview' | 'edit')}
                  className="space-y-4"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="preview" className="flex items-center gap-2 text-sm">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="edit"
                      className="flex items-center gap-2 text-sm"
                      disabled={editTabDisabled}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="space-y-4">
                    <DocumentViewer
                      documentId={document.id}
                      filename={document.filename}
                      mimeType={document.mime_type}
                      showDownload={false}
                      refreshKey={viewerRefreshKey}
                    />
                    {contentMessage && !supportsContentEditing && (
                      <p className="text-xs text-muted-foreground">{contentMessage}</p>
                    )}
                  </TabsContent>
                  <TabsContent value="edit" className="space-y-4">
                    {contentLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading editable content...
                      </div>
                    ) : !supportsContentEditing ? (
                      <Alert variant="destructive">
                        <AlertTitle>Editing not available</AlertTitle>
                        <AlertDescription>
                          {contentMessage || 'Online editing is not supported for this file type.'}
                        </AlertDescription>
                      </Alert>
                    ) : !canEditContent ? (
                      <Alert variant="destructive">
                        <AlertTitle>Insufficient permissions</AlertTitle>
                        <AlertDescription>
                          {contentMessage || 'You do not have permission to edit this document.'}
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {contentError && (
                          <Alert variant="destructive">
                            <AlertTitle>Unable to load content</AlertTitle>
                            <AlertDescription>{contentError}</AlertDescription>
                          </Alert>
                        )}
                        {contentMessage && !contentError && (
                          <Alert>
                            <AlertTitle>Content ready</AlertTitle>
                            <AlertDescription>{contentMessage}</AlertDescription>
                          </Alert>
                        )}
                        {!isEditing && (
                          <Alert>
                            <AlertTitle>Enable editing</AlertTitle>
                            <AlertDescription>
                              Use the Edit toggle above to make changes to the document content.
                            </AlertDescription>
                          </Alert>
                        )}
                        <Textarea
                          value={content}
                          onChange={(event) => setContent(event.target.value)}
                          rows={12}
                          className="font-mono whitespace-pre"
                          disabled={!isEditing}
                          wrap="off"
                          style={{ tabSize: 4 }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={handleContentSave}
                            disabled={!isEditing || contentSaving || !isContentDirty}
                          >
                            {contentSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4 mr-2" />
                                Save new version
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setContent(initialContent)
                              setContentChangeSummary('')
                            }}
                            disabled={!isEditing || contentSaving || !isContentDirty}
                          >
                            <Undo2 className="h-4 w-4 mr-2" />
                            Revert changes
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Change summary</Label>
                          <Textarea
                            value={contentChangeSummary}
                            onChange={(event) => setContentChangeSummary(event.target.value)}
                            placeholder="Describe what changed in this version..."
                            rows={3}
                            disabled={!isEditing}
                          />
                          <p className="text-xs text-muted-foreground">
                            Saving content creates a new document version that you can roll back to at any time.
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Writing Assistant
                  </div>
                  <Button variant="outline" size="sm" onClick={runAICompletion} disabled={aiCompletionLoading || !aiContext.trim()}>
                    {aiCompletionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Draft content
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={aiContext}
                  onChange={(event) => setAiContext(event.target.value)}
                  rows={4}
                  placeholder="Paste a paragraph or describe the section you want to draft..."
                />
                {aiCompletion && (
                  <div className="space-y-2 rounded border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Suggested text</span>
                      <Button variant="ghost" size="sm" onClick={copyCompletion}>
                        <Copy className="h-4 w-4 mr-1" />
                        {copiedCompletion ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap text-muted-foreground">{aiCompletion}</p>
                  </div>
                )}
                {aiCompletionTips.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    {aiCompletionTips.map((tip, index) => (
                      <li key={`${tip}-${index}`}>{tip}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wand2 className="h-4 w-4 text-primary" />
                    Grammar & Compliance Review
                  </div>
                  <Button variant="outline" size="sm" onClick={runGrammarCheck} disabled={aiGrammarLoading || !(aiContext || editedDocument.description)}>
                    {aiGrammarLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analysing
                      </>
                    ) : (
                      'Run check'
                    )}
                  </Button>
                </div>
                {aiGrammarSummary && <p className="text-sm text-muted-foreground">{aiGrammarSummary}</p>}
                {aiGrammarIssues.length > 0 && (
                  <ul className="space-y-2 text-xs">
                    {aiGrammarIssues.map((issue, index) => (
                      <li key={`${issue.issue}-${index}`} className="rounded border p-2 bg-muted/30">
                        <p className="font-medium text-foreground">{issue.issue}</p>
                        {issue.severity && <p className="text-muted-foreground">Severity: {issue.severity}</p>}
                        {issue.suggestion && <p className="text-muted-foreground">Suggestion: {issue.suggestion}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ListOrdered className="h-4 w-4 text-primary" />
                    Automated Section Numbering
                  </div>
                  <Button variant="outline" size="sm" onClick={runNumbering} disabled={numberingLoading || !outlineInput.trim()}>
                    {numberingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Structuring
                      </>
                    ) : (
                      'Generate'
                    )}
                  </Button>
                </div>
                <Textarea
                  value={outlineInput}
                  onChange={(event) => setOutlineInput(event.target.value)}
                  rows={3}
                  placeholder="Enter headings, one per line"
                />
                {numberedSections.length > 0 && (
                  <div className="rounded border bg-muted/40 p-3 text-sm space-y-1">
                    {numberedSections.map((section) => (
                      <p key={section.number}><span className="font-semibold mr-2">{section.number}</span>{section.heading}</p>
                    ))}
                  </div>
                )}
                {numberingNotes.length > 0 && (
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    {numberingNotes.map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Intelligent Workflow Insights
                </div>
                {workflowLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading AI recommendations...</p>
                )}
                {workflowError && <p className="text-sm text-destructive">{workflowError}</p>}
                {workflowAssignments.recommended.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Recommended reviewers</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {workflowAssignments.recommended.map((reviewer) => (
                        <li key={reviewer.id} className="rounded border p-2 bg-muted/40">
                          <span className="font-medium text-foreground">{reviewer.name}</span>
                          {reviewer.role && <span className="ml-2">({reviewer.role})</span>}
                          {reviewer.workload && <span className="ml-2">Workload: {reviewer.workload}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {workflowAssignments.backup.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Backup reviewers</p>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {workflowAssignments.backup.map((reviewer) => (
                        <li key={reviewer.id} className="rounded border p-2">{reviewer.name}{reviewer.role ? ` (${reviewer.role})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {workflowProgress.next_step && (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Next suggested step</p>
                    <p className="text-muted-foreground">{workflowProgress.next_step}</p>
                    {automationItems.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-muted-foreground">
                        {automationItems.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {blockerItems.length > 0 && (
                      <p className="text-xs text-destructive">Blockers: {blockerItems.join(', ')}</p>
                    )}
                  </div>
                )}
                {workflowTimeline.estimated_completion && (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>Estimated completion: {workflowTimeline.estimated_completion}</span>
                    </div>
                    {phaseEstimates.length ? (
                      <ul className="list-disc pl-5 text-xs text-muted-foreground">
                        {phaseEstimates.map((phase, index) => (
                          <li key={index}>{phase.phase}{phase.days ? ` • ${phase.days} days` : ''}</li>
                        ))}
                      </ul>
                    ) : null}
                    {workflowTimeline.risk_level && (
                      <p className="text-xs text-muted-foreground">Risk level: {workflowTimeline.risk_level} ({((workflowTimeline.confidence || 0) * 100).toFixed(0)}% confidence)</p>
                    )}
                    {timelineNotes.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-muted-foreground">
                        {timelineNotes.map((note, index) => (
                          <li key={`${note}-${index}`}>{note}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex-1">
            {error && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {error}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              {isEditing ? 'Cancel' : 'Close'}
            </Button>
            
            {isEditing && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}