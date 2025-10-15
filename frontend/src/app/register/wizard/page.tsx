"use client"

import Link from 'next/link'
import { CompanyRegistrationWizard } from '@/components/registration/company-wizard'

export default function WizardRegistrationPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-16 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Guided onboarding</p>
          <h1 className="text-4xl font-semibold text-white">Company Setup Wizard</h1>
          <p className="text-base text-slate-300">
            Define your organization, administrator, departments, and compliance frameworks in four AI-assisted steps.
          </p>
          <div className="text-sm text-slate-400">
            Prefer a faster flow?{' '}
            <Link href="/register/quick" className="text-sky-300 underline">
              Use quick company setup instead.
            </Link>
          </div>
        </header>
        <CompanyRegistrationWizard />
      </div>
    </div>
  )
}

