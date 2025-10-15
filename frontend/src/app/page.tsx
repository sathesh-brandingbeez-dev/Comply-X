"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import logo from '@/assets/logo-1.png'

interface Personalization {
  industry: string
  headline: string
  subheadline: string
  dynamic_examples: string[]
  recommended_modules: string[]
  testimonial?: string | null
  ai_summary?: string | null
}

const PRIMARY_INDUSTRIES = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Energy & Utilities',
  'Transportation & Logistics',
  'Government',
  'Other',
]

const HERO_BACKGROUND = `bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_rgba(15,23,42,0.95))]`

export default function LandingPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('Technology')
  const [personalization, setPersonalization] = useState<Personalization | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const detectedIndustry = useMemo(() => {
    if (typeof window === 'undefined') return 'Technology'
    const language = navigator.language || 'en-US'
    if (language.includes('de') || language.includes('fr')) {
      return 'Manufacturing'
    }
    if (language.includes('en-GB')) {
      return 'Financial Services'
    }
    if (language.includes('en-IN')) {
      return 'Technology'
    }
    return 'Technology'
  }, [])

  useEffect(() => {
    setSelectedIndustry(detectedIndustry)
  }, [detectedIndustry])

  useEffect(() => {
    const controller = new AbortController()
    async function loadPersonalization(industry: string) {
      setLoading(true)
      try {
        const response = await fetch(`/api/auth/registration/personalize?industry=${encodeURIComponent(industry)}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error('Failed to personalise content')
        }
        const data: Personalization = await response.json()
        setPersonalization(data)
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Failed to fetch personalization', error)
        }
      } finally {
        setLoading(false)
      }
    }

    loadPersonalization(selectedIndustry)

    return () => controller.abort()
  }, [selectedIndustry])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 backdrop-blur border-b border-white/10 bg-slate-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-3">
            <Image src={logo} alt="ComplyX" width={36} height={36} className="rounded" />
            <span className="text-lg font-semibold tracking-wide">ComplyX</span>
          </div>
          <nav className="hidden items-center space-x-8 md:flex">
            <a href="#features" className="text-sm text-slate-200 hover:text-white">Features</a>
            <a href="#industries" className="text-sm text-slate-200 hover:text-white">Industries</a>
            <a href="#ai" className="text-sm text-slate-200 hover:text-white">AI Advantage</a>
            <a href="#contact" className="text-sm text-slate-200 hover:text-white">Contact</a>
          </nav>
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-200 transition hover:text-white"
            >
              Existing User? Sign In
            </Link>
            <Link
              href="/register/wizard"
              className="hidden rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 md:inline-flex"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={`${HERO_BACKGROUND} relative overflow-hidden`}> 
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_60%)]" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center space-x-3 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs uppercase tracking-wide text-sky-200">
                AI-Powered Compliance Automation
              </div>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                {personalization?.headline ?? 'Smart Compliance Management Platform'}
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                {personalization?.subheadline ?? 'Streamline your compliance processes with AI-powered automation.'}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register/wizard"
                  className="inline-flex items-center rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-400"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/register/quick"
                  className="inline-flex items-center rounded-lg border border-sky-500 px-6 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/10"
                >
                  Schedule Demo
                </Link>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Personalised for {personalization?.industry ?? selectedIndustry}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(personalization?.dynamic_examples ?? []).map((example) => (
                    <div key={example} className="rounded-lg border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                      {example}
                    </div>
                  ))}
                </div>
                {personalization?.ai_summary && (
                  <p className="mt-4 text-sm text-sky-200">{personalization.ai_summary}</p>
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                <h2 className="text-lg font-semibold text-white">Dynamic industry insights</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Select your industry to see AI-powered recommendations instantly.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {PRIMARY_INDUSTRIES.map((industry) => (
                    <button
                      key={industry}
                      onClick={() => setSelectedIndustry(industry)}
                      className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                        selectedIndustry === industry
                          ? 'border-sky-400 bg-sky-500/20 text-white shadow-inner'
                          : 'border-white/10 bg-slate-900/60 text-slate-300 hover:border-sky-500/40 hover:text-white'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
                <div className="mt-8 space-y-4 text-sm text-slate-200">
                  <div>
                    <span className="font-semibold text-white">Recommended modules:</span>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-slate-300">
                      {(personalization?.recommended_modules ?? []).map((module) => (
                        <li key={module}>{module}</li>
                      ))}
                    </ul>
                  </div>
                  {personalization?.testimonial && (
                    <blockquote className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100">
                      “{personalization.testimonial}”
                    </blockquote>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-white/5 bg-slate-950 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-white">End-to-end compliance automation</h2>
              <p className="mt-4 text-base text-slate-300">
                AI-guided workflows, automated evidence collection, and intelligent monitoring keep your teams audit-ready.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  title: 'AI Policy Engine',
                  description: 'Generate and maintain tailored policy libraries with generative AI and continuous updates.',
                },
                {
                  title: 'Control Monitoring',
                  description: 'Track control effectiveness with smart alerts, department-level insights, and predictive analytics.',
                },
                {
                  title: 'Assurance Workspace',
                  description: 'Coordinate audits, risks, and incidents with reviewer sign-offs and automated evidence trails.',
                },
              ].map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="industries" className="border-t border-white/5 bg-slate-900/60 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-semibold text-white">Department-aware permission intelligence</h2>
                <p className="mt-4 text-base text-slate-300">
                  ComplyX orchestrates access controls across Reader, Editor, Reviewer, Admin, and Super Admin levels, automatically aligning departmental privileges with your governance model.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {[
                    'Readers gain contextual visibility restricted to assigned departments.',
                    'Editors collaborate on remediation tasks while preserving audit trails.',
                    'Reviewers sanction updates with AI-assisted recommendations.',
                    'Admins configure organizational structure and compliance programs end-to-end.',
                    'Super Admins maintain global oversight with deletion safeguards.',
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start space-x-3">
                      <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-sky-400"></span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-semibold text-white">AI-powered onboarding timeline</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Instantly forecast deployment timelines across frameworks and departments.
                </p>
                <div className="mt-6 grid gap-4 text-sm text-slate-200">
                  {loading ? (
                    <p className="animate-pulse text-slate-400">Generating insights…</p>
                  ) : (
                    personalization && (
                      <>
                        <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
                          <h4 className="font-semibold text-white">AI Insight</h4>
                          <p className="mt-2 text-slate-300">
                            {personalization.ai_summary ?? 'Deploy tailored compliance roadmaps with collaborative automation.'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
                          <h4 className="font-semibold text-white">Industry Benchmark</h4>
                          <p className="mt-2 text-slate-200">
                            Teams similar to yours reduce audit prep by 42% in their first quarter on ComplyX.
                          </p>
                        </div>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ai" className="border-t border-white/5 bg-slate-950 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/60 to-sky-900/40 p-10">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-semibold text-white">Compliance copilots for every team</h2>
                  <p className="mt-4 text-base text-slate-300">
                    Adaptive intelligence personalises controls, frameworks, and onboarding experiences. From AI-generated department structures to proactive deadline reminders, ComplyX learns from your organization to guide every decision.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {['AI department designer', 'Predictive control scoring', 'Intelligent framework recommendations', 'Risk-aware authentication'].map((chip) => (
                      <span key={chip} className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-100">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
                  <h3 className="text-lg font-semibold text-white">Trusted by modern compliance teams</h3>
                  <ul className="mt-4 space-y-4 text-sm text-slate-300">
                    <li>• 30+ AI accelerators to automate evidence, risk scoring, and reporting.</li>
                    <li>• Department-specific workspaces with reviewer workflows and digital sign-offs.</li>
                    <li>• Intelligent MFA triggers adapting to device, location, and behavioural patterns.</li>
                  </ul>
                  <div className="mt-6">
                    <Link
                      href="/register/wizard"
                      className="inline-flex items-center rounded-lg bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                      Explore onboarding wizard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-white/10 bg-slate-950 py-10">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-6 text-sm text-slate-400 md:flex-row">
          <p>© {new Date().getFullYear()} ComplyX. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <a href="mailto:hello@complyx.ai" className="hover:text-white">Contact</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/terms" className="hover:text-white">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
