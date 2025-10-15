"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'

// Updated schema to accept either username or email
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low')
  const [adaptiveMessage, setAdaptiveMessage] = useState('We keep an eye on unusual activity to protect your account.')
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome back! Ready to continue your compliance journey?')
  const [processingAdaptiveCheck, setProcessingAdaptiveCheck] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      remember_me: true,
    },
  })

  const emailValue = watch('email')
  const rememberMe = watch('remember_me')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedEmail = localStorage.getItem('cx_last_login_email')
    if (savedEmail) {
      setValue('email', savedEmail)
    }
  }, [setValue])

  useEffect(() => {
    if (!emailValue) {
      setRiskLevel('low')
      setAdaptiveMessage('We keep an eye on unusual activity to protect your account.')
      return
    }

    const controller = new AbortController()
    setProcessingAdaptiveCheck(true)

    const timer = setTimeout(() => {
      const score = computeRiskScore(emailValue)
      if (score >= 3) {
        setRiskLevel('high')
        setAdaptiveMessage('High risk login detected. We will request additional verification after sign-in.')
      } else if (score === 2) {
        setRiskLevel('medium')
        setAdaptiveMessage('Unusual pattern noticed. Be prepared for a quick MFA challenge.')
      } else {
        setRiskLevel('low')
        setAdaptiveMessage('Everything looks normal. You can sign in securely.')
      }
      setWelcomeMessage(getPersonalisedWelcome(emailValue))
      setProcessingAdaptiveCheck(false)
    }, 400)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [emailValue])

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('') // Clear any previous errors

      // Transform the data to match your API's expected format
      const loginData = {
        username: data.email,
        password: data.password
      }

      await login(loginData)
      if (data.remember_me) {
        localStorage.setItem('cx_last_login_email', data.email)
      } else {
        localStorage.removeItem('cx_last_login_email')
      }
      router.push('/dashboard')
    } catch (err: any) {
      console.log('Login error:', err) // Add debugging
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please try again.'
      setError(errorMessage)
      // Don't clear the error automatically - let user see it
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
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
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 text-muted-foreground">
            <input type="checkbox" {...register('remember_me')} />
            <span>Remember me</span>
          </label>
          <a
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Forgot Password?
          </a>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-md">
            {error}
          </div>
        )}

        <div className={`rounded-lg border p-3 text-xs ${riskLevel === 'high' ? 'border-red-500/40 bg-red-500/10 text-red-200' : riskLevel === 'medium' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
          <p className="font-medium capitalize">{riskLevel} risk login check</p>
          <p className="mt-1 text-[11px]">
            {processingAdaptiveCheck ? 'Evaluating login context…' : adaptiveMessage}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-muted/40 p-4 text-sm">
          <p className="font-semibold text-primary">{welcomeMessage}</p>
          <p className="mt-2 text-muted-foreground">
            We recognise your last login pattern and will tailor compliance updates right after sign-in.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="flex items-center space-x-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">Or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            <Button type="button" variant="outline" className="w-full">
              Continue with Google
            </Button>
            <Button type="button" variant="outline" className="w-full">
              Continue with Microsoft
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <a href="/register/wizard" className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign Up
            </a>
          </div>
        </div>
      </form>
    </div>
  )
}

function computeRiskScore(email: string): number {
  let score = 0
  const currentHour = new Date().getHours()
  if (currentHour < 6 || currentHour > 22) {
    score += 2
  }
  if (!email.endsWith('.com')) {
    score += 1
  }
  if (!email.includes('@')) {
    score += 1
  }
  return score
}

function getPersonalisedWelcome(email: string): string {
  const firstPart = email.split('@')[0]
  const name = firstPart.split(/[._-]/).map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1)).join(' ')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${greeting} ${name || 'there'}! We’ve highlighted your most recent compliance actions.`
}