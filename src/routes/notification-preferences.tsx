import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Laptop,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getDeviceLabel,
  maskPushEndpoint,
  normalizeNotificationPreferences,
  supportsWebPush,
  urlBase64ToUint8Array,
  type NotificationPreferenceValues,
  type PushSubscriptionRow,
} from '../lib/web-push'

export const Route = createFileRoute('/notification-preferences')({
  component: NotificationPreferencesPage,
})

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined

type PreferenceState = NotificationPreferenceValues

type PushSubscriptionJson = {
  endpoint?: string
  keys?: {
    p256dh?: string
    auth?: string
  }
}

function NotificationPreferencesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [browserAction, setBrowserAction] = useState(false)
  const [preferences, setPreferences] = useState<PreferenceState>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  })
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionRow[]>([])
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const browserSupported = useMemo(() => supportsWebPush(), [])
  const pushConfigured = Boolean(VAPID_PUBLIC_KEY)
  const canUseBrowserPush =
    browserSupported && pushConfigured && !import.meta.env.DEV

  useEffect(() => {
    void loadPreferences()
  }, [])

  async function loadPreferences(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await navigate({ to: '/login', replace: true })
      return
    }

    const [{ data: preferenceRow, error: preferenceError }, subscriptionResult] =
      await Promise.all([
        supabase
          .from('notification_preferences')
          .select(
            'user_id, web_push_enabled, membership_updates, program_updates, finance_updates, general_updates, created_at, updated_at',
          )
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('push_subscriptions')
          .select(
            'id, user_id, endpoint, p256dh, auth, user_agent, device_label, enabled, failure_count, last_seen_at, last_success_at, last_failure_at, disabled_at, disabled_reason, created_at, updated_at',
          )
          .eq('user_id', user.id)
          .order('last_seen_at', { ascending: false }),
      ])

    if (preferenceError) {
      setError(migrationMessage(preferenceError.message))
    } else {
      setPreferences(normalizeNotificationPreferences(preferenceRow))
    }

    if (subscriptionResult.error) {
      setError(migrationMessage(subscriptionResult.error.message))
      setSubscriptions([])
    } else {
      setSubscriptions((subscriptionResult.data || []) as PushSubscriptionRow[])
    }

    if (browserSupported) {
      setPermission(Notification.permission)
    }

    if (browserSupported && !import.meta.env.DEV) {
      try {
        const registration = await navigator.serviceWorker.ready
        const browserSubscription =
          await registration.pushManager.getSubscription()
        setCurrentEndpoint(browserSubscription?.endpoint || null)
      } catch {
        setCurrentEndpoint(null)
      }
    }

    setLoading(false)
  }

  async function savePreferences(nextPreferences = preferences) {
    setSaving(true)
    setError('')
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Please login again before saving notification preferences.')
      setSaving(false)
      return
    }

    const { error: saveError } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...nextPreferences,
        },
        { onConflict: 'user_id' },
      )

    if (saveError) {
      setError(migrationMessage(saveError.message))
    } else {
      setPreferences(nextPreferences)
      setMessage('Notification preferences saved.')
      window.dispatchEvent(
        new CustomEvent('jas-web-push-preferences-updated'),
      )
    }

    setSaving(false)
  }

  async function enableCurrentBrowser() {
    if (!VAPID_PUBLIC_KEY) {
      setError('VITE_VAPID_PUBLIC_KEY is not configured.')
      return
    }

    if (!canUseBrowserPush) {
      setError(
        import.meta.env.DEV
          ? 'Browser push registration is available on the production HTTPS app.'
          : 'This browser does not support secure web push notifications.',
      )
      return
    }

    setBrowserAction(true)
    setError('')
    setMessage('')

    try {
      const requestedPermission = await Notification.requestPermission()
      setPermission(requestedPermission)

      if (requestedPermission !== 'granted') {
        setError(
          requestedPermission === 'denied'
            ? 'Browser notification permission is blocked. Enable it from the browser site settings.'
            : 'Notification permission was not granted.',
        )
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Please login again before enabling browser notifications.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      let browserSubscription =
        await registration.pushManager.getSubscription()

      if (!browserSubscription) {
        browserSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      const json = browserSubscription.toJSON() as PushSubscriptionJson
      const endpoint = browserSubscription.endpoint || json.endpoint
      const p256dh = json.keys?.p256dh
      const auth = json.keys?.auth

      if (!endpoint || !p256dh || !auth) {
        setError('Browser returned an incomplete push subscription.')
        return
      }

      const now = new Date().toISOString()
      const { error: subscriptionError } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            device_label: getDeviceLabel(navigator.userAgent),
            enabled: true,
            failure_count: 0,
            last_seen_at: now,
            disabled_at: null,
            disabled_reason: null,
          },
          { onConflict: 'user_id,endpoint' },
        )

      if (subscriptionError) {
        setError(migrationMessage(subscriptionError.message))
        return
      }

      const nextPreferences = {
        ...preferences,
        web_push_enabled: true,
      }
      const { error: preferenceError } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...nextPreferences,
          },
          { onConflict: 'user_id' },
        )

      if (preferenceError) {
        setError(migrationMessage(preferenceError.message))
        return
      }

      setCurrentEndpoint(endpoint)
      setPreferences(nextPreferences)
      setMessage('Browser notifications enabled for this device.')
      await loadPreferences({ silent: true })
      window.dispatchEvent(
        new CustomEvent('jas-web-push-preferences-updated'),
      )
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to enable browser notifications.',
      )
    } finally {
      setBrowserAction(false)
    }
  }

  async function removeCurrentBrowser() {
    if (!browserSupported) return

    setBrowserAction(true)
    setError('')
    setMessage('')

    try {
      const registration = await navigator.serviceWorker.ready
      const browserSubscription =
        await registration.pushManager.getSubscription()

      if (!browserSubscription) {
        setCurrentEndpoint(null)
        setMessage('This browser is not currently subscribed.')
        return
      }

      const endpoint = browserSubscription.endpoint
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          enabled: false,
          disabled_at: new Date().toISOString(),
          disabled_reason: 'user_removed_device',
        })
        .eq('endpoint', endpoint)

      if (updateError) {
        setError(migrationMessage(updateError.message))
        return
      }

      await browserSubscription.unsubscribe()
      setCurrentEndpoint(null)
      setMessage('This browser was removed from push notifications.')
      await loadPreferences({ silent: true })
      window.dispatchEvent(
        new CustomEvent('jas-web-push-preferences-updated'),
      )
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to remove this browser subscription.',
      )
    } finally {
      setBrowserAction(false)
    }
  }

  async function disableAllDevices() {
    setBrowserAction(true)
    setError('')
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Please login again before disabling devices.')
      setBrowserAction(false)
      return
    }

    const now = new Date().toISOString()
    const [subscriptionUpdate, preferenceUpdate] = await Promise.all([
      supabase
        .from('push_subscriptions')
        .update({
          enabled: false,
          disabled_at: now,
          disabled_reason: 'user_disabled_all_devices',
        })
        .eq('user_id', user.id),
      supabase.from('notification_preferences').upsert(
        {
          user_id: user.id,
          ...preferences,
          web_push_enabled: false,
        },
        { onConflict: 'user_id' },
      ),
    ])

    if (subscriptionUpdate.error || preferenceUpdate.error) {
      setError(
        migrationMessage(
          subscriptionUpdate.error?.message || preferenceUpdate.error?.message || '',
        ),
      )
      setBrowserAction(false)
      return
    }

    if (browserSupported && !import.meta.env.DEV) {
      try {
        const registration = await navigator.serviceWorker.ready
        const browserSubscription =
          await registration.pushManager.getSubscription()
        await browserSubscription?.unsubscribe()
      } catch {
        // Database state is authoritative even if browser unsubscribe fails.
      }
    }

    setPreferences((current) => ({
      ...current,
      web_push_enabled: false,
    }))
    setCurrentEndpoint(null)
    setMessage('Web push paused and all saved browser devices disabled.')
    await loadPreferences({ silent: true })
    window.dispatchEvent(
      new CustomEvent('jas-web-push-preferences-updated'),
    )
    setBrowserAction(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="page-wrap rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading notification preferences...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-10">
      <div className="page-wrap space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-amber-200">
                  <ShieldCheck className="h-4 w-4" />
                  Notification Control
                </div>
                <h1 className="mt-5 text-4xl font-black md:text-6xl">
                  Push Preferences
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
                  Choose which JAS updates can reach your browser and manage all
                  devices linked with your account.
                </p>
              </div>

              <Link
                to="/notifications"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white no-underline transition hover:bg-white/20 visited:text-white"
              >
                View Notifications
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Browser channel
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Web push notifications
                </h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  Pausing push keeps in-app notifications active. Removing a
                  device deletes only that browser subscription.
                </p>
              </div>
              {preferences.web_push_enabled ? (
                <Bell className="h-7 w-7 text-emerald-700" />
              ) : (
                <BellOff className="h-7 w-7 text-slate-400" />
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <StatusPill
                label="Browser support"
                value={browserSupported ? 'Supported' : 'Not supported'}
                good={browserSupported}
              />
              <StatusPill
                label="Permission"
                value={permission}
                good={permission === 'granted'}
              />
              <StatusPill
                label="Push configuration"
                value={pushConfigured ? 'Configured' : 'Missing public key'}
                good={pushConfigured}
              />
              <StatusPill
                label="Current device"
                value={currentEndpoint ? 'Subscribed' : 'Not subscribed'}
                good={Boolean(currentEndpoint)}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void enableCurrentBrowser()}
                disabled={browserAction || !canUseBrowserPush}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {browserAction ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                Enable this browser
              </button>
              <button
                type="button"
                onClick={() => void removeCurrentBrowser()}
                disabled={browserAction || !currentEndpoint}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Remove this browser
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Delivery categories
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Choose important updates
            </h2>

            <div className="mt-5 space-y-3">
              <PreferenceToggle
                label="Enable browser push"
                description="Master switch for every web push category."
                checked={preferences.web_push_enabled}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    web_push_enabled: checked,
                  }))
                }
              />
              <PreferenceToggle
                label="Membership updates"
                description="Application, card, payment and profile decisions."
                checked={preferences.membership_updates}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    membership_updates: checked,
                  }))
                }
              />
              <PreferenceToggle
                label="Program updates"
                description="Education, health, welfare and employment cases."
                checked={preferences.program_updates}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    program_updates: checked,
                  }))
                }
              />
              <PreferenceToggle
                label="Finance updates"
                description="Donation and finance-related status alerts."
                checked={preferences.finance_updates}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    finance_updates: checked,
                  }))
                }
              />
              <PreferenceToggle
                label="General announcements"
                description="Organization notices and general campaigns."
                checked={preferences.general_updates}
                onChange={(checked) =>
                  setPreferences((current) => ({
                    ...current,
                    general_updates: checked,
                  }))
                }
              />
            </div>

            <button
              type="button"
              onClick={() => void savePreferences()}
              disabled={saving}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save preferences
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Saved devices
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Browser subscriptions
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Endpoints and encryption keys are never displayed in full.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadPreferences({ silent: true })}
                disabled={browserAction}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void disableAllDevices()}
                disabled={browserAction || subscriptions.length === 0}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BellOff className="h-4 w-4" />
                Disable all devices
              </button>
            </div>
          </div>

          {subscriptions.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {subscriptions.map((subscription) => (
                <article
                  key={subscription.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {/Android|iPhone|iPad/i.test(
                        subscription.user_agent || '',
                      ) ? (
                        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      ) : (
                        <Laptop className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-slate-950">
                          {subscription.device_label ||
                            getDeviceLabel(subscription.user_agent)}
                        </h3>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                          {maskPushEndpoint(subscription.endpoint)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        subscription.enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {subscription.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <DeviceMetric
                      label="Failures"
                      value={String(subscription.failure_count)}
                    />
                    <DeviceMetric
                      label="Last seen"
                      value={formatCompactDate(subscription.last_seen_at)}
                    />
                    <DeviceMetric
                      label="Last success"
                      value={formatCompactDate(subscription.last_success_at)}
                    />
                    <DeviceMetric
                      label="Last failure"
                      value={formatCompactDate(subscription.last_failure_at)}
                    />
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center">
              <BellOff className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-700">
                No browser devices are registered yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span>
        <span className="block text-sm font-black text-slate-900">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-emerald-700"
      />
    </label>
  )
}

function StatusPill({
  label,
  value,
  good,
}: {
  label: string
  value: string
  good: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-sm font-black ${
          good ? 'text-emerald-700' : 'text-slate-600'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function DeviceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <dt className="font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 font-bold text-slate-700">{value}</dd>
    </div>
  )
}

function formatCompactDate(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function migrationMessage(message: string) {
  return /notification_preferences|web_push_deliveries|device_label|failure_count/i.test(
    message,
  )
    ? 'Apply migration 20260711010000_web_push_reliability_preferences.sql before using notification preferences.'
    : message
}
