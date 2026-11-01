// src/routes/login.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type LoginMethod = 'email' | 'phone'

function LoginPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()

  const [method, setMethod] = useState<LoginMethod>('email')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [phone, setPhone] = useState('')

  const [checkingSession, setCheckingSession] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (user) {
        await navigate({ to: '/dashboard', replace: true })
        return
      }

      setCheckingSession(false)
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [navigate])

  function resetAlerts() {
    setError('')
    setMessage('')
  }

  function switchMethod(nextMethod: LoginMethod) {
    setMethod(nextMethod)
    resetAlerts()
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAlerts()

    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError(t('login.error.invalidEmail'))
      return
    }

    if (!password.trim()) {
      setError(t('login.error.passwordRequired'))
      return
    }

    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    setLoading(false)

    if (loginError) {
      setError(toFriendlyAuthError(loginError.message, t))
      return
    }

    await navigate({ to: '/dashboard', replace: true })
  }

  async function handlePhoneLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAlerts()

    const phoneNumber = normalizePakistanPhone(phone)

    if (!isValidPakistanMobile(phoneNumber)) {
      setError(t('login.error.invalidPhone'))
      return
    }

    if (!password.trim()) {
      setError(t('login.error.passwordRequired'))
      return
    }

    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      phone: phoneNumber,
      password,
    })

    setLoading(false)

    if (loginError) {
      setError(toFriendlyAuthError(loginError.message, t))
      return
    }

    await navigate({ to: '/dashboard', replace: true })
  }

  if (checkingSession) {
    return (
      <main className="page-main auth-page">
        <div className="page-wrap">
          <div className="rounded-[2rem] border border-[#dce4ee] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              {t('authPage.common.checkingSession')}
            </div>
          </div>
        </div>
      </main>
    )
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
                    {t('login.hero.badge')}
                  </span>
                </div>

                <p className="home-hero-kicker animate-fade-up delay-1">
                  {t('login.hero.kicker')}
                </p>

                <h1 className="home-hero-title text-balance animate-fade-up delay-2">
                  {t('login.hero.title')}
                  <br />
                  <span className="home-hero-accent">{t('login.hero.accent')}</span>
                </h1>

                <div className="home-hero-rule ajrak-rule animate-fade-in delay-2" />

                <p className="home-hero-text text-pretty animate-fade-up delay-3">
                  {t('login.hero.description')}
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <FeaturePill
                    icon={<ShieldCheck size={16} />}
                    title={t('login.feature.protected.title')}
                    text={t('login.feature.protected.text')}
                    delay="delay-2"
                  />
                  <FeaturePill
                    icon={<Smartphone size={16} />}
                    title={t('login.feature.otp.title')}
                    text={t('login.feature.otp.text')}
                    delay="delay-3"
                  />
                  <FeaturePill
                    icon={<CheckCircle2 size={16} />}
                    title={t('login.feature.tools.title')}
                    text={t('login.feature.tools.text')}
                    delay="delay-4"
                  />
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur animate-fade-up delay-4">
                  <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    {t('login.needAccount.label')}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {t('login.needAccount.text')}
                  </p>

                  <div className="mt-4">
                    <Link to="/signup" className="secondary-btn pressable lift-hover">
                      {t('login.needAccount.cta')}
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="soft-panel animate-scale-in rounded-[2rem] border-[#dce4ee] bg-white p-5 shadow-[0_24px_70px_rgba(20,18,16,0.08)] sm:p-7">
            <div className="mb-6">
              <div className="badge-soft bg-[var(--gold-pale)] text-[var(--gold)]">
                <Sparkles size={14} />
                {t('login.form.badge')}
              </div>

              <h2 className="section-title mt-4">{t('login.form.title')}</h2>

              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t('login.form.description')}
              </p>
            </div>

            <div className="mb-6 rounded-[1.25rem] border border-[var(--line)] bg-[var(--paper)] p-1">
              <div className="grid grid-cols-2 gap-1">
                <MethodTab
                  active={method === 'email'}
                  onClick={() => switchMethod('email')}
                  icon={<Mail size={15} />}
                >
                  {t('authPage.common.emailMethod')}
                </MethodTab>

                <MethodTab
                  active={method === 'phone'}
                  onClick={() => switchMethod('phone')}
                  icon={<Smartphone size={15} />}
                >
                  {t('authPage.common.mobilePassword')}
                </MethodTab>
              </div>
            </div>

            {method === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <FormField label={t('authPage.common.email')} htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      resetAlerts()
                    }}
                    required
                    className="input-clean"
                    placeholder={t('login.email.placeholder')}
                  />
                </FormField>

                <FormField label={t('authPage.common.password')} htmlFor="password">
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        resetAlerts()
                      }}
                      required
                      className="input-clean pr-12"
                      placeholder={t('login.password.placeholder')}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-stone-100 hover:text-stone-900"
                      aria-label={showPassword ? t('authPage.common.hidePassword') : t('authPage.common.showPassword')}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </FormField>

                <div className="text-end text-sm">
                  <Link to="/forgot-password" className="font-bold text-[var(--forest)] hover:underline">
                    {t('login.forgotPassword')}
                  </Link>
                </div>

                <AlertBlock error={error} message={message} />

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn pressable w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  {loading ? t('login.submit.loading') : t('login.submit.cta')}
                </button>
              </form>
            ) : null}

            {method === 'phone' ? (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <div className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--paper)] p-4">
                  <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    {t('authPage.common.mobilePassword')}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {t('login.phone.step1Text')}
                  </p>
                </div>

                <FormField label={t('authPage.common.mobileNumber')} htmlFor="phone">
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      resetAlerts()
                    }}
                    required
                    className="input-clean"
                    placeholder="03341013222"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {t('authPage.common.phoneHint')}
                  </p>
                </FormField>

                <FormField label={t('authPage.common.password')} htmlFor="phonePassword">
                  <div className="relative">
                    <input
                      id="phonePassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        resetAlerts()
                      }}
                      required
                      className="input-clean pr-12"
                      placeholder={t('login.password.placeholder')}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-stone-100 hover:text-stone-900"
                      aria-label={showPassword ? t('authPage.common.hidePassword') : t('authPage.common.showPassword')}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </FormField>

                <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                  {t('login.forgotPhoneHint')}{' '}
                  <Link to="/forgot-password" className="font-extrabold text-[var(--forest)] hover:underline">
                    {t('login.forgotPassword')}
                  </Link>
                </div>

                <AlertBlock error={error} message={message} />

                <button
                  type="submit"
                  disabled={loading}
                  className="primary-btn pressable w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  {loading ? t('login.submit.loading') : t('login.submit.cta')}
                </button>
              </form>
            ) : null}

            <p className="mt-6 text-center text-sm text-slate-600">
              {t('login.noAccount')}{' '}
              <Link to="/signup" className="font-bold text-[var(--forest)]">
                {t('login.needAccount.cta')}
              </Link>
            </p>
          </section>
        </section>
      </div>
    </main>
  )
}

function MethodTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-[1rem] px-4 py-3 text-sm font-bold transition ${
        active
          ? 'bg-white text-[var(--forest)] shadow-sm'
          : 'text-stone-600 hover:text-stone-900'
      }`}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
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

function normalizePakistanPhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('0092')) return `+92${digits.slice(4, 14)}`
  if (digits.startsWith('92')) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('0')) return `+92${digits.slice(1, 11)}`
  if (digits.startsWith('3')) return `+92${digits.slice(0, 10)}`

  return digits.startsWith('+') ? digits : `+${digits}`
}

function isValidPakistanMobile(value: string) {
  return /^\+923\d{9}$/.test(value)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function toFriendlyAuthError(message: string, t: (key: TranslationKey) => string) {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return t('login.auth.invalidCredentials')
  }

  if (lower.includes('email not confirmed')) {
    return t('login.auth.emailNotConfirmed')
  }

  if (lower.includes('phone')) {
    return t('login.auth.phoneFailed')
  }

  return message
}