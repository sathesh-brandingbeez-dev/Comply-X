"use client"

import { useState } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import logo from '@/assets/logo-1.png'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="text-primary">
              {/* <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0L24.5 15.5H40L28.5 24.5L33 40L20 31L7 40L11.5 24.5L0 15.5H15.5L20 0Z" fill="currentColor"/>
              </svg> */}
            <img src={logo.src} alt="Logo" width="40" height="40" />
            </div>
          </div>
          <h2 className="text-xl text-slate-200 mb-2">AI-powered compliance management</h2>
          <p className="text-sm text-slate-400">
            Sign in to your workspace or explore the onboarding wizard to launch a new organization.
          </p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-slate-900/60 border border-white/10 rounded-lg p-1 mb-4">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isLogin
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isLogin
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <div className="text-xs text-center text-slate-400">
          Need a full onboarding experience?{' '}
          <a href="/register/wizard" className="text-sky-300 underline-offset-4 hover:underline">
            Launch setup wizard
          </a>{' '}
          or{' '}
          <a href="/register/quick" className="text-sky-300 underline-offset-4 hover:underline">
            quick company setup
          </a>.
        </div>

        {isLogin ? (
          <LoginForm />
        ) : (
          <RegisterForm 
            onToggle={() => setIsLogin(true)}
            onSuccess={() => {
              // Don't automatically switch to login - let user see success message
              // and click the "Sign In" button when ready
            }}
          />
        )}
      </div>
    </div>
  )
}