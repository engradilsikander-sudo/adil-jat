import { EmailDeliveryHealth } from '../../components/admin/EmailDeliveryHealth'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AdminShell } from '../../components/admin/AdminShell'
import { sindhDistricts, talukasByDistrict } from '../../lib/register/registration-options'
import { supabase } from '../../lib/supabase/client'
import {
  cleanPushActionUrl,
  getPushDeliveryStatusLabel,
} from '../../lib/web-push'

export const Route = createFileRoute('/admin/notifications')({
  component: AdminNotificationsPage,
})

type CampaignRow = {
  id: string
  title: string
  message: string
  category: string
  action_url: string
  target_status: string
  target_district: string | null
  target_taluka: string | null
  recipient_limit: number
  recipient_count: number
  push_delivery_count: number
  created_by: string | null
  created_at: string
}

type DeliveryRow = {
  id: string
  notification_id: string
  user_id: string
  subscription_id: string
  status: string
  attempts: number
  next_attempt_at: string
  last_attempt_at: string | null
  sent_at: string | null
  failed_at: string | null
  http_status: number | null
  last_error: string | null
  created_at: string
  updated_at: string
}

type CampaignResult = {
  campaign_id?: string
  recipient_count?: number
  push_delivery_count?: number
  limited_to?: number
}

const categoryOptions = [
  ['general', 'General announcement'],
  ['membership', 'Membership'],
  ['education', 'Education'],
  ['health', 'Health'],
  ['welfare', 'Welfare'],
  ['employment', 'Employment'],
  ['donation', 'Donation'],
  ['finance', 'Finance'],
] as const

const statusOptions = [
  ['approved', 'Approved members'],
  ['pending', 'Pending members'],
  ['rejected', 'Rejected applications'],
  ['all', 'All member records'],
] as const

function AdminNotificationsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    title: '',
    message: '',
    category: 'general',
    actionUrl: '/notifications',
    memberStatus: 'approved',
    district: '',
    taluka: '',
    recipientLimit: '500',
  })

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData(options?: { silent?: boolean }) {
    if (options?.silent) setRefreshing(true)
    else setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await navigate({ to: '/login', replace: true })
      return
    }

    const { data: roleRows, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])

    if (roleError || !roleRows?.length) {
      await navigate({ to: '/dashboard', replace: true })
      return
    }

    const [campaignResult, deliveryResult] = await Promise.all([
      supabase
        .from('notification_campaigns')
        .select(
          'id, title, message, category, action_url, target_status, target_district, target_taluka, recipient_limit, recipient_count, push_delivery_count, created_by, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('web_push_deliveries')
        .select(
          'id, notification_id, user_id, subscription_id, status, attempts, next_attempt_at, last_attempt_at, sent_at, failed_at, http_status, last_error, created_at, updated_at',
        )
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    if (campaignResult.error || deliveryResult.error) {
      setError(
        migrationMessage(
          campaignResult.error?.message || deliveryResult.error?.message || '',
        ),
      )
      setCampaigns([])
      setDeliveries([])
    } else {
      setCampaigns((campaignResult.data || []) as CampaignRow[])
      setDeliveries((deliveryResult.data || []) as DeliveryRow[])
    }

    setLoading(false)
    setRefreshing(false)
  }

  const deliveryStats = useMemo(() => {
    const totals = {
      total: deliveries.length,
      pending: 0,
      sent: 0,
      failed: 0,
      dead: 0,
    }

    deliveries.forEach((delivery) => {
      if (delivery.status === 'sent') totals.sent += 1
      else if (delivery.status === 'dead') totals.dead += 1
      else if (delivery.status === 'failed') totals.failed += 1
      else if (delivery.status === 'queued' || delivery.status === 'sending') {
        totals.pending += 1
      }
    })

    return totals
  }, [deliveries])

  const failedDeliveries = useMemo(
    () =>
      deliveries
        .filter((delivery) =>
          ['failed', 'dead'].includes(delivery.status),
        )
        .slice(0, 50),
    [deliveries],
  )

  const talukaOptions = form.district
    ? talukasByDistrict[form.district] || []
    : []

  async function sendCampaign() {
    const title = form.title.trim()
    const message = form.message.trim()
    const recipientLimit = Number(form.recipientLimit)

    if (title.length < 3) {
      setError('Title must contain at least 3 characters.')
      return
    }

    if (message.length < 5) {
      setError('Message must contain at least 5 characters.')
      return
    }

    if (!Number.isInteger(recipientLimit) || recipientLimit < 1 || recipientLimit > 1000) {
      setError('Recipient limit must be a whole number from 1 to 1000.')
      return
    }

    const target = [
      statusOptions.find(([value]) => value === form.memberStatus)?.[1],
      form.taluka || form.district,
    ]
      .filter(Boolean)
      .join(' · ')

    if (
      !window.confirm(
        `Send this in-app and browser notification campaign to ${target || 'the selected members'}?`,
      )
    ) {
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    const { data, error: sendError } = await supabase.rpc(
      'admin_send_bulk_notification',
      {
        _title: title,
        _message: message,
        _category: form.category,
        _action_url: cleanPushActionUrl(form.actionUrl),
        _member_status: form.memberStatus,
        _district: form.district || undefined,
        _taluka: form.taluka || undefined,
        _recipient_limit: recipientLimit,
      },
    )

    if (sendError) {
      setError(migrationMessage(sendError.message))
      setSending(false)
      return
    }

    const result = (data || {}) as CampaignResult
    setSuccess(
      `Campaign created for ${result.recipient_count || 0} members. ${result.push_delivery_count || 0} browser deliveries entered the reliable queue.`,
    )
    setForm((current) => ({
      ...current,
      title: '',
      message: '',
    }))
    await loadData({ silent: true })
    setSending(false)
  }

  async function retryDelivery(deliveryId: string) {
    setRetryingId(deliveryId)
    setError('')
    setSuccess('')

    const { data, error: retryError } = await supabase.rpc(
      'retry_web_push_delivery',
      { _delivery_id: deliveryId },
    )

    if (retryError) {
      setError(retryError.message)
    } else if (!data) {
      setError(
        'Delivery could not be retried. The browser subscription may be disabled or expired.',
      )
    } else {
      setSuccess('Delivery returned to the queue for the next worker run.')
      await loadData({ silent: true })
    }

    setRetryingId(null)
  }

  if (loading) {
    return (
      <AdminShell
        title="Notification Center"
        subtitle="Bulk campaigns, browser push delivery health and retry logs."
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading notification center...
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Notification Center"
      subtitle="Send controlled member campaigns and monitor the reliable web push queue."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-amber-200">
                  <BellRing className="h-4 w-4" />
                  Phase 9 Push Operations
                </div>
                <h1 className="mt-5 text-4xl font-black md:text-5xl">
                  Notification Center
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
                  Campaigns create in-app notifications first. Eligible browser
                  subscriptions are queued with retries, rate limits and failure
                  tracking. Bulk campaign emails are intentionally suppressed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadData({ silent: true })}
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5 md:p-6">
            <StatCard title="Recent Deliveries" value={deliveryStats.total} icon={<BellRing />} />
            <StatCard title="Queued / Sending" value={deliveryStats.pending} icon={<Clock3 />} />
            <StatCard title="Sent" value={deliveryStats.sent} icon={<CheckCircle2 />} />
            <StatCard title="Retry Pending" value={deliveryStats.failed} icon={<RotateCcw />} />
            <StatCard title="Dead" value={deliveryStats.dead} icon={<XCircle />} />
          </div>
        </section>

        <EmailDeliveryHealth />

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-1 h-6 w-6 text-emerald-700" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Admin bulk sender
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Create member campaign
                </h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  Maximum 1,000 recipients per campaign. Members who paused a
                  category still receive the in-app record but no browser push.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Title
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={100}
                  className="h-11 rounded-xl border border-slate-300 px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Important JAS member update"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Message
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  maxLength={500}
                  rows={5}
                  className="rounded-xl border border-slate-300 px-4 py-3 font-semibold leading-7 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Write a clear, action-oriented notification message."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Category"
                  value={form.category}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, category: value }))
                  }
                  options={categoryOptions}
                />
                <SelectField
                  label="Member status"
                  value={form.memberStatus}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      memberStatus: value,
                    }))
                  }
                  options={statusOptions}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  District (optional)
                  <select
                    value={form.district}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        district: event.target.value,
                        taluka: '',
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  >
                    <option value="">All districts</option>
                    {sindhDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Taluka (optional)
                  <select
                    value={form.taluka}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        taluka: event.target.value,
                      }))
                    }
                    disabled={!form.district}
                    className="h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
                  >
                    <option value="">All talukas</option>
                    {talukaOptions.map((taluka) => (
                      <option key={taluka} value={taluka}>
                        {taluka}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Open URL
                  <input
                    value={form.actionUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        actionUrl: event.target.value,
                      }))
                    }
                    maxLength={300}
                    className="h-11 rounded-xl border border-slate-300 px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    placeholder="/notifications"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Recipient limit
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.recipientLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        recipientLimit: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border border-slate-300 px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => void sendCampaign()}
                disabled={sending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Create campaign
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-1 h-6 w-6 text-amber-700" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Operational safeguards
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Delivery rules
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm font-semibold leading-7 text-slate-600">
              <Rule text="Only admin and super admin can create a bulk campaign." />
              <Rule text="The protected worker secret never enters browser code." />
              <Rule text="Database claims enforce a global per-minute delivery limit." />
              <Rule text="Temporary provider failures retry up to five times." />
              <Rule text="Expired 404/410 subscriptions are automatically disabled." />
              <Rule text="Failure logs never expose endpoints or encryption keys in this UI." />
              <Rule text="Campaigns create in-app + push only; bulk email is suppressed." />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-700" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                Campaign history
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Recent sends
              </h2>
            </div>
          </div>

          {campaigns.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-3 py-3">Campaign</th>
                    <th className="px-3 py-3">Audience</th>
                    <th className="px-3 py-3">Recipients</th>
                    <th className="px-3 py-3">Push queued</th>
                    <th className="px-3 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-4">
                        <p className="font-black text-slate-900">{campaign.title}</p>
                        <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-500">
                          {campaign.message}
                        </p>
                      </td>
                      <td className="px-3 py-4 font-semibold text-slate-600">
                        {formatAudience(campaign)}
                      </td>
                      <td className="px-3 py-4 font-black text-slate-900">
                        {campaign.recipient_count}
                      </td>
                      <td className="px-3 py-4 font-black text-emerald-700">
                        {campaign.push_delivery_count}
                      </td>
                      <td className="px-3 py-4 text-xs font-bold text-slate-500">
                        {formatDate(campaign.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="No notification campaigns have been created yet." />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-700" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">
                Failed delivery log
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Retry and permanent failures
              </h2>
            </div>
          </div>

          {failedDeliveries.length ? (
            <div className="mt-5 grid gap-3">
              {failedDeliveries.map((delivery) => (
                <article
                  key={delivery.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            delivery.status === 'dead'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {getPushDeliveryStatusLabel(delivery.status)}
                        </span>
                        <span className="text-xs font-black text-slate-500">
                          Attempt {delivery.attempts}/5
                        </span>
                        {delivery.http_status ? (
                          <span className="text-xs font-black text-slate-500">
                            HTTP {delivery.http_status}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm font-bold text-slate-700">
                        {delivery.last_error || 'No provider error message recorded.'}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        Delivery {delivery.id.slice(0, 8)}… · Updated {formatDate(delivery.updated_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void retryDelivery(delivery.id)}
                      disabled={retryingId === delivery.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {retryingId === delivery.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Retry
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState text="No retry-pending or permanent failures in the latest 500 deliveries." />
          )}
        </section>
      </div>
    </AdminShell>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly (readonly [string, string])[]
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3 text-emerald-700">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          {title}
        </p>
        <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />
      <span>{text}</span>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  )
}

function formatAudience(campaign: CampaignRow) {
  return [
    campaign.target_status === 'all'
      ? 'All statuses'
      : `${campaign.target_status} members`,
    campaign.target_taluka || campaign.target_district,
  ]
    .filter(Boolean)
    .join(' · ')
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function migrationMessage(message: string) {
  return /notification_campaigns|web_push_deliveries|admin_send_bulk_notification|retry_web_push_delivery/i.test(
    message,
  )
    ? 'Apply migration 20260711010000_web_push_reliability_preferences.sql before using the notification center.'
    : message
}
