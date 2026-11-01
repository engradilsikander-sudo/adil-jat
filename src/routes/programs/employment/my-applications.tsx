import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BriefcaseBusiness, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
import {
  formatSkills,
  getCurrentEmploymentStatusLabel,
  getEmploymentStatusClass,
  getEmploymentStatusLabel,
  getEmploymentTypeLabel,
  type EmploymentApplicationDetails,
} from '../../../lib/programs/employment'

export const Route = createFileRoute('/programs/employment/my-applications')({
  component: MyEmploymentApplicationsPage,
})

type EmploymentApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  district: string | null
  taluka: string | null
  details: EmploymentApplicationDetails | null
  status: string
  admin_remarks: string | null
  submitted_at: string
  created_at: string
}

function MyEmploymentApplicationsPage() {
  const { copy, textDir, textAlignClass, arrowClass } = useProgramTrackingCopy('employment')
  const [items, setItems] = useState<EmploymentApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Employment profiles dekhne ke liye login karen.')
      setItems([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, district, taluka, details, status, admin_remarks, submitted_at, created_at')
      .eq('program_key', 'employment')
      .eq('applicant_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setItems([])
    } else {
      setItems((data || []) as unknown as EmploymentApplicationListItem[])
    }

    setLoading(false)
  }

  const total = useMemo(() => items.length, [items])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="ltr">
      <div className="mx-auto max-w-6xl">
        <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${textAlignClass}`} dir={textDir}>
          <div>
            <Link to="/programs/employment" className="text-sm font-black text-emerald-700 no-underline">← {copy.program.programBack}</Link>
            <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
              {copy.program.listTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{copy.common.total}: {total}</p>
          </div>
          <Link to="/programs/employment/apply" className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 font-black text-white no-underline">
            {copy.program.newApplication}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-3xl bg-white p-12 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          </div>
        ) : message ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center font-semibold text-amber-800">{message}</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">{copy.program.emptyTitle}</h2>
            <p className="mt-2 text-slate-600">{copy.program.emptyText}</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {items.map((item) => {
              const details = item.details || {}
              return (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.application_no || copy.program.detailBadge}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getEmploymentStatusClass(item.status)}`}>{getEmploymentStatusLabel(item.status)}</span>
                      </div>
                      <h2 className="mt-4 text-2xl font-black text-slate-950">{item.applicant_name}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{copy.common.memberId}: {item.membership_no}</p>
                    </div>
                    <Link to="/programs/employment/$id" params={{ id: item.id }} className="jas-dark-action-link inline-flex items-center rounded-xl px-5 py-3 text-sm font-black no-underline">
                      {copy.common.viewDetails} <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                    <p><strong>{copy.program.education}:</strong> {details.education_level || '-'}</p>
                    <p><strong>{copy.program.skills}:</strong> {formatSkills(details.skills)}</p>
                    <p><strong>{copy.program.preferredLocation}:</strong> {details.preferred_job_location || '-'}</p>
                    <p><strong>{copy.program.employmentType}:</strong> {getEmploymentTypeLabel(details.employment_type)}</p>
                    <p><strong>{copy.common.status}:</strong> {getCurrentEmploymentStatusLabel(details.current_employment_status)}</p>
                    <p><strong>{copy.common.submitted}:</strong> {new Date(item.created_at).toLocaleDateString()}</p>
                  </div>

                  {item.admin_remarks ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>{copy.common.adminRemarks}:</strong> {item.admin_remarks}</div> : null}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
