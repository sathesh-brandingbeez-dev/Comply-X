"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { authService, LoginRiskResponse } from '@/lib/auth'

interface LoginFormProps {
  initialError?: string | null
  onClearInitialError?: () => void
}

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username or email is required')
    .refine((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const usernameRegex = /^[a-zA-Z0-9_.-]+$/
      return emailRegex.test(value) || usernameRegex.test(value)
    }, 'Please enter a valid username or email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>
type RiskLevel = 'low' | 'medium' | 'high'

export function LoginForm({ initialError, onClearInitialError }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('low')
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaCodeRequested, setMfaCodeRequested] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'microsoft' | null>(null)
  const { login } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (initialError) {
      setError(initialError)
      onClearInitialError?.()
    }
  }, [initialError, onClearInitialError])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cx_remembered_identifier') : null
    if (stored) {
      setValue('identifier', stored)
      setRememberMe(true)
    }
  }, [setValue])

  const identifierValue = watch('identifier')
  const isEmail = identifierValue?.includes('@')

  const badgeStyles = useMemo(() => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-50 text-red-600 border-red-200'
      case 'medium':
        return 'bg-amber-50 text-amber-600 border-amber-200'
      default:
        return 'bg-emerald-50 text-emerald-600 border-emerald-200'
    }
  }, [riskLevel])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')

      let riskAssessment: LoginRiskResponse
      try {
        riskAssessment = await authService.evaluateLoginRisk({
          identifier: data.identifier,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          login_hour: new Date().getHours(),
        })
      } catch (evaluationError) {
        console.warn('Risk evaluation unavailable', evaluationError)
        riskAssessment = {
          risk_level: 'low',
          require_mfa: false,
          recommended_action: 'Proceed with standard authentication.',
          personalised_message: 'Adaptive authentication is temporarily unavailable. Proceeding with standard sign-in.',
        }
      }

      setRiskLevel((riskAssessment.risk_level as RiskLevel) ?? 'low')
      setAiMessage(riskAssessment.personalised_message)
      setMfaRequired(riskAssessment.require_mfa)

      if (riskAssessment.require_mfa && mfaCode.trim().length === 0) {
        if (!mfaCodeRequested) {
          try {
            const challenge = await authService.requestEmailMfaCode(data.identifier)
            if (challenge.sent) {
              setAiMessage('We\'ve emailed you a verification code. It will expire in 10 minutes.')
            }
            setMfaCodeRequested(true)
          } catch (challengeError: any) {
            console.error('Failed to send MFA challenge', challengeError)
            const detail = challengeError.response?.data?.detail || 'Unable to send verification code. Please try again.'
            setError(detail)
          }
        }
        setMfaRequired(true)
        return
      }

      if (!riskAssessment.require_mfa) {
        setMfaCode('')
        setMfaCodeRequested(false)
      }

      const loginData = {
        username: data.identifier,
        password: data.password,
        mfa_code: riskAssessment.require_mfa ? mfaCode : undefined,
      }

      await login(loginData)

      setMfaCodeRequested(false)

      if (rememberMe) {
        localStorage.setItem('cx_remembered_identifier', data.identifier)
      } else {
        localStorage.removeItem('cx_remembered_identifier')
      }

      router.push('/dashboard')
    } catch (err: any) {
      console.log('Login error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please try again.'
      setError(errorMessage)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'microsoft') => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      setError('')
      setSocialLoading(provider)
      const redirectUri = `${window.location.origin}/login`
      const authorizationUrl = await authService.getOAuthAuthorizationUrl(provider, redirectUri)
      window.location.href = authorizationUrl
    } catch (err: any) {
      console.error(`Failed to start ${provider} sign-in`, err)
      const providerLabel = provider === 'google' ? 'Google' : 'Microsoft'
      setError(`Unable to start ${providerLabel} sign-in. Please try again.`)
      setSocialLoading(null)
    }
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Username or Email</Label>
          <Input
            id="identifier"
            type="text"
            placeholder="admin@acmecorp.com or username"
            {...register('identifier')}
            className={errors.identifier ? 'border-red-500' : ''}
          />
          {errors.identifier && <p className="text-sm text-red-500">{errors.identifier.message}</p>}
          {identifierValue && (
            <p className="text-xs text-muted-foreground">
              {isEmail ? '📧 Email detected' : '👤 Username detected'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>

        {mfaRequired && (
          <div className="space-y-2">
            <Label htmlFor="mfa">Verification Code</Label>
            <Input
              id="mfa"
              type="text"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              placeholder="Enter 6-digit code"
            />
            <p className="text-xs text-muted-foreground">Security check triggered by adaptive authentication.</p>
          </div>
        )}

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <div className="space-y-4">
          <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="rounded border-gray-300"
              />
              Remember me
            </label>
            <a href="/forgot-password" className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Forgot Password?
            </a>
          </div>

          <div className="text-center">
            <div className="relative py-4 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="bg-background px-2">Or</span>
              <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" aria-hidden="true" />
            </div>
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin('google')}
                disabled={isSubmitting || socialLoading !== null}
              >
                {socialLoading === 'google' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Continue with Google'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => handleSocialLogin('microsoft')}
                disabled={isSubmitting || socialLoading !== null}
              >
                {socialLoading === 'microsoft' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  'Continue with Microsoft'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {aiMessage && (
        <div className={`rounded-lg border p-4 text-sm ${badgeStyles}`}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span className="font-medium capitalize">{riskLevel} risk assessment</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed">{aiMessage}</p>
        </div>
      )}
    </div>
  )
}
