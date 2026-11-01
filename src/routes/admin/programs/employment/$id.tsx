import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  Loader2,
  Save,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'
import { useAdminProgramsCopy } from '../../../../lib/admin-programs-i18n'
import {
  EMPLOYMENT_DOCUMENT_BUCKET,
  formatEmploymentFileSize,
  formatSkills,
  getCurrentEmploymentStatusLabel,
  getEmploymentDocumentLabel,
  getEmploymentDocumentStatusClass,
  getEmploymentDocumentStatusLabel,
  getEmploymentStatusClass,
  getEmploymentStatusLabel,
  getShortlistStatusLabel,
  getTrainingInterestLabel,
  shortlistStatusOptions,
  type CandidateShortlistStatus,
  type EmploymentApplicationDetails,
  type EmploymentDocumentRecord,
  type EmploymentStatus,
} from '../../../../lib/programs/employment'

export const Route = createFileRoute('/admin/programs/employment/$id')({
  component: AdminEmploymentApplicationDetailPage,
})

type EmploymentApplicationDetail = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  applicant_cnic: string | null
  phone: string
  district: string | null
  taluka: string | null
  address: string | null
  details: EmploymentApplicationDetails | null
  status: string
  assigned_admin_id: string | null
  admin_remarks: string | null
  created_at: string
}

type ReviewState = {
  status: EmploymentStatus
  adminRemarks: string
  shortlistStatus: CandidateShortlistStatus
  placementStatus: string
  employerName: string
  jobTitle: string
  interviewNotes: string
  placementNotes: string
}

