// src/routes/notifications.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getSafeNotificationActionUrl,
  getNotificationTone,
  type UserNotification,
} from '../lib/notifications'
import { useI18n, type AppLanguage } from '../lib/i18n'
import { mobileUxCopy, type MobileUxCopy } from '../lib/i18n/mobile-ux-copy'
import { supabase } from '../lib/supabase/client'
import { isTransportFailure, networkFailureMessage, retryTransportRead } from '../lib/network-recovery'
import { networkRecoveryCopy } from '../lib/i18n/network-recovery-copy'

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})

const NOTIFICATIONS_PAGE_SIZE = 50

function NotificationsPage() {
  const navigate = useNavigate()
  const { language, direction } = useI18n()
  const text = mobileUxCopy[language].notifications
  const networkText = networkRecoveryCopy[language]
  const [items, setItems] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [message, setMessage] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const latestRead = useRef(0)
  const activeRead = useRef<AbortController | null>(null)

  useEffect(() => {
    void loadNotifications()
    return () => {
      latestRead.current += 1
      activeRead.current?.abort()
    }
  }, [])

  async function loadNotifications(options?: { silent?: boolean; append?: boolean }) {
    const requestId = ++latestRead.current
    activeRead.current?.abort()
    const controller = new AbortController()
    activeRead.current = controller
    const silent = options?.silent ?? false
    const append = options?.append ?? false
    const from = append ? items.length : 0
    const to = from + NOTIFICATIONS_PAGE_SIZE - 1

    if (append) setLoadingMore(true)
    else if (silent) setRefreshing(true)
    else setLoading(true)
    setMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (requestId !== latestRead.current) return
      // Losing access to the network is not evidence of an expired session.
      if (userError && isTransportFailure(userError)) throw userError
      if (userError || !user) {
        await navigate({ to: '/login', replace: true })
        return
      }

      // Retry the *read-only* GET once on a transport failure. Updates that mark
      // notifications read and Mark All Read are NEVER automatically retried.
      const { data, count } = await retryTransportRead(async () => {
        const result = await supabase
          .from('notifications')
          .select(
            'id, user_id, title, message, category, related_type, related_id, action_url, is_read, read_at, created_at',
            { count: 'exact' },
          )
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to)
        if (result.error) throw result.error
        return result
      }, { signal: controller.signal })
      if (requestId !== latestRead.current) return

      const nextItems = (data || []) as UserNotification[]
      const nextCount = count ?? (append ? items.length + nextItems.length : nextItems.length)
      const mergedItems = append ? [...items, ...nextItems] : nextItems
      const unreadIds = nextItems.filter((item) => !item.is_read).map((item) => item.id)

      setItems(mergedItems)
      setTotalCount(nextCount)
      setHasMore(mergedItems.length < nextCount)

      if (unreadIds.length > 0) {
        const readAt = new Date().toISOString()
        const { error: readError } = await supabase
          .from('notifications')
          .update({ is_read: true, read_at: readAt })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .in('id', unreadIds)

        if (requestId !== latestRead.current) return
        if (readError) {
          setMessage(networkFailureMessage(readError, networkText.readFailed))
          return
        }
        const unreadIdSet = new Set(unreadIds)
        setItems((current) => current.map((item) =>
          unreadIdSet.has(item.id) ? { ...item, is_read: true, read_at: item.read_at || readAt } : item,
        ))
        window.dispatchEvent(new CustomEvent('jas-notifications-updated'))
      }
    } catch (error) {
      if (requestId !== latestRead.current) return
      // Retain the last successful list/counts for refresh and pagination errors.
      // Only an initial read starts from an empty state.
      setMessage(networkFailureMessage(error, networkText.readFailed))
    } finally {
      if (requestId === latestRead.current) {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
        if (activeRead.current === controller) activeRead.current = null
      }
    }
  }

  async function markAllRead() {
    setMarkingAllRead(true)
    setMessage('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setMessage(networkFailureMessage(userError, networkText.readFailed))
        return
      }

      const readAt = new Date().toISOString()
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('user_id', user.id)
        .eq('is_read', false)

      // Never automatically repeat this write after a timeout: the first request
      // may already have succeeded on the server even if its response was lost.
      if (error) {
        setMessage(networkFailureMessage(error, networkText.readFailed))
        return
      }
      setItems((current) => current.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || readAt,
      })))
      window.dispatchEvent(new CustomEvent('jas-notifications-updated'))
    } catch (error) {
      setMessage(networkFailureMessage(error, networkText.readFailed))
    } finally {
      setMarkingAllRead(false)
    }
  }

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  )

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10" dir={direction}>
        <div className="page-wrap rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {text.loading}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 md:py-10" dir={direction}>
      <div className="page-wrap space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-amber-200">
                  <Bell className="h-4 w-4" />
                  {text.eyebrow}
                </div>
                <h1 className="mt-5 text-4xl font-black md:text-6xl">
                  {text.title}
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
                  {text.subtitle}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAllRead || totalCount === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {markingAllRead ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {text.markAllRead}
                </button>
                <button
                  type="button"
                  onClick={() => void loadNotifications({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  {text.refresh}
                </button>
                <Link
                  to="/notification-preferences"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white no-underline transition hover:bg-white/20 visited:text-white"
                >
                  <Settings className="h-4 w-4" />
                  {text.preferences}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
            <StatCard title={text.totalUpdates} value={totalCount} />
            <StatCard title={text.unreadLoaded} value={unreadCount} />
            <StatCard title={text.loaded} value={items.length} />
          </div>
        </section>

        {message ? (
          <div role="alert" className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <span className="min-w-0 flex-1">{message}</span>
            {!items.length ? (
              <button type="button" onClick={() => void loadNotifications()} className="min-h-11 rounded-xl border border-red-300 bg-white px-4 text-sm font-bold text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label={networkText.tryAgain}>
                {networkText.tryAgain}
              </button>
            ) : null}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {items.length ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                <span>
                  {text.showingLatest
                    .replace('{shown}', String(items.length))
                    .replace('{total}', String(totalCount || items.length))}
                </span>
                {refreshing ? <span>{text.refreshing}</span> : null}
              </div>

              <div className="grid gap-4">
                {items.map((item) => (
                  <NotificationCard key={item.id} item={item} language={language} text={text} />
                ))}
              </div>

              {hasMore ? (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => void loadNotifications({ append: true })}
                    disabled={loadingMore}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {text.loadingMore}
                      </>
                    ) : (
                      text.loadMore
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 p-10 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                {text.emptyTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
                {text.emptyText}
              </p>
              <Link to="/dashboard" className="secondary-btn mt-6">
                {text.backDashboard}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function NotificationCard({
  item,
  language,
  text,
}: {
  item: UserNotification
  language: AppLanguage
  text: MobileUxCopy['notifications']
}) {
  const safeActionUrl = getSafeNotificationActionUrl(
    item.action_url,
    typeof window !== 'undefined' ? window.location.origin : undefined,
  )
  const categoryLabel = text.categories[item.category] ?? text.categories.general

  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm ${
        item.is_read ? 'bg-white opacity-80' : 'bg-white'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getNotificationTone(
                item.category,
              )}`}
            >
              {categoryLabel}
            </span>
            {!item.is_read ? (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                {text.newLabel}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-xl font-black text-slate-950">
            {item.title}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-slate-600">
            {item.message}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
            {formatNotificationDateForLanguage(item.created_at, language, text.unavailableDate)}
          </p>
        </div>

        {safeActionUrl ? (
          <a
            href={safeActionUrl}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-900 px-4 text-sm font-black text-white no-underline shadow-sm ring-1 ring-emerald-900/10 transition hover:bg-emerald-800 visited:text-white"
          >
            {text.open}
          </a>
        ) : null}
      </div>
    </article>
  )
}

function formatNotificationDateForLanguage(
  value: string | null | undefined,
  language: AppLanguage,
  unavailable: string,
) {
  if (!value) return unavailable
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return unavailable
  const locale = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-GB'

  return date.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}
