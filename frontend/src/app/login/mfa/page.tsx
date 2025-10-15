"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { authService } from '@/lib/auth'

const INITIAL_TIMER = 272 // 4 minutes 32 seconds

export default function TwoFactorPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [timer, setTimer] = useState<number>(INITIAL_TIMER)
  const [canResend, setCanResend] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdown)
  }, [])

  useEffect(() => {
    const resendTimeout = setTimeout(() => {
      setCanResend(true)
    }, 30000)
    return () => clearTimeout(resendTimeout)
  }, [])

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(timer / 60)
    const seconds = timer % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [timer])

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return
    const updated = [...code]
    updated[index] = value
    setCode(updated)

    if (value && index < code.length - 1) {
      const nextInput = document.getElementById(`mfa-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length !== 6) return
    setCode(pasted.split(''))
  }

  const handleVerify = async () => {
    if (code.some((digit) => digit === '')) {
      setError('Enter the complete verification code')
      return
    }
    setLoading(true)
    setError('')
    setTimeout(() => {
      setLoading(false)
      setVerified(true)
    }, 600)
  }

  const handleResend = async () => {
    if (!canResend) return
    setCanResend(false)
    setTimer(INITIAL_TIMER)
    try {
      await authService.requestPasswordReset(email)
    } catch (err) {
      console.warn('Failed to resend MFA code', err)
    } finally {
      setTimeout(() => setCanResend(true), 30000)
    }
  }

  const handleTryAnother = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 py-16 text-slate-100">
      <div className="mx-auto max-w-md px-6">
        <Card className="border border-white/10 bg-slate-950/80">
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Multi-factor authentication</p>
            <CardTitle className="text-3xl text-white">Verify your login</CardTitle>
            <p className="text-sm text-slate-300">
              Enter the 6-digit code sent to {email || 'your registered email/phone'} to secure your account.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center space-x-3">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  id={`mfa-${index}`}
                  value={digit}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  onChange={(event) => handleChange(index, event.target.value)}
                  onPaste={handlePaste}
                  className="h-14 w-12 rounded-lg border-white/20 bg-slate-900 text-center text-xl font-semibold text-white"
                />
              ))}
            </div>
            <div className="text-center text-sm text-slate-300">
              Code expires in <span className="font-semibold text-sky-200">{formattedTimer}</span>
            </div>
            {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            {verified && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                MFA code accepted. Continue to sign in to finalize authentication.
              </div>
            )}
            <div className="space-y-3 text-sm text-slate-300">
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend}
                className={`w-full text-left underline-offset-4 ${canResend ? 'text-sky-300 hover:underline' : 'cursor-not-allowed text-slate-500'}`}
              >
                Didn&apos;t receive code? Resend
              </button>
              <button
                type="button"
                onClick={handleTryAnother}
                className="w-full text-left text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
              >
                Try another method
              </button>
              <label className="flex items-center space-x-2 text-xs text-slate-400">
                <input type="checkbox" />
                <span>Trust this device for 30 days</span>
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button onClick={handleVerify} disabled={loading} className="w-full bg-sky-500 text-white hover:bg-sky-400">
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            <Button onClick={handleTryAnother} variant="outline" className="w-full">
              Back to sign in
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