function AdminEmploymentApplicationDetailPage() {
  const { copy } = useAdminProgramsCopy('employment')
  const { id } = Route.useParams()
  const [application, setApplication] = useState<EmploymentApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<EmploymentDocumentRecord[]>([])
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({})
  const [review, setReview] = useState<ReviewState>({
    status: 'under_review',
    adminRemarks: '',
    shortlistStatus: 'not_shortlisted',
    placementStatus: 'not_placed',
    employerName: '',
    jobTitle: '',
    interviewNotes: '',
    placementNotes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { void loadApplication() }, [id])

  async function ensureAccess() {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { ok: false, userId: '' }
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin','super_admin','employment_admin']).limit(1)
    if (error || !data?.length) return { ok: false, userId: user.id }
    return { ok: true, userId: user.id }
  }

  async function loadApplication() {
    setLoading(true)
    setMessage('')
    const access = await ensureAccess()
    if (!access.ok) { setMessage('Employment admin access required.'); setLoading(false); return }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, applicant_cnic, phone, district, taluka, address, details, status, assigned_admin_id, admin_remarks, created_at')
      .eq('id', id)
      .eq('program_key', 'employment')
      .single()

    if (error || !data) { setMessage(error?.message || 'Employment profile not found.'); setLoading(false); return }

    const app = data as unknown as EmploymentApplicationDetail
    const details = app.details || {}
    setApplication(app)
    setReview({
      status: app.status as EmploymentStatus,
      adminRemarks: app.admin_remarks || '',
      shortlistStatus: details.shortlist_status || 'not_shortlisted',
      placementStatus: details.placement_status || 'not_placed',
      employerName: details.employer_name || '',
      jobTitle: details.job_title || '',
      interviewNotes: details.interview_notes || '',
      placementNotes: details.placement_notes || '',
    })

    const { data: docs } = await supabase.from('program_documents').select('*').eq('application_id', id).eq('program_key', 'employment').order('created_at', { ascending: true })
    const typedDocs = (docs || []) as unknown as EmploymentDocumentRecord[]
    const urls: Record<string, string> = {}
    for (const doc of typedDocs) {
      const { data: signed } = await supabase.storage.from(EMPLOYMENT_DOCUMENT_BUCKET).createSignedUrl(doc.file_path, 60 * 60)
      if (signed?.signedUrl) urls[doc.id] = signed.signedUrl
    }
    setDocuments(typedDocs)
    setDocumentUrls(urls)
    setLoading(false)
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!application) return
    setSaving(true)
    setMessage('')

    const access = await ensureAccess()
    if (!access.ok) { setMessage('Employment admin access required.'); setSaving(false); return }

    const nextDetails: EmploymentApplicationDetails = {
      ...(application.details || {}),
      shortlist_status: review.shortlistStatus,
      placement_status: review.placementStatus,
      employer_name: review.employerName.trim(),
      job_title: review.jobTitle.trim(),
      interview_notes: review.interviewNotes.trim(),
      placement_notes: review.placementNotes.trim(),
    }

    const { error } = await supabase
      .from('program_applications')
      .update({
        status: review.status,
        admin_remarks: review.adminRemarks.trim() || null,
        assigned_admin_id: access.userId,
        reviewed_at: new Date().toISOString(),
        completed_at: review.status === 'completed' || review.status === 'paid_completed' ? new Date().toISOString() : null,
        details: nextDetails,
      })
      .eq('id', application.id)
      .eq('program_key', 'employment')

    if (error) setMessage(error.message)
    else {
      setMessage('Employment review saved successfully.')
      await loadApplication()
    }
    setSaving(false)
  }

  async function updateDocumentStatus(doc: EmploymentDocumentRecord, status: string) {
    const access = await ensureAccess()
    if (!access.ok) { setMessage('Employment admin access required.'); return }
    const { error } = await supabase.from('program_documents').update({ verification_status: status, is_verified: status === 'verified', verified_by: access.userId, verified_at: new Date().toISOString() }).eq('id', doc.id)
    if (error) setMessage(error.message)
    else await loadApplication()
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-emerald-600" /></main>
  if (!application) return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">{message || 'Not found'}</div></main>

  const details = application.details || {}

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link to="/admin/programs/employment" className="inline-flex items-center text-sm font-black text-emerald-700 no-underline"><ArrowLeft className="mr-2 h-4 w-4" /> {copy.program.detailBack}</Link>
        {message ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{message}</div> : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700"><BriefcaseBusiness className="h-4 w-4" /> {copy.program.detailBadge}</div><h1 className="mt-4 text-3xl font-black text-slate-950">{application.applicant_name}</h1><p className="mt-1 text-sm font-semibold text-slate-500">{copy.common.memberId}: {application.membership_no}</p></div>
            <span className={`rounded-full border px-4 py-2 text-sm font-black ${getEmploymentStatusClass(application.status)}`}>{getEmploymentStatusLabel(application.status)}</span>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Info label={copy.program.phone} value={application.phone || '-'} /><Info label={copy.common.cnic} value={application.applicant_cnic || '-'} /><Info label={copy.common.district} value={application.district || '-'} /><Info label={copy.common.taluka} value={application.taluka || '-'} />
            <Info label={copy.program.education} value={details.education_level || '-'} /><Info label={copy.program.candidateInfo} value={details.field_of_study || '-'} /><Info label={copy.program.skills} value={formatSkills(details.skills)} /><Info label={copy.program.experience} value={details.experience_years || '-'} />
            <Info label={copy.program.preferredLocation} value={details.preferred_job_location || '-'} /><Info label={copy.program.expectedSalary} value={details.expected_salary || '-'} /><Info label={copy.program.currentStatus} value={getCurrentEmploymentStatusLabel(details.current_employment_status)} /><Info label={copy.program.training} value={getTrainingInterestLabel(details.training_interest)} />
            <Info label={copy.program.shortlist} value={getShortlistStatusLabel(details.shortlist_status)} /><Info label={copy.program.employer} value={details.employer_name || '-'} /><Info label={copy.program.jobTitle} value={details.job_title || '-'} /><Info label={copy.common.submitted} value={new Date(application.created_at).toLocaleDateString()} />
          </div>
          {details.experience_summary ? <TextBlock title={copy.program.experience} text={details.experience_summary} /> : null}
          {details.skill_development_request ? <TextBlock title={copy.program.skills} text={details.skill_development_request} /> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">{copy.common.documents}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {documents.map((doc) => <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{getEmploymentDocumentLabel(doc.document_type)}</p><p className="mt-1 text-xs text-slate-500">{doc.file_name || 'Document'} · {formatEmploymentFileSize(doc.file_size)}</p></div><FileText className="h-5 w-5 text-emerald-700" /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${getEmploymentDocumentStatusClass(doc.verification_status)}`}>{getEmploymentDocumentStatusLabel(doc.verification_status)}</span>{documentUrls[doc.id] ? <a href={documentUrls[doc.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-black text-emerald-700">Open <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => updateDocumentStatus(doc, 'verified')} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Verify</button><button type="button" onClick={() => updateDocumentStatus(doc, 'need_more_info')} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950">Need Info</button><button type="button" onClick={() => updateDocumentStatus(doc, 'rejected')} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white">Reject</button></div></div>)}
            </div>
          </div>

          <form onSubmit={saveReview} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">Review & Placement</h2>
            <div className="mt-5 space-y-4">
              <Field label="Application Status"><select value={review.status} onChange={(event) => setReview((current) => ({ ...current, status: event.target.value as EmploymentStatus }))} className="input-clean"><option value="submitted">Registered</option><option value="under_review">Under Review</option><option value="need_more_info">Need More Info</option><option value="approved">Shortlisted</option><option value="rejected">Rejected</option><option value="paid_completed">Placed / Employed</option><option value="completed">Closed</option></select></Field>
              <Field label="Shortlist Status"><select value={review.shortlistStatus} onChange={(event) => setReview((current) => ({ ...current, shortlistStatus: event.target.value as CandidateShortlistStatus }))} className="input-clean">{shortlistStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Placement Status"><input value={review.placementStatus} onChange={(event) => setReview((current) => ({ ...current, placementStatus: event.target.value }))} className="input-clean" placeholder="not_placed / placed / follow_up" /></Field>
              <Field label="Employer Name"><input value={review.employerName} onChange={(event) => setReview((current) => ({ ...current, employerName: event.target.value }))} className="input-clean" /></Field>
              <Field label={copy.program.jobTitle}><input value={review.jobTitle} onChange={(event) => setReview((current) => ({ ...current, jobTitle: event.target.value }))} className="input-clean" /></Field>
              <Field label="Interview Notes"><textarea value={review.interviewNotes} onChange={(event) => setReview((current) => ({ ...current, interviewNotes: event.target.value }))} className="input-clean min-h-24" /></Field>
              <Field label="Placement Notes"><textarea value={review.placementNotes} onChange={(event) => setReview((current) => ({ ...current, placementNotes: event.target.value }))} className="input-clean min-h-24" /></Field>
              <Field label="Admin Remarks"><textarea value={review.adminRemarks} onChange={(event) => setReview((current) => ({ ...current, adminRemarks: event.target.value }))} className="input-clean min-h-24" /></Field>
              <button type="submit" disabled={saving} className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 font-black text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {copy.common.saveReview}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words font-black text-slate-950">{value}</p></div> }
function TextBlock({ title, text }: { title: string; text: string }) { return <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</p></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-black text-slate-800">{label}</span>{children}</label> }
