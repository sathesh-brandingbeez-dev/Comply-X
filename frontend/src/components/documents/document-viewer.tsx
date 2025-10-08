"use client"

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Download,
  AlertTriangle,
  Loader2,
  Eye,
  ExternalLink
} from 'lucide-react'

import { buildApiUrl } from '@/lib/api'

interface DocumentViewerProps {
  documentId: number
  filename: string
  mimeType?: string
  className?: string
  showDownload?: boolean
  refreshKey?: string | number
}

export function DocumentViewer({
  documentId,
  filename,
  mimeType,
  className = "",
  showDownload = true,
  refreshKey
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [isDocxConverting, setIsDocxConverting] = useState(false)
  const [docxConversionError, setDocxConversionError] = useState<string | null>(null)

  const fileExtension = useMemo(() => filename?.split('.').pop()?.toLowerCase() || '', [filename])
  const docxPreviewStyles = useMemo(
    () => `
      .docx-preview { color: #111827; line-height: 1.6; font-size: 0.95rem; }
      .docx-preview h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
      .docx-preview h2 { font-size: 1.5rem; margin-bottom: 0.75rem; }
      .docx-preview h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
      .docx-preview p { margin-bottom: 0.75rem; }
      .docx-preview table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
      .docx-preview table, .docx-preview th, .docx-preview td { border: 1px solid #d1d5db; }
      .docx-preview th, .docx-preview td { padding: 0.5rem; text-align: left; vertical-align: top; }
      .docx-preview ul, .docx-preview ol { margin: 0.5rem 0 0.5rem 1.5rem; }
      .docx-preview strong { font-weight: 600; }
      .docx-preview em { font-style: italic; }
      .docx-preview code { background: #f3f4f6; padding: 0.25rem 0.375rem; border-radius: 0.375rem; }
    `,
    []
  )

  useEffect(() => {
    loadDocument()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, refreshKey])

  useEffect(() => {
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl)
      }
    }
  }, [documentUrl])

  const loadDocument = async () => {
    setIsLoading(true)
    setError(null)
    setDocxHtml(null)
    setDocxConversionError(null)
    setIsDocxConverting(fileExtension === 'docx')

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('No authentication token found')
        return
      }

      // Create blob URL for viewing
      const downloadUrl = buildApiUrl(`/documents/${documentId}/download`)
      const response = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to load document')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDocumentUrl(prev => {
        if (prev) {
          URL.revokeObjectURL(prev)
        }
        return url
      })

      if (fileExtension === 'docx') {
        try {
          const arrayBuffer = await blob.arrayBuffer()
          const mammoth = await import('mammoth/mammoth.browser')
          const result = await mammoth.convertToHtml({ arrayBuffer })
          setDocxHtml(result.value)
        } catch (conversionError) {
          console.error('Word preview conversion failed:', conversionError)
          setDocxConversionError('Unable to render a live preview for this Word document. You can still download the file to review it locally.')
        }
      }

    } catch (error) {
      console.error('Error loading document:', error)
      setError('Failed to load document')
    } finally {
      setIsDocxConverting(false)
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const downloadUrl = buildApiUrl(`/documents/${documentId}/download`)
      const response = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error downloading document:', error)
    }
  }

  const renderViewer = () => {
    if (isLoading || (fileExtension === 'docx' && isDocxConverting)) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading document...</span>
        </div>
      )
    }

    if (error || !documentUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-red-600 space-y-2">
          <AlertTriangle className="h-8 w-8" />
          <span>{error || 'Failed to load document'}</span>
          <Button variant="outline" size="sm" onClick={loadDocument}>
            Retry
          </Button>
        </div>
      )
    }

    // PDF files
    if (fileExtension === 'pdf') {
      return (
        <div className="w-full h-full">
          <iframe
            src={`${documentUrl}#toolbar=0&navpanes=0`}
            className="w-full h-[500px] border rounded-lg bg-white"
            title={filename}
            allowFullScreen
          />
        </div>
      )
    }

    if (fileExtension === 'docx') {
      if (docxHtml) {
        return (
          <div className="border rounded-lg bg-white max-h-[500px] overflow-auto shadow-sm">
            <style>{docxPreviewStyles}</style>
            <div className="docx-preview px-6 py-4" dangerouslySetInnerHTML={{ __html: docxHtml }} />
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-3">
          <FileText className="h-10 w-10" />
          <span>{docxConversionError || 'Preparing Word document preview...'}</span>
          {docxConversionError && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download file
            </Button>
          )}
        </div>
      )
    }

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
      return (
        <div className="flex justify-center">
          <img
            src={documentUrl}
            alt={filename}
            className="max-h-96 object-contain border rounded-lg shadow-sm"
          />
        </div>
      )
    }

    // Text files
    if (['txt', 'md', 'json', 'xml', 'csv'].includes(fileExtension) || mimeType?.includes('text')) {
      return (
        <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
          <iframe
            src={documentUrl}
            className="w-full h-80 border-0"
            title={filename}
          />
        </div>
      )
    }

    // Office documents (Word, Excel, PowerPoint)
    if (['doc', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
      // Try to use Office Online viewer
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`

      return (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={officeUrl}
              className="w-full h-96"
              title={filename}
              onError={() => {
                // Fallback if Office viewer fails
                console.log('Office viewer failed, showing download option')
              }}
            />
          </div>
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>If the preview doesn't load, try downloading the file to view it locally.</p>
          </div>
        </div>
      )
    }

    // HTML files
    if (fileExtension === 'html' || fileExtension === 'htm') {
      return (
        <div className="border rounded-lg overflow-hidden">
          <iframe 
            src={documentUrl} 
            className="w-full h-96"
            title={filename}
            sandbox="allow-same-origin"
          />
        </div>
      )
    }

    // Fallback for unsupported file types
    return (
      <div className="space-y-4">
        <div className="text-center text-muted-foreground space-y-4 py-8">
          <FileText className="h-16 w-16 mx-auto" />
          <div>
            <p className="text-lg font-medium">Preview not available</p>
            <p className="text-sm">File: {filename}</p>
            <p className="text-sm">Type: {fileExtension.toUpperCase()} ({mimeType || 'Unknown'})</p>
          </div>
          <p className="text-sm">
            This file type cannot be previewed in the browser. Please download to view.
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download File
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Document Preview
        </CardTitle>
        {showDownload && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            {documentUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(documentUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {renderViewer()}
      </CardContent>
    </Card>
  )
}