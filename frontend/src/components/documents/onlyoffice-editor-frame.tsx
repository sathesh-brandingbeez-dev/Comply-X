"use client"

import { useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    DocsAPI?: any
  }
}

const scriptPromises: Record<string, Promise<void>> = {}

function loadOnlyOfficeScript(documentServerUrl: string): Promise<void> {
  const normalized = documentServerUrl.replace(/\/$/, '')
  if (scriptPromises[normalized] !== undefined) {
    return scriptPromises[normalized]
  }

  scriptPromises[normalized] = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    if (window.DocsAPI) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `${normalized}/web-apps/apps/api/documents/api.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load OnlyOffice editor script'))
    document.body.appendChild(script)
  })

  return scriptPromises[normalized]
}

export interface OnlyOfficeEditorFrameProps {
  documentServerUrl: string
  config: Record<string, any>
  token?: string | null
  className?: string
  height?: string
  onEditorReady?: () => void
  onDocumentStateChange?: (isChanged: boolean) => void
  onError?: (message: string) => void
  refreshKey?: string | number
}

export function OnlyOfficeEditorFrame({
  documentServerUrl,
  config,
  token,
  className,
  height = '600px',
  onEditorReady,
  onDocumentStateChange,
  onError,
  refreshKey
}: OnlyOfficeEditorFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const containerId = useMemo(
    () => `onlyoffice-editor-${Math.random().toString(36).slice(2)}`,
    [refreshKey]
  )

  useEffect(() => {
    let cancelled = false

    const initializeEditor = async () => {
      if (!documentServerUrl || typeof window === 'undefined') {
        onError?.('OnlyOffice Document Server URL is not configured')
        return
      }

      try {
        await loadOnlyOfficeScript(documentServerUrl)
      } catch (error) {
        onError?.(error instanceof Error ? error.message : String(error))
        return
      }

      if (cancelled) return

      const DocsAPI = window.DocsAPI
      if (!DocsAPI) {
        onError?.('OnlyOffice API is not available in the current window')
        return
      }

      const element = containerRef.current
      if (!element) {
        onError?.('Editor container is not available')
        return
      }

      if (editorRef.current && typeof editorRef.current.destroyEditor === 'function') {
        try {
          editorRef.current.destroyEditor()
        } catch (error) {
          console.warn('Failed to destroy OnlyOffice editor', error)
        }
        editorRef.current = null
      }

      const mergedConfig = JSON.parse(JSON.stringify(config))
      mergedConfig.width = mergedConfig.width ?? '100%'
      mergedConfig.height = mergedConfig.height ?? '100%'
      mergedConfig.events = mergedConfig.events ?? {}

      const previousReady = mergedConfig.events.onDocumentReady
      const previousStateChange = mergedConfig.events.onDocumentStateChange
      const previousError = mergedConfig.events.onError

      mergedConfig.events.onDocumentReady = (...args: any[]) => {
        previousReady?.(...args)
        onEditorReady?.()
      }

      mergedConfig.events.onDocumentStateChange = (event: any) => {
        previousStateChange?.(event)
        if (typeof event?.data === 'boolean') {
          onDocumentStateChange?.(event.data)
        }
      }

      mergedConfig.events.onError = (event: any) => {
        previousError?.(event)
        const message = typeof event?.data === 'string' ? event.data : 'OnlyOffice editor error'
        onError?.(message)
      }

      if (token) {
        mergedConfig.token = token
      }

      editorRef.current = new DocsAPI.DocEditor(containerId, mergedConfig)
    }

    initializeEditor()

    return () => {
      cancelled = true
      if (editorRef.current && typeof editorRef.current.destroyEditor === 'function') {
        try {
          editorRef.current.destroyEditor()
        } catch (error) {
          console.warn('Failed to clean up OnlyOffice editor', error)
        }
        editorRef.current = null
      }
    }
  }, [config, documentServerUrl, token, containerId, onDocumentStateChange, onEditorReady, onError])

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={cn('w-full overflow-hidden rounded border bg-background', className)}
      style={{ height }}
    />
  )
}
