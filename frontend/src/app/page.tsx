"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

interface PersonalisationPayload {
  headline: string
  subheadline: string
  personalised_examples: string[]
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const [personalisation, setPersonalisation] = useState<PersonalisationPayload | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      window.location.replace('/dashboard')
    }
  }, [isAuthenticated])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()

    if (typeof window !== 'undefined') {
      const language = navigator.language || ''
      if (language.includes('-')) {
        params.set('country', language.split('-')[1])
      }
    }

    const query = params.toString()
    const url = query ? `/api/registration/ai/personalise?${query}` : '/api/registration/ai/personalise'

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as PersonalisationPayload
      })
      .then((data) => {
        if (data) {
          setPersonalisation(data)
        }
      })
      .catch(() => {
        // Ignore personalisation failures silently
      })

    return () => controller.abort()
  }, [])

  const dynamicExamples = useMemo(() => {
    return personalisation?.personalised_examples ?? [
      'Automate compliance evidence collection with AI summaries',
      'Gain real-time visibility into risk ownership',
      'Unify document control, audits, and incidents in one workspace',
    ]
  }, [personalisation])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-slate-50">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div className="text-xl font-semibold text-primary">ComplyX</div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-primary">
              Existing User? Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 lg:flex-row lg:items-center">
        <section className="flex-1 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {personalisation?.headline ?? 'Smart Compliance Management Platform'}
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {personalisation?.subheadline ?? 'Streamline your compliance processes with AI-powered automation'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dynamicExamples.map((example) => (
              <Card key={example} className="border border-primary/10 bg-white shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm text-gray-700">{example}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full border-primary text-primary hover:bg-primary/5 sm:w-auto">
              <Link href="/register?mode=demo">Schedule Demo</Link>
            </Button>
          </div>
        </section>

        <section className="flex-1">
          <div className="rounded-3xl border border-primary/10 bg-white/80 p-8 shadow-xl backdrop-blur">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Why teams choose ComplyX</h2>
              <ul className="space-y-4 text-sm text-gray-600">
                <li>
                  <span className="font-medium text-gray-900">Department-aware access control:</span> align the new five-tier
                  permission system across your organisational hierarchy.
                </li>
                <li>
                  <span className="font-medium text-gray-900">AI-guided onboarding:</span> tailored registration suggestions based on
                  industry, geography, and company scale.
                </li>
                <li>
                  <span className="font-medium text-gray-900">Unified compliance workspace:</span> orchestrate policies, audits, risk,
                  and incidents from one command centre.
                </li>
              </ul>
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                AI personalisation refreshes in real time using contextual signals so the welcome experience always reflects your
                industry-specific priorities.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
