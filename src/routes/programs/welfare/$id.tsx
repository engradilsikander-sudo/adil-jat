// src/routes/programs/welfare/$id.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Download, FileCheck2, HandHeart, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
import {
  WELFARE_DOCUMENT_BUCKET,
  formatWelfareFileSize,
  formatWelfareMoney,
  getWelfareCasePriorityClass,
  getWelfareCasePriorityLabel,
  getWelfareCommitteeDecisionLabel,
  getWelfareDocumentLabel,
  getWelfareDocumentStatusClass,
  getWelfareDocumentStatusLabel,
  getWelfarePaymentStatusLabel,
  getWelfareStatusClass,
  getWelfareStatusLabel,
  type WelfareApplicationDetails,
  type WelfareDocumentRecord,
} from '../../../lib/programs/welfare'

export const Route = createFileRoute('/programs/welfare/$id')({
  component: WelfareApplicationDetailPage,
})

type WelfareApplicationDetail = {
  id: string
  application_no: string | null
  applicant_name: string
  applicant_cnic: string | null
  membership_no: string
  relationship_to_member: string
  phone: string
  email: string | null
  address: string | null
  district: string | null
  taluka: string | null
  details: WelfareApplicationDetails | null
  status: string
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  created_at: string
}

function WelfareApplicationDetailPage() {
  const { copy, textDir, textAlignClass, iconBeforeClass } = useProgramTrackingCopy('welfare')
  const { id } = Route.useParams()
  const [application, setApplication] = useState<WelfareApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<WelfareDocumentRecord[]>([])
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
      setMessage('Case details dekhne ke liye pehle login karen.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, applicant_cnic, membership_no, relationship_to_member, phone, email, address, district, taluka, details, status, admin_remarks, approved_amount, submitted_at, created_at')
      .eq('program_key', 'welfare')
      .eq('id', id)
      .eq('applicant_user_id', user.id)
      .single()

    if (error || !data) {
      setMessage(error?.message || 'Welfare case not found.')
      setLoading(false)
      return
    }

    const { data: docs, error: docsError } = await supabase
      .from('program_documents')
      .select('*')
      .eq('program_key', 'welfare')
      .eq('application_id', id)
      .order('created_at', { ascending: true })

    if (docsError) {
      setMessage(docsError.message)
      setLoading(false)
      return
    }

    setApplication(data as unknown as WelfareApplicationDetail)
    setDocuments((docs || []) as unknown as WelfareDocumentRecord[])
    setLoading(false)
  }

  async function openDocument(document: WelfareDocumentRecord) {
    const { data, error } = await supabase.storage
      .from(WELFARE_DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 60 * 10)

    if (error || !data?.signedUrl) {
      setMessage(error?.message || 'Document open nahi ho saka.')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></main>
  }

  if (message || !application) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12" dir="ltr">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
          <h1 className="text-2xl font-black">{copy.common.unableToLoad}</h1>
          <p className="mt-3 font-semibold">{message || copy.common.caseNotFound}</p>
          <Link to="/programs/welfare/my-applications" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white no-underline">{copy.common.back}</Link>
        </div>
      </main>
    )
  }

  const details = application.details || {}

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-6xl">
          <Link to="/programs/welfare/my-applications" className="inline-flex items-center text-sm font-bold text-amber-300 no-underline hover:text-amber-200">
            <ArrowLeft className={`${iconBeforeClass} h-4 w-4`} /> {copy.program.detailBack}
          </Link>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className={textAlignClass} dir={textDir}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HandHeart className="h-4 w-4 text-amber-300" /> {application.application_no || copy.program.detailBadge}
              </div>
              <h1 className="mt-5 text-4xl font-black md:text-6xl">{application.applicant_name}</h1>
              <p className="mt-3 text-white/70">{copy.common.membershipNo}: {application.membership_no}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-sm font-black ${getWelfareStatusClass(application.status)}`}>{getWelfareStatusLabel(application.status)}</span>
              <span className={`rounded-full border px-4 py-2 text-sm font-black ${getWelfareCasePriorityClass(details)}`}>{getWelfareCasePriorityLabel(details)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <InfoCard title={copy.program.caseDetails}>
              <InfoGrid rows={[
                [copy.program.caseType, details.case_type || '-'],
                [copy.common.requiredAmount, formatWelfareMoney(details.required_amount)],
                [copy.common.approvedAmount, application.approved_amount ? formatWelfareMoney(application.approved_amount) : '-'],
                [copy.program.fundStatus, getWelfarePaymentStatusLabel(details.payment_status)],
                [copy.program.committeeDecision, getWelfareCommitteeDecisionLabel(details.welfare_committee_decision)],
                [copy.common.districtTaluka, `${application.district || '-'} / ${application.taluka || '-'}`],
              ]} />
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><strong>{copy.common.reason}:</strong> {details.reason || '-'}</div>
            </InfoCard>

            <InfoCard title={copy.program.committeeUpdates}>
              <div className="grid gap-4">
                <Note label={copy.common.adminRemarks} value={application.admin_remarks} />
                <Note label={copy.program.verifierRemarks} value={details.verifier_remarks} />
                <Note label={copy.program.committeeRemarks} value={details.welfare_committee_remarks} />
                <Note label={copy.program.followUpNotes} value={details.follow_up_notes} />
                <Note label={copy.program.caseCloseReport} value={details.case_close_report} />
              </div>
            </InfoCard>
          </div>

          <aside className="space-y-6">
            <InfoCard title={copy.program.applicantInfo}>
              <InfoGrid rows={[
                [copy.common.phone, application.phone],
                [copy.common.cnic, application.applicant_cnic || '-'],
                [copy.common.relation, application.relationship_to_member],
                [copy.common.address, application.address || '-'],
                [copy.common.submitted, new Date(application.submitted_at).toLocaleString()],
              ]} />
            </InfoCard>

            <InfoCard title={copy.common.documents}>
              <div className="grid gap-3">
                {documents.length === 0 ? <p className="text-sm text-slate-600">{copy.common.noDocuments}</p> : null}
                {documents.map((document) => (
                  <button key={document.id} type="button" onClick={() => openDocument(document)} className="text-left rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-amber-300">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{getWelfareDocumentLabel(document.document_type)}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{document.file_name || copy.common.document} • {formatWelfareFileSize(document.file_size)}</p>
                      </div>
                      <Download className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getWelfareDocumentStatusClass(document.verification_status)}`}>{getWelfareDocumentStatusLabel(document.verification_status)}</span>
                    {document.admin_note ? <p className="mt-3 text-xs font-semibold text-slate-600">{copy.common.note}: {document.admin_note}</p> : null}
                  </button>
                ))}
              </div>
            </InfoCard>
          </aside>
        </div>
      </section>
    </main>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-950"><FileCheck2 className="h-5 w-5 text-amber-700" />{title}</h2>{children}</section>
}

function InfoGrid({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <div className="grid gap-3 text-sm md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><div className="mt-1 font-bold text-slate-800">{value}</div></div>)}</div>
}

function Note({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><strong>{label}:</strong> {value || '-'}</div>
}
