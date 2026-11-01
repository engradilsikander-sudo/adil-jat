// src/routes/reset-password.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { getPasswordStrength, type PasswordStrength } from '../lib/auth-validation'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

type Translate = (key: TranslationKey) => string

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])
  const passwordMatches = password.length > 0 && password === confirmPassword
  const confirmPasswordStarted = confirmPassword.length > 0

  useEffect(() => {
    let cancelled = false
    let retryTimer: number | undefined

    async function checkRecoverySession() {
      const linkError = getRecoveryLinkErrorMessage(t)

      if (linkError) {
        setHasRecoverySession(false)
        setCheckingSession(false)
        setError(linkError)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (session) {
        setHasRecoverySession(true)
        setCheckingSession(false)
        setError('')
        return
      }

      if (hasRecoveryUrlParams()) {
        retryTimer = window.setTimeout(async () => {
          const {
            data: { session: delayedSession },
          } = await supabase.auth.getSession()

          if (cancelled) return

          setHasRecoverySession(Boolean(delayedSession))
          setCheckingSession(false)
          setError(delayedSession ? '' : t('reset.error.linkInvalid'))
        }, 1400)
        return
      }

      setHasRecoverySession(false)
      setCheckingSession(false)
      setError(t('reset.error.linkInvalid'))
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (cancelled) return

        if (event === 'PASSWORD_RECOVERY' || session) {
          setHasRecoverySession(true)
          setCheckingSession(false)
          setError('')
        }
      },
    )

    void checkRecoverySession()

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
      authListener.subscription.unsubscribe()
    }
  }, [t])

  function resetAlerts() {
    setError('')
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAlerts()

    if (!hasRecoverySession) {
      setError(t('reset.error.linkInvalid'))
      return
    }

    if (!passwordStrength.isValid) {
      setError(t('reset.error.passwordWeak'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('reset.error.passwordMismatch'))
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (updateError) {
      setError(toFriendlyUpdatePasswordError(updateError.message, t))
      return
    }

    setPassword('')
    setConfirmPassword('')
    setMessage(t('reset.message.updated'))

    window.setTimeout(() => {
      void (async () => {
        await supabase.auth.signOut()
        await navigate({ to: '/login', replace: true })
      })()
    }, 1500)
  }

  return (
    <main className="page-main auth-page">
      <div className="page-wrap page-stack" dir={direction}>
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <aside className="home-hero animate-fade-up">
            <div className="home-hero-inner !grid-cols-1">
              <div className="home-hero-copy">
                <div className="home-hero-badge animate-fade-up">
                  <span className="brand-dot" />
                  <span className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-emerald-900">
                    {t('reset.hero.badge')}
                  </span>
                </div>

                <p className="home-hero-kicker animate-fade-up delay-1">
                  {t('reset.hero.kicker')}
                </p>

                <h1 className="home-hero-title text-balance animate-fade-up delay-2">
                  {t('reset.hero.title')}
                  <br />
                  <span className="home-hero-accent">{t('reset.hero.accent')}</span>
                </h1>

                <div className="home-hero-rule ajrak-rule animate-fade-in delay-2" />

                <p className="home-hero-text text-pretty animate-fade-up delay-3">
                  {t('reset.hero.description')}
                </p>

                <div className="mt-8 rounded-[1.5rem] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur animate-fade-up delay-4">
                  <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-pale)] text-[var(--forest)]">
                    <ShieldCheck size={16} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">{t('reset.security.title')}</p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">{t('reset.security.text')}</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="soft-panel animate-scale-in rounded-[2rem] border-[#dce4ee] bg-white p-5 shadow-[0_24px_70px_rgba(20,18,16,0.08)] sm:p-7">
            <div className="mb-6">
              <div className="badge-soft bg-[var(--gold-pale)] text-[var(--gold)]">
                <Sparkles size={14} />
                {t('reset.form.badge')}
              </div>

              <h2 className="section-title mt-4">{t('reset.form.title')}</h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t('reset.form.description')}
              </p>
            </div>

            {checkingSession ? (
              <div className="flex items-center gap-3 rounded-[1rem] border border-[var(--line)] bg-[var(--paper)] px-4 py-4 text-sm font-bold text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                {t('reset.checking')}
              </div>
            ) : hasRecoverySession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label={t('reset.newPassword.label')} htmlFor="new-password">
                  <PasswordInput
                    id="new-password"
                    value={password}
                    onChange={(value) => {
                      setPassword(value)
                      resetAlerts()
                    }}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((value) => !value)}
                    placeholder={t('reset.newPassword.placeholder')}
                    showLabel={t('authPage.common.showPassword')}
                    hideLabel={t('authPage.common.hidePassword')}
                  />
                </FormField>

                <PasswordStrengthMeter strength={passwordStrength} t={t} />

                <FormField label={t('authPage.common.confirmPassword')} htmlFor="confirm-new-password">
                  <PasswordInput
                    id="confirm-new-password"
                    value={confirmPassword}
                    onChange={(value) => {
                      setConfirmPassword(value)
                      resetAlerts()
                    }}
                    showPassword={showConfirmPassword}
                    onTogglePassword={() => setShowConfirmPassword((value) => !value)}
                    placeholder={t('reset.confirmPassword.placeholder')}
                    showLabel={t('authPage.common.showPassword')}
                    hideLabel={t('authPage.common.hidePassword')}
                  />
                </FormField>

                {confirmPasswordStarted ? (
                  <div
                    className={`flex items-center gap-2 rounded-[0.9rem] px-3 py-2 text-xs font-bold ${
                      passwordMatches
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                    role="status"
                  >
                    {passwordMatches ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {passwordMatches ? t('reset.match.ok') : t('reset.match.error')}
                  </div>
                ) : null}

                <AlertBlock error={error} message={message} />

                <button
                  type="submit"
                  disabled={loading || !hasRecoverySession || !passwordStrength.isValid || !passwordMatches}
                  className="primary-btn pressable w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  {loading ? t('reset.submit.loading') : t('reset.submit.cta')}
                </button>
              </form>
            ) : (
              <InvalidResetLinkPanel error={error || t('reset.error.linkInvalid')} t={t} />
            )}

            <p className="mt-6 text-center text-sm text-slate-600">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 font-bold text-[var(--forest)]">
                <ArrowLeft size={15} />
                {t('forgot.backToLogin')}
              </Link>
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  showPassword,
  onTogglePassword,
  placeholder,
  showLabel,
  hideLabel,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  showPassword: boolean
  onTogglePassword: () => void
  placeholder: string
  showLabel: string
  hideLabel: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="input-clean pr-12"
        placeholder={placeholder}
      />

      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-stone-100 hover:text-stone-900"
        aria-label={showPassword ? hideLabel : showLabel}
      >
        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  )
}

function PasswordStrengthMeter({
  strength,
  t,
}: {
  strength: PasswordStrength
  t: Translate
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--paper)] p-4" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <LockKeyhole size={16} className="text-[var(--forest)]" />
          {t('reset.strength.title')}
        </div>
        <span className={`text-xs font-black ${strength.textClass}`}>{t(strength.labelKey)}</span>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <span
            key={item}
            className={`h-2 rounded-full transition ${
              item < strength.score ? strength.barClass : 'bg-stone-200'
            }`}
          />
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold text-slate-600">{t(strength.helperKey)}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {strength.criteria.map((criterion) => (
          <div
            key={criterion.key}
            className={`flex items-center gap-2 text-xs font-semibold ${
              criterion.met ? 'text-emerald-700' : 'text-stone-500'
            }`}
          >
            {criterion.met ? <CheckCircle2 size={14} /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-300" />}
            {t(criterion.labelKey)}
          </div>
        ))}
      </div>
    </div>
  )
}

function InvalidResetLinkPanel({
  error,
  t,
}: {
  error: string
  t: Translate
}) {
  return (
    <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-red-700 shadow-sm">
        <ShieldAlert size={22} />
      </div>
      <p className="text-base font-black">{t('reset.invalid.title')}</p>
      <p className="mt-2 text-sm leading-7">{error}</p>
      <Link
        to="/forgot-password"
        className="secondary-btn pressable mt-4 inline-flex justify-center bg-white text-red-800 hover:bg-red-100"
      >
        <KeyRound size={16} />
        {t('reset.invalid.requestNew')}
      </Link>
    </div>
  )
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function AlertBlock({
  error,
  message,
}: {
  error: string
  message: string
}) {
  return (
    <>
      {error ? (
        <div
          className="flex items-start gap-2 rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {message ? (
        <div
          className="flex items-start gap-2 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          role="status"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      ) : null}
    </>
  )
}

function hasRecoveryUrlParams() {
  if (typeof window === 'undefined') return false

  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return (
    query.get('type') === 'recovery' ||
    hash.get('type') === 'recovery' ||
    query.has('code') ||
    query.has('token_hash') ||
    hash.has('access_token') ||
    hash.has('refresh_token') ||
    query.has('error_code') ||
    hash.has('error_code')
  )
}

function getRecoveryLinkErrorMessage(t: Translate) {
  if (typeof window === 'undefined') return ''

  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const code = query.get('error_code') || hash.get('error_code') || ''
  const description = query.get('error_description') || hash.get('error_description') || ''
  const combined = `${code} ${description}`.toLowerCase()

  if (!combined.trim()) return ''

  if (combined.includes('expired') || combined.includes('otp_expired')) {
    return t('reset.error.linkExpired')
  }

  return t('reset.error.linkInvalid')
}

function toFriendlyUpdatePasswordError(message: string, t: Translate) {
  const lower = message.toLowerCase()

  if (lower.includes('same') || lower.includes('different')) {
    return t('reset.error.passwordSame')
  }

  if (lower.includes('weak') || lower.includes('at least') || lower.includes('password')) {
    return t('reset.error.passwordWeak')
  }

  if (lower.includes('session') || lower.includes('jwt') || lower.includes('expired')) {
    return t('reset.error.linkInvalid')
  }

  return message || t('reset.error.generic')
}
