import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FilePenLine,
  ImageOff,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from '../../lib/area-permissions'
import {
  formatProfileUpdateValue,
  getProfileUpdateChangedFields,
  getProfileUpdateStatusClass,
  getProfileUpdateStatusLabel,
  parseProfileUpdateChanges,
  type ProfileUpdateRequest,
  type ProfileUpdateStatus,
} from '../../lib/profile-update'
import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../lib/supabase/database.types'
import { formatDisplayDate } from '../../lib/shared/formatters'

export const Route = createFileRoute('/admin/profile-update-requests')({
  component: AdminProfileUpdateRequestsPage,
})

type StatusFilter = 'all' | ProfileUpdateStatus

type AdminRole = 'admin' | 'super_admin' | 'membership_admin'

const adminRoles: AdminRole[] = ['admin', 'super_admin', 'membership_admin']

function AdminProfileUpdateRequestsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [search, setSearch] = useState('')
  const [showSensitive, setShowSensitive] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [areaNotice, setAreaNotice] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void loadRequests()
  }, [])

  async function loadRequests(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (silent) setRefreshing(true)
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
      .in('role', adminRoles)

    const roles = (roleRows ?? [])
      .map((row) => row.role)
      .filter((role): role is AdminRole =>
        adminRoles.includes(role as AdminRole),
      )

    if (roleError || !roles.length) {
      await navigate({ to: '/dashboard', replace: true })
      return
    }

    const areaAccess = await loadCurrentAdminAreaAccess(
      'membership',
      'review',
      {
        requiredRoles: adminRoles,
        userId: user.id,
        roles,
      },
    )

    if (!areaAccess.ok) {
      setError(areaAccess.message)
      setLoading(false)
      setRefreshing(false)
      return
    }

    setAreaNotice(getAreaAccessSummaryText(areaAccess))

    const query = supabase
      .from('profile_update_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    const { data, error: requestError } = await query

    if (requestError) {
      setError(
        /relation .*profile_update_requests.* does not exist/i.test(
          requestError.message,
        )
          ? 'Apply migration 20260710213000_profile_update_requests.sql before using this page.'
          : requestError.message,
      )
      setRequests([])
    } else {
      const rows = (data ?? []).map(normalizeRequestRow)
      setRequests(rows)
      await loadRequestedPhotoUrls(rows)
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function loadRequestedPhotoUrls(rows: ProfileUpdateRequest[]) {
    const paths = rows
      .map((request) => request.requested_changes.photo_url)
      .filter((path): path is string => Boolean(path))

    if (!paths.length) {
      setPhotoUrls({})
      return
    }

    const entries = await Promise.all(
      paths.map(async (path) => {
        const { data } = await supabase.storage
          .from('member-photos')
          .createSignedUrl(path, 60 * 60)
        return data?.signedUrl ? ([path, data.signedUrl] as const) : null
      }),
    )

    setPhotoUrls(
      Object.fromEntries(
        entries.filter(
          (entry): entry is readonly [string, string] => entry !== null,
        ),
      ),
    )
  }

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()

    return requests.filter((request) => {
      if (statusFilter !== 'all' && request.status !== statusFilter) {
        return false
      }

      if (!query) return true

      return [
        request.member_name,
        request.member_no ?? '',
        request.source_district,
        request.source_taluka ?? '',
        request.target_district,
        request.target_taluka ?? '',
        request.member_note ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [requests, search, statusFilter])

  const stats = useMemo(
    () =>
      requests.reduce(
        (acc, request) => {
          acc.total += 1
          acc[request.status] += 1
          return acc
        },
        { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 },
      ),
    [requests],
  )

  async function reviewRequest(
    request: ProfileUpdateRequest,
    decision: 'approved' | 'rejected',
  ) {
    const note = notes[request.id]?.trim() ?? ''

    if (decision === 'rejected' && note.length < 3) {
      setError('Enter a rejection reason before rejecting this request.')
      return
    }

    const confirmed = window.confirm(
      decision === 'approved'
        ? `Approve ${request.member_name}'s profile changes? The live member record and digital card will be updated immediately.`
        : `Reject ${request.member_name}'s profile update request?`,
    )

    if (!confirmed) return

    setProcessingId(request.id)
    setError('')
    setSuccess('')

    const { error: reviewError } = await supabase.rpc(
      'review_profile_update_request',
      {
        _request_id: request.id,
        _decision: decision,
        _admin_note: note || undefined,
      },
    )

    if (reviewError) {
      setError(reviewError.message)
    } else {
      const requestedPhotoPath = request.requested_changes.photo_url
      const previousPhotoPath = request.current_snapshot.photo_url

      if (decision === 'approved' && previousPhotoPath) {
        await supabase.storage
          .from('member-photos')
          .remove([previousPhotoPath])
      } else if (decision === 'rejected' && requestedPhotoPath) {
        await supabase.storage
          .from('member-photos')
          .remove([requestedPhotoPath])
      }

      setSuccess(
        decision === 'approved'
          ? `${request.member_name}'s profile update request was approved and applied.`
          : `${request.member_name}'s profile update request was rejected.`,
      )
      setNotes((current) => ({ ...current, [request.id]: '' }))
      await loadRequests({ silent: true })
    }

    setProcessingId(null)
  }

  if (loading) {
    return (
      <AdminShell
        title="Profile Update Requests"
        subtitle="Review approved-member corrections before changing live profile and digital card data."
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading profile update requests…
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Profile Update Requests"
      subtitle="Review approved-member corrections before changing live profile and digital card data."
    >
      <div className="space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                  Membership Review Queue
                </p>
                <h1 className="mt-3 text-3xl font-black text-slate-950">
                  Member Profile Update Requests
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Compare the approved member data with requested values. Approval
                  is transactional, area-aware, audited, and sends a notification
                  to the member.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowSensitive((value) => !value)}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black shadow-sm ${
                    showSensitive
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {showSensitive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showSensitive ? 'Hide Sensitive' : 'Show Sensitive'}
                </button>
                <button
                  type="button"
                  onClick={() => void loadRequests({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 sm:p-5">
            <StatButton
              label="All Loaded"
              value={stats.total}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <StatButton
              label="Pending"
              value={stats.pending}
              active={statusFilter === 'pending'}
              tone="amber"
              onClick={() => setStatusFilter('pending')}
            />
            <StatButton
              label="Approved"
              value={stats.approved}
              active={statusFilter === 'approved'}
              tone="emerald"
              onClick={() => setStatusFilter('approved')}
            />
            <StatButton
              label="Rejected"
              value={stats.rejected}
              active={statusFilter === 'rejected'}
              tone="red"
              onClick={() => setStatusFilter('rejected')}
            />
            <StatButton
              label="Cancelled"
              value={stats.cancelled}
              active={statusFilter === 'cancelled'}
              onClick={() => setStatusFilter('cancelled')}
            />
          </div>
        </header>

        {areaNotice ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
            {areaNotice}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            {success}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                <FilePenLine className="me-2 inline h-4 w-4" />
                Request Queue
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Showing {filteredRequests.length} of {requests.length} loaded
                requests.
              </p>
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member, number, district, taluka…"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {filteredRequests.map((request) => (
              <RequestReviewCard
                key={request.id}
                request={request}
                showSensitive={showSensitive}
                note={notes[request.id] ?? ''}
                photoUrl={
                  request.requested_changes.photo_url
                    ? photoUrls[request.requested_changes.photo_url]
                    : undefined
                }
                processing={processingId === request.id}
                onNoteChange={(value) =>
                  setNotes((current) => ({ ...current, [request.id]: value }))
                }
                onReview={(decision) =>
                  void reviewRequest(request, decision)
                }
              />
            ))}

            {!filteredRequests.length ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <ShieldCheck className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-700">
                  No profile update requests found.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Change the status filter or search text.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function normalizeRequestRow(
  row: Database['public']['Tables']['profile_update_requests']['Row'],
): ProfileUpdateRequest {
  const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(
    row.status,
  )
    ? (row.status as ProfileUpdateRequest['status'])
    : 'pending'

  return {
    ...row,
    status,
    requested_changes: parseProfileUpdateChanges(row.requested_changes),
    current_snapshot: parseProfileUpdateChanges(row.current_snapshot),
  }
}

function StatButton({
  label,
  value,
  active,
  onClick,
  tone = 'slate',
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  tone?: 'slate' | 'amber' | 'emerald' | 'red'
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-800'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-800'
        : tone === 'red'
          ? 'bg-red-50 text-red-800'
          : 'bg-slate-50 text-slate-800'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-emerald-400 ring-2 ring-emerald-100'
          : 'border-slate-200 hover:border-slate-300'
      } ${toneClass}`}
    >
      <span className="block text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </span>
      <span className="mt-2 block text-2xl font-black">{value}</span>
    </button>
  )
}

function RequestReviewCard({
  request,
  showSensitive,
  note,
  photoUrl,
  processing,
  onNoteChange,
  onReview,
}: {
  request: ProfileUpdateRequest
  showSensitive: boolean
  note: string
  photoUrl?: string
  processing: boolean
  onNoteChange: (value: string) => void
  onReview: (decision: 'approved' | 'rejected') => void
}) {
  const rows = getProfileUpdateChangedFields(request)
  const pending = request.status === 'pending'
  const StatusIcon =
    request.status === 'approved'
      ? BadgeCheck
      : request.status === 'pending'
        ? Clock3
        : XCircle

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
              <FilePenLine className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-950">
                  {request.member_name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${getProfileUpdateStatusClass(
                    request.status,
                  )}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {getProfileUpdateStatusLabel(request.status)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {request.member_no || 'Member number unavailable'} · Submitted{' '}
                {formatDisplayDate(request.created_at)}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {request.source_district} / {request.source_taluka || '—'}
                {request.source_district !== request.target_district ||
                request.source_taluka !== request.target_taluka ? (
                  <>
                    <ArrowRight className="h-3.5 w-3.5" />
                    {request.target_district} / {request.target_taluka || '—'}
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <Link
            to="/admin/members/$id"
            params={{ id: request.member_id }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 no-underline shadow-sm hover:bg-slate-50"
          >
            Open Member Record
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.field}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                {row.label}
              </p>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-xs">
                <ValueBox
                  label="Current"
                  value={formatProfileUpdateValue(row.field, row.before, {
                    revealSensitive: showSensitive,
                  })}
                />
                <ArrowRight className="mt-8 h-4 w-4 text-slate-300" />
                <ValueBox
                  label="Requested"
                  value={formatProfileUpdateValue(row.field, row.after, {
                    revealSensitive: showSensitive,
                  })}
                  requested
                />
              </div>
            </div>
          ))}
        </div>

        {request.requested_changes.photo_url ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Requested Member Photo
            </p>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${request.member_name} requested profile`}
                className="mt-3 h-56 w-44 rounded-2xl border border-slate-200 object-cover object-top shadow-sm"
              />
            ) : (
              <div className="mt-3 flex h-40 w-44 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ImageOff className="h-7 w-7" />
              </div>
            )}
          </div>
        ) : null}

        {request.member_note ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
            <strong>Member note:</strong> {request.member_note}
          </div>
        ) : null}

        {pending ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-black text-slate-800">
              Admin note / rejection reason
            </label>
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value.slice(0, 500))}
              disabled={processing}
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="Optional for approval; required for rejection."
              maxLength={500}
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onReview('rejected')}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => onReview('approved')}
                disabled={processing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve and Apply Changes
              </button>
            </div>
          </div>
        ) : request.admin_note ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Admin note:</strong> {request.admin_note}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function ValueBox({
  label,
  value,
  requested = false,
}: {
  label: string
  value: string
  requested?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-xl p-2.5 ${
        requested ? 'bg-emerald-50' : 'bg-slate-50'
      }`}
    >
      <span
        className={`block font-black ${
          requested ? 'text-emerald-600' : 'text-slate-400'
        }`}
      >
        {label}
      </span>
      <span
        className={`mt-1 block break-words font-bold ${
          requested ? 'text-emerald-950' : 'text-slate-700'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
