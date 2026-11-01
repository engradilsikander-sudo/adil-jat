// src/routes/programs/health/my-applications.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  HeartPulse,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
import {
  getHealthPaymentStatusLabel,
  getHealthStatusClass,
  getHealthStatusLabel,
  isHealthEmergency,
  type HealthApplicationDetails,
} from '../../../lib/programs/health'

export const Route = createFileRoute('/programs/health/my-applications')({
  component: MyHealthApplicationsPage,
})

type HealthApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  district: string | null
  taluka: string | null
  details: HealthApplicationDetails | null
  status: string
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  created_at: string
}

function MyHealthApplicationsPage() {
  const { copy, arrowClass } = useProgramTrackingCopy('health')
  const [applications, setApplications] = useState<HealthApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadApplications()
  }, [])

  async function loadApplications(options?: { silent?: boolean }) {
    if (options?.silent) setRefreshing(true)
    else setLoading(true)

    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Health applications dekhne ke liye pehle login karen.')
      setApplications([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select(
        'id, application_no, applicant_name, membership_no, district, taluka, details, status, admin_remarks, approved_amount, submitted_at, created_at',
      )
      .eq('program_key', 'health')
      .eq('applicant_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setApplications([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    setApplications((data || []) as unknown as HealthApplicationListItem[])
    setLoading(false)
    setRefreshing(false)
  }

  const stats = useMemo(() => {
    return {
      total: applications.length,
      emergency: applications.filter((item) => isHealthEmergency(item.details)).length,
      approved: applications.filter((item) => item.status === 'approved').length,
      completed: applications.filter((item) =>
        ['paid_completed', 'completed'].includes(item.status),
      ).length,
    }
  }, [applications])

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HeartPulse className="h-4 w-4 text-red-300" />
                {copy.program.listTitle}
              </div>

              <h1 className="text-4xl font-black md:text-6xl">
                Track Medical Help Requests
              </h1>

              <p className="text-lg leading-8 text-white/75">
                Apni submitted medical help applications, status, approved
                support and admin remarks yahan dekhen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadApplications({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex w-fit items-center justify-center rounded-xl bg-red-400 px-5 py-3 font-black text-slate-950 transition hover:bg-red-300 disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-16">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label={copy.common.total} value={stats.total} icon={<ShieldCheck className="h-5 w-5" />} />
            <StatCard label="Emergency" value={stats.emergency} icon={<AlertTriangle className="h-5 w-5" />} />
            <StatCard label="Approved" value={stats.approved} icon={<CalendarDays className="h-5 w-5" />} />
            <StatCard label="Completed" value={stats.completed} icon={<BadgeIndianRupee className="h-5 w-5" />} />
          </div>

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            </div>
          ) : message ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Login Required
              </h2>
              <p className="mt-3 text-slate-600">{message}</p>
              <Link
                to="/login"
                className="jas-dark-action-link mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 font-black no-underline"
              >
                Login
              </Link>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                No health applications yet
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Aap ne abhi koi medical help application submit nahi ki.
              </p>
              <Link
                to="/programs/health/apply"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-500 px-6 py-3 font-black text-slate-950 no-underline transition hover:bg-red-400"
              >
                Apply Now
              </Link>
            </div>
          ) : (
            <div className="grid gap-5">
              {applications.map((item) => (
                <HealthApplicationCard
                    key={item.id}
                    item={item}
                    labels={{
                      payment: copy.program.caseDetails,
                      viewDetails: copy.common.viewDetails,
                    }}
                    arrowClass={arrowClass}
                  />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        {icon}
      </div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function HealthApplicationCard({
  item,
  labels,
  arrowClass,
}: {
  item: HealthApplicationListItem
  labels: {
    payment: string
    viewDetails: string
  }
  arrowClass: string
}) {
  const details = item.details || {}

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {item.application_no || 'Application'}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getHealthStatusClass(
                item.status,
              )}`}
            >
              {getHealthStatusLabel(item.status)}
            </span>
            {isHealthEmergency(details) ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                Emergency
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">
              {item.applicant_name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Membership No: {item.membership_no}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p><strong>District:</strong> {item.district || '-'}</p>
            <p><strong>Taluka:</strong> {item.taluka || '-'}</p>
            <p><strong>Treatment:</strong> {details.treatment_type || '-'}</p>
            <p><strong>Hospital:</strong> {details.hospital_name || '-'}</p>
            <p><strong>Required:</strong> {details.required_amount ? `Rs. ${details.required_amount}` : '-'}</p>
            <p><strong>{labels.payment}:</strong> {getHealthPaymentStatusLabel(details.payment_status)}</p>
          </div>

          {item.admin_remarks ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>Admin Remarks:</strong> {item.admin_remarks}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-between gap-4 lg:min-w-[190px] lg:items-end">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 lg:text-right">
            <p className="font-black text-slate-950">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
            <p className="mt-1">
              {item.approved_amount
                ? `Approved: Rs. ${Number(item.approved_amount)}`
                : 'Approval pending'}
            </p>
          </div>

          <Link
            to="/programs/health/$id"
            params={{ id: item.id }}
            className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black no-underline transition"
          >
            {labels.viewDetails}
            <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
          </Link>
        </div>
      </div>
    </article>
  )
}
