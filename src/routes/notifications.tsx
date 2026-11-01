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
import { useEffect, useMemo, useState } from 'react'
import {
  formatNotificationDate,
  getSafeNotificationActionUrl,
  getNotificationCategoryLabel,
  getNotificationTone,
  type UserNotification,
} from '../lib/notifications'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})

const NOTIFICATIONS_PAGE_SIZE = 50

function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<UserNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [message, setMessage] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    void loadNotifications()
  }, [])

  async function loadNotifications(options?: { silent?: boolean; append?: boolean }) {
    const silent = options?.silent ?? false
    const append = options?.append ?? false
    const from = append ? items.length : 0
    const to = from + NOTIFICATIONS_PAGE_SIZE - 1

    if (append) setLoadingMore(true)
    else if (silent) setRefreshing(true)
    else setLoading(true)

    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await navigate({ to: '/login', replace: true })
      return
    }

    const { data, error, count } = await supabase
      .from('notifications')
      .select(
        'id, user_id, title, message, category, related_type, related_id, action_url, is_read, read_at, created_at',
        { count: 'exact' },
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      setMessage(error.message)
      if (!append) setItems([])
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
      return
    }

    const nextItems = (data || []) as UserNotification[]
    const readAt = new Date().toISOString()
    const hasUnreadItems = nextItems.some((item) => !item.is_read)
    const displayItems = nextItems.map((item) =>
      item.is_read
        ? item
        : {
            ...item,
            is_read: true,
            read_at: item.read_at || readAt,
          },
    )
    const nextCount = count ?? (append ? items.length + displayItems.length : displayItems.length)
    const mergedItems = append ? [...items, ...displayItems] : displayItems

    setItems(mergedItems)
    setTotalCount(nextCount)
    setHasMore(mergedItems.length < nextCount)
    setLoading(false)
    setRefreshing(false)
    setLoadingMore(false)

    if (hasUnreadItems) {
      const { error: readError } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: readAt })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (readError) {
        setMessage(readError.message)
      }
    }

    window.dispatchEvent(new CustomEvent('jas-notifications-updated'))
  }

  async function markAllRead() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      setMessage(error.message)
      return
    }

    setItems((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || new Date().toISOString(),
      })),
    )
    window.dispatchEvent(new CustomEvent('jas-notifications-updated'))
  }

  const unreadCount = useMemo(
    () => items.filter((item) => !item.is_read).length,
    [items],
  )

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="page-wrap rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading notifications...
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
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-amber-200">
                  <Bell className="h-4 w-4" />
                  In-app Updates
                </div>
                <h1 className="mt-5 text-4xl font-black md:text-6xl">
                  Notifications
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/70">
                  Program status, donation verification aur important member
                  updates yahan show honge.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark all read
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
                  Refresh
                </button>
                <Link
                  to="/notification-preferences"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white no-underline transition hover:bg-white/20 visited:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Preferences
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
            <StatCard title="Total Updates" value={totalCount} />
            <StatCard title="Unread" value={unreadCount} />
            <StatCard title="Loaded" value={items.length} />
          </div>
        </section>

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <span>{message}</span>
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {items.length ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                <span>
                  Showing latest {items.length} of {totalCount || items.length} notifications
                </span>
                {refreshing ? <span>Refreshing...</span> : null}
              </div>

              <div className="grid gap-4">
                {items.map((item) => (
                  <NotificationCard key={item.id} item={item} />
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
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 p-10 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                No notifications yet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
                Jab admin aapki application, case ya donation status update karega
                to notification yahan show hogi.
              </p>
              <Link to="/dashboard" className="secondary-btn mt-6">
                Back to Dashboard
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function NotificationCard({ item }: { item: UserNotification }) {
  const safeActionUrl = getSafeNotificationActionUrl(
    item.action_url,
    typeof window !== 'undefined' ? window.location.origin : undefined,
  )

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
              {getNotificationCategoryLabel(item.category)}
            </span>
            {!item.is_read ? (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                New
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
            {formatNotificationDate(item.created_at)}
          </p>
        </div>

        {safeActionUrl ? (
          <a
            href={safeActionUrl}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-900 px-4 text-sm font-black text-white no-underline shadow-sm ring-1 ring-emerald-900/10 transition hover:bg-emerald-800 visited:text-white"
          >
            Open
          </a>
        ) : null}
      </div>
    </article>
  )
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
