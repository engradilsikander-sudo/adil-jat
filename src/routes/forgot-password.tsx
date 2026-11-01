// src/routes/forgot-password.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mail,
  MailCheck,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

type Translate = (key: TranslationKey) => string

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()

  const [email, setEmail] = useState('')
  const [sentToEmail, setSentToEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!cancelled && session) {
        await navigate({ to: '/dashboard', replace: true })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate])

  function resetAlerts() {
    setError('')
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAlerts()

    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(t('forgot.error.invalidEmail'))
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: getPasswordResetRedirectUrl(),
      },
    )

    setLoading(false)

    if (resetError) {
      setError(toFriendlyResetError(resetError.message, t))
      return
    }

    setSentToEmail(maskEmail(normalizedEmail))
    setMessage(t('forgot.message.sent'))
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
                    {t('forgot.hero.badge')}
                  </span>
                </div>

                <p className="home-hero-kicker animate-fade-up delay-1">
                  {t('forgot.hero.kicker')}
                </p>

                <h1 className="home-hero-title text-balance animate-fade-up delay-2">
                  {t('forgot.hero.title')}
                  <br />
                  <span className="home-hero-accent">{t('forgot.hero.accent')}</span>
                </h1>

                <div className="home-hero-rule ajrak-rule animate-fade-in delay-2" />

                <p className="home-hero-text text-pretty animate-fade-up delay-3">
                  {t('forgot.hero.description')}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <FeaturePill
                    icon={<Mail size={16} />}
                    title={t('forgot.feature.email.title')}
                    text={t('forgot.feature.email.text')}
                    delay="delay-2"
                  />
                  <FeaturePill
                    icon={<ShieldCheck size={16} />}
                    title={t('forgot.feature.secure.title')}
                    text={t('forgot.feature.secure.text')}
                    delay="delay-3"
                  />
                </div>
              </div>
            </div>
          </aside>

          <section className="soft-panel animate-scale-in rounded-[2rem] border-[#dce4ee] bg-white p-5 shadow-[0_24px_70px_rgba(20,18,16,0.08)] sm:p-7">
            <div className="mb-6">
              <div className="badge-soft bg-[var(--gold-pale)] text-[var(--gold)]">
                <Sparkles size={14} />
                {t('forgot.form.badge')}
              </div>

              <h2 className="section-title mt-4">{t('forgot.form.title')}</h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {sentToEmail ? t('forgot.sent.description') : t('forgot.form.description')}
              </p>
            </div>

            {sentToEmail ? (
              <EmailSentPanel
                email={sentToEmail}
                message={message}
                loading={loading}
                onResend={handleSubmit}
                onChangeEmail={() => {
                  setSentToEmail('')
                  resetAlerts()
                }}
                t={t}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label={t('authPage.common.email')} htmlFor="reset-email">
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      resetAlerts()
                    }}
                    required
                    className="input-clean"
                    placeholder={t('forgot.email.placeholder')}
                  />
                </FormField>

                <AlertBlock error={error} message={message} />

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn pressable w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {loading ? t('forgot.submit.loading') : t('forgot.submit.cta')}
                </button>
              </form>
            )}

            <div className="mt-6 rounded-[1.25rem] border border-[var(--line)] bg-[var(--paper)] p-4 text-sm leading-7 text-slate-600">
              <div className="mb-2 flex items-center gap-2 font-extrabold text-slate-800">
                <HelpCircle size={16} className="text-[var(--forest)]" />
                {t('forgot.help.title')}
              </div>
              <p>{t('forgot.form.emailOnlyNote')}</p>
            </div>

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

function EmailSentPanel({
  email,
  message,
  loading,
  onResend,
  onChangeEmail,
  t,
}: {
  email: string
  message: string
  loading: boolean
  onResend: (event: FormEvent<HTMLFormElement>) => void
  onChangeEmail: () => void
  t: Translate
}) {
  return (
    <form onSubmit={onResend} className="space-y-4">
      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800" role="status">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
          <MailCheck size={22} />
        </div>
        <p className="text-base font-black">{t('forgot.sent.title')}</p>
        <p className="mt-2 text-sm leading-7">
          {message} <span className="font-black">{email}</span>
        </p>
      </div>

      <div className="grid gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-4 text-sm leading-7 text-slate-600">
        <p className="font-extrabold text-slate-900">{t('forgot.sent.nextStepsTitle')}</p>
        <ul className="list-disc space-y-1 ps-5">
          <li>{t('forgot.sent.stepInbox')}</li>
          <li>{t('forgot.sent.stepSpam')}</li>
          <li>{t('forgot.sent.stepExpiry')}</li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="submit"
          disabled={loading}
          className="secondary-btn pressable justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          {loading ? t('forgot.submit.loading') : t('forgot.sent.resend')}
        </button>

        <button
          type="button"
          onClick={onChangeEmail}
          className="secondary-btn pressable justify-center"
        >
          <Mail size={16} />
          {t('forgot.sent.changeEmail')}
        </button>
      </div>
    </form>
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

function FeaturePill({
  icon,
  title,
  text,
  delay,
}: {
  icon: ReactNode
  title: string
  text: string
  delay: string
}) {
  return (
    <div
      className={`soft-panel animate-fade-up ${delay} rounded-[1.25rem] border-white/70 bg-white/72 px-4 py-4 shadow-sm backdrop-blur`}
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gold-pale)] text-[var(--forest)]">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  )
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getPasswordResetRedirectUrl() {
  const configuredBase = (
    import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL || ''
  )
    .trim()
    .replace(/\/+$/, '')

  const browserBase = typeof window !== 'undefined' ? window.location.origin : ''
  const baseUrl = configuredBase || browserBase

  return `${baseUrl}/reset-password`
}

function maskEmail(value: string) {
  const [name, domain] = value.split('@')

  if (!name || !domain) return value

  const visibleName = name.length <= 2 ? name[0] : `${name.slice(0, 2)}***`
  return `${visibleName}@${domain}`
}

function toFriendlyResetError(message: string, t: Translate) {
  const lower = message.toLowerCase()

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return t('forgot.error.rateLimited')
  }

  if (lower.includes('smtp') || lower.includes('email')) {
    return t('forgot.error.emailService')
  }

  return message || t('forgot.error.generic')
}
