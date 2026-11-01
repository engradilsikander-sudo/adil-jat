// src/routes/programs/welfare/my-applications.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, HandHeart, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
import {
  formatWelfareMoney,
  getWelfareCasePriorityClass,
  getWelfareCasePriorityLabel,
  getWelfarePaymentStatusLabel,
  getWelfareStatusClass,
  getWelfareStatusLabel,
  type WelfareApplicationDetails,
} from '../../../lib/programs/welfare'

export const Route = createFileRoute('/programs/welfare/my-applications')({
  component: MyWelfareApplicationsPage,
})

type WelfareApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  district: string | null
  taluka: string | null
  details: WelfareApplicationDetails | null
  status: string
  approved_amount: number | null
  admin_remarks: string | null
  created_at: string
}

function MyWelfareApplicationsPage() {
  const { copy, arrowClass } = useProgramTrackingCopy('welfare')
  const [applications, setApplications] = useState<WelfareApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Apni welfare cases dekhne ke liye pehle login karen.')
      setApplications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, district, taluka, details, status, approved_amount, admin_remarks, created_at')
      .eq('program_key', 'welfare')
      .eq('applicant_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setApplications([])
      setLoading(false)
      return
    }

    setApplications((data || []) as unknown as WelfareApplicationListItem[])
    setLoading(false)
  }

  const stats = useMemo(() => ({
    total: applications.length,
    open: applications.filter((item) => !['rejected', 'completed'].includes(item.status)).length,
    approved: applications.filter((item) => ['approved', 'paid_completed', 'completed'].includes(item.status)).length,
  }), [applications])

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HandHeart className="h-4 w-4 text-amber-300" />
                {copy.program.listTitle}
              </div>
              <h1 className="mt-5 text-4xl font-black md:text-6xl">Track your cases</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">Submitted welfare support cases, status, remarks and approved support amount yahan track karen.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/programs/welfare/apply" className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 no-underline">New Case</Link>
              <button type="button" onClick={loadApplications} disabled={loading} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white disabled:opacity-60">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total" value={stats.total} />
            <StatCard title="Open" value={stats.open} />
            <StatCard title="Approved/Released" value={stats.approved} />
          </div>

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>
          ) : message ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900 shadow-sm">{message}</div>
          ) : applications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">{copy.program.emptyTitle}</h2>
              <p className="mt-3 text-slate-600">Abhi koi welfare application submit nahi hui.</p>
              <Link to="/programs/welfare/apply" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white no-underline">Apply Now</Link>
            </div>
          ) : (
            <div className="grid gap-5">
              {applications.map((item) => {
                const details = item.details || {}
                return (
                  <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.application_no || copy.program.detailBadge}</span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getWelfareStatusClass(item.status)}`}>{getWelfareStatusLabel(item.status)}</span>
                          <span className={`rounded-full border px-3 py-1 text-xs font-black ${getWelfareCasePriorityClass(details)}`}>{getWelfareCasePriorityLabel(details)}</span>
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-950">{item.applicant_name}</h2>
                          <p className="mt-1 text-sm font-semibold text-slate-500">Membership No: {item.membership_no}</p>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                          <p><strong>Case Type:</strong> {details.case_type || '-'}</p>
                          <p><strong>District:</strong> {item.district || '-'}</p>
                          <p><strong>Taluka:</strong> {item.taluka || '-'}</p>
                          <p><strong>Required:</strong> {formatWelfareMoney(details.required_amount)}</p>
                          <p><strong>Approved:</strong> {item.approved_amount ? formatWelfareMoney(item.approved_amount) : '-'}</p>
                          <p><strong>{copy.program.fundStatus}:</strong> {getWelfarePaymentStatusLabel(details.payment_status)}</p>
                        </div>
                        {item.admin_remarks ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Admin Remarks:</strong> {item.admin_remarks}</div> : null}
                      </div>
                      <div className="flex flex-col justify-between gap-4 lg:min-w-[170px] lg:items-end">
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 lg:text-right">
                          <p className="font-black text-slate-950">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                        <Link to="/programs/welfare/$id" params={{ id: item.id }} className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black no-underline transition">
                          {copy.common.viewDetails} <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}
