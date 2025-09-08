"use client"

import { useState, useEffect, useRef } from 'react'
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
import {
  Save,
  Download,
  FileText,
  Eye,
  Edit,
  AlertTriangle,
  Loader2
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

interface DocumentEditorProps {
  document: Document
  isOpen: boolean
  onClose: () => void
  onSave: (updatedDocument: Partial<Document>) => Promise<void>
  onDownload: () => void
}

export function DocumentEditor({ 
  document, 
  isOpen, 
  onClose, 
  onSave, 
  onDownload 
}: DocumentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setSaving] = useState(false)
  const [editedDocument, setEditedDocument] = useState<Partial<Document>>({})
  const [error, setError] = useState<string | null>(null)

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
    }
  }, [isOpen, document])

  const handleSave = async () => {
    if (!editedDocument || !document) return
    
    setSaving(true)
    setError(null)
    
    try {
      await onSave(editedDocument)
      setIsEditing(false)
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
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Document Viewer/Editor */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Document Content</h3>
                  <Button variant="outline" size="sm" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                <DocumentViewer 
                  documentId={document.id}
                  filename={document.filename}
                  mimeType={document.mime_type}
                  showDownload={false}
                />
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