"use client"

import Link from 'next/link'
import { QuickCompanyRegistration } from '@/components/registration/quick-registration'

export default function QuickRegistrationPage() {
  return (
    <div className="min-h-screen bg-slate-950 py-16 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-6">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Rapid onboarding</p>
          <h1 className="text-4xl font-semibold text-white">Quick Company Setup</h1>
          <p className="text-base text-slate-300">
            Auto-populate recommended departments and compliance frameworks for your industry. Adjust at any time after sign in.
          </p>
          <div className="text-sm text-slate-400">
            Need granular control?{' '}
            <Link href="/register/wizard" className="text-sky-300 underline">
              Switch to guided wizard.
            </Link>
          </div>
        </header>
        <QuickCompanyRegistration />
      </div>
    </div>
  )
}

