import { createFileRoute, Link } from '@tanstack/react-router'
import { BriefcaseBusiness, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
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
  getEmploymentTypeLabel,
  getShortlistStatusLabel,
  getTrainingInterestLabel,
  type EmploymentApplicationDetails,
  type EmploymentDocumentRecord,
} from '../../../lib/programs/employment'

export const Route = createFileRoute('/programs/employment/$id')({
  component: EmploymentApplicationDetailPage,
})

type EmploymentApplicationDetail = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  phone: string
  district: string | null
  taluka: string | null
  address: string | null
  details: EmploymentApplicationDetails | null
  status: string
  admin_remarks: string | null
  created_at: string
}

function EmploymentApplicationDetailPage() {
  const { copy, textDir, textAlignClass } = useProgramTrackingCopy('employment')
  const { id } = Route.useParams()
  const [application, setApplication] = useState<EmploymentApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<EmploymentDocumentRecord[]>([])
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadApplication()
  }, [id])

  async function loadApplication() {
    setLoading(true)
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Details dekhne ke liye login karen.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, phone, district, taluka, address, details, status, admin_remarks, created_at')
      .eq('id', id)
      .eq('program_key', 'employment')
      .eq('applicant_user_id', user.id)
      .single()

    if (error || !data) {
      setMessage(error?.message || 'Employment profile not found.')
      setLoading(false)
      return
    }

    const { data: docs } = await supabase
      .from('program_documents')
      .select('*')
      .eq('application_id', id)
      .eq('program_key', 'employment')
      .order('created_at', { ascending: true })

    const typedDocs = (docs || []) as unknown as EmploymentDocumentRecord[]
    const urls: Record<string, string> = {}

    for (const doc of typedDocs) {
      const { data: signed } = await supabase.storage
        .from(EMPLOYMENT_DOCUMENT_BUCKET)
        .createSignedUrl(doc.file_path, 60 * 60)
      if (signed?.signedUrl) urls[doc.id] = signed.signedUrl
    }

    setApplication(data as unknown as EmploymentApplicationDetail)
    setDocuments(typedDocs)
    setDocumentUrls(urls)
    setLoading(false)
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-emerald-600" /></main>
  }

  if (message || !application) {
    return <main className="min-h-screen bg-slate-50 px-4 py-10" dir="ltr"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">{message || 'Not found'}</div></main>
  }

  const details = application.details || {}

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="ltr">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/programs/employment/my-applications" className="text-sm font-black text-emerald-700 no-underline">← {copy.program.detailBack}</Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className={`flex flex-wrap items-start justify-between gap-4 ${textAlignClass}`} dir={textDir}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                <BriefcaseBusiness className="h-4 w-4" /> {copy.program.detailBadge}
              </div>
              <h1 className="mt-4 text-3xl font-black text-slate-950">{application.applicant_name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">{copy.common.memberId}: {application.membership_no}</p>
            </div>
            <span className={`rounded-full border px-4 py-2 text-sm font-black ${getEmploymentStatusClass(application.status)}`}>
              {getEmploymentStatusLabel(application.status)}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Info label={copy.program.education} value={details.education_level || '-'} />
            <Info label={copy.program.field} value={details.field_of_study || '-'} />
            <Info label={copy.program.skills} value={formatSkills(details.skills)} />
            <Info label={copy.program.experience} value={details.experience_years || '-'} />
            <Info label={copy.program.preferredLocation} value={details.preferred_job_location || '-'} />
            <Info label={copy.program.expectedSalary} value={details.expected_salary || '-'} />
            <Info label={copy.program.employmentType} value={getEmploymentTypeLabel(details.employment_type)} />
            <Info label={copy.program.currentStatus} value={getCurrentEmploymentStatusLabel(details.current_employment_status)} />
            <Info label={copy.program.trainingInterest} value={getTrainingInterestLabel(details.training_interest)} />
            <Info label={copy.program.shortlistStatus} value={getShortlistStatusLabel(details.shortlist_status)} />
            <Info label={copy.program.placement} value={details.placement_status || copy.program.notPlaced} />
            <Info label={copy.common.submitted} value={new Date(application.created_at).toLocaleDateString()} />
          </div>

          {details.experience_summary ? <TextBlock title={copy.program.experienceSummary} text={details.experience_summary} /> : null}
          {details.skill_development_request ? <TextBlock title={copy.program.skillDevelopmentRequest} text={details.skill_development_request} /> : null}
          {details.placement_notes ? <TextBlock title={copy.program.placementNotes} text={details.placement_notes} /> : null}
          {application.admin_remarks ? <TextBlock title={copy.common.adminRemarks} text={application.admin_remarks} /> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">{copy.common.documents}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{getEmploymentDocumentLabel(doc.document_type)}</p>
                    <p className="mt-1 text-xs text-slate-500">{doc.file_name || copy.common.document} · {formatEmploymentFileSize(doc.file_size)}</p>
                  </div>
                  <FileText className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${getEmploymentDocumentStatusClass(doc.verification_status)}`}>{getEmploymentDocumentStatusLabel(doc.verification_status)}</span>
                  {documentUrls[doc.id] ? <a href={documentUrls[doc.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-black text-emerald-700">{copy.common.open} <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                </div>
                {doc.admin_note ? <p className="mt-3 text-sm text-slate-600"><strong>{copy.common.note}:</strong> {doc.admin_note}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950">{value}</p></div>
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-black text-slate-950">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</p></div>
}
