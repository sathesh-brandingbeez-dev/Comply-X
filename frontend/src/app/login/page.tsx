"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import logo from '@/assets/logo-1.png'
import { useAuth } from '@/contexts/auth-context'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [processingOAuth, setProcessingOAuth] = useState(false)
  const oauthHandledRef = useRef(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { completeOAuthLogin } = useAuth()

  useEffect(() => {
    if (!searchParams || oauthHandledRef.current) {
      return
    }

    const token = searchParams.get('oauth_token')
    const errorParam = searchParams.get('oauth_error')
    const hasState = searchParams.get('state')

    const clearParams = (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      keys.forEach(key => params.delete(key))
      const query = params.toString()
      router.replace(query ? `/login?${query}` : '/login')
    }

    if (token && !processingOAuth) {
      oauthHandledRef.current = true
      setProcessingOAuth(true)
      completeOAuthLogin(token)
        .then(() => {
          router.replace('/dashboard')
        })
        .catch(error => {
          console.error('OAuth login failed', error)
          setIsLogin(true)
          setOauthError('We could not complete the secure sign-in. Please try again.')
          clearParams(['oauth_token', 'state'])
          oauthHandledRef.current = false
        })
        .finally(() => {
          setProcessingOAuth(false)
        })
      return
    }

    if (errorParam) {
      oauthHandledRef.current = true
      setIsLogin(true)
      setOauthError(errorParam || 'Unable to sign in with the selected provider. Please try again.')
      clearParams(['oauth_error', 'state'])
      oauthHandledRef.current = false
      return
    }

    if (hasState) {
      clearParams(['state'])
    }
  }, [searchParams, completeOAuthLogin, router, processingOAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
          <h2 className="text-xl text-gray-600 mb-8">AI-powered compliance management</h2>
        </div>

        {processingOAuth && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            Completing secure sign-in...
          </div>
        )}

        {/* Toggle Buttons */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isLogin
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isLogin
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <LoginForm
            initialError={oauthError}
            onClearInitialError={() => setOauthError(null)}
          />
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