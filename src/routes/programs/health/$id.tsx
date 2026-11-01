// src/routes/programs/health/$id.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeIndianRupee,
  Download,
  FileHeart,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramTrackingCopy } from '../../../lib/program-tracking-i18n'
import {
  HEALTH_DOCUMENT_BUCKET,
  formatHealthFileSize,
  getHealthDocumentLabel,
  getHealthDocumentStatusClass,
  getHealthDocumentStatusLabel,
  getHealthCasePriorityClass,
  getHealthCasePriorityLabel,
  getHealthCommitteeDecisionClass,
  getHealthCommitteeDecisionLabel,
  getHealthPaymentStatusLabel,
  getHealthStatusClass,
  getHealthStatusLabel,
  isHealthEmergency,
  type HealthApplicationDetails,
  type HealthDocumentRecord,
} from '../../../lib/programs/health'

export const Route = createFileRoute('/programs/health/$id')({
  component: HealthApplicationDetailPage,
})

type HealthApplicationDetail = {
  id: string
  application_no: string | null
  program_key: string
  applicant_user_id: string
  member_id: string | null
  membership_no: string
  relationship_to_member: string
  applicant_name: string
  applicant_cnic: string | null
  phone: string
  email: string | null
  district: string | null
  taluka: string | null
  address: string | null
  details: HealthApplicationDetails | null
  status: string
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  reviewed_at: string | null
  approved_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

function HealthApplicationDetailPage() {
  const { copy } = useProgramTrackingCopy('health')
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [application, setApplication] =
    useState<HealthApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<HealthDocumentRecord[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadApplication()
  }, [id])

  async function loadApplication() {
    setLoading(true)
    setMessage('')
    setSignedUrls({})

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Application detail dekhne ke liye pehle login karen.')
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('*')
      .eq('id', id)
      .eq('program_key', 'health')
      .eq('applicant_user_id', user.id)
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    if (!data) {
      setMessage(copy.common.caseNotFound)
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    const row = data as unknown as HealthApplicationDetail
    setApplication(row)

    const { data: documentRows, error: documentError } = await supabase
      .from('program_documents')
      .select('*')
      .eq('application_id', row.id)
      .eq('program_key', 'health')
      .order('created_at', { ascending: true })

    if (documentError) {
      setMessage(documentError.message)
      setDocuments([])
      setLoading(false)
      return
    }

    const safeDocuments = (documentRows || []) as unknown as HealthDocumentRecord[]
    setDocuments(safeDocuments)

    const nextSignedUrls = await createSignedUrls(safeDocuments)
    setSignedUrls(nextSignedUrls)
    setLoading(false)
  }

  async function createSignedUrls(items: HealthDocumentRecord[]) {
    const entries = await Promise.all(
      items.map(async (document) => {
        const { data, error } = await supabase.storage
          .from(HEALTH_DOCUMENT_BUCKET)
          .createSignedUrl(document.file_path, 60 * 60)

        if (error || !data?.signedUrl) return null
        return [document.id, data.signedUrl] as const
      }),
    )

    return Object.fromEntries(
      entries.filter(Boolean) as Array<readonly [string, string]>,
    )
  }

  const details = useMemo<HealthApplicationDetails>(
    () => application?.details || {},
    [application],
  )

  async function handleBack() {
    await navigate({ to: '/programs/health/my-applications' })
  }

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-10 text-white md:py-14">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-sm font-bold text-red-300 transition hover:text-red-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Health Applications
          </button>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HeartPulse className="h-4 w-4 text-red-300" />
                Health Application Detail
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                Medical Case Detail
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Patient details, support request, uploaded medical documents and
                admin decision yahan dekhen.
              </p>
            </div>

            {application ? (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
                <p className="font-black text-white">
                  {application.application_no || 'Application'}
                </p>
                <p className="mt-1 text-white/70">
                  Submitted: {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            </div>
          ) : !application ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm">
              <h2 className="text-2xl font-black">Application not available</h2>
              <p className="mt-3 font-semibold">{message}</p>
              <Link
                to="/programs/health/my-applications"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-black text-white no-underline"
              >
                Back to Applications
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <SummaryCard application={application} details={details} />

                <InfoSection
                  title="Patient / Applicant Details"
                  icon={<User className="h-5 w-5" />}
                  items={[
                    ['Patient Name', application.applicant_name],
                    ['CNIC / B-form', application.applicant_cnic || '-'],
                    ['Age', details.patient_age || '-'],
                    ['Gender', details.patient_gender || '-'],
                    ['Guardian Name', details.guardian_name || '-'],
                    [copy.common.phone, application.phone],
                    ['Email', application.email || '-'],
                    ['Relationship', application.relationship_to_member],
                    ['Membership No', application.membership_no],
                    ['District', application.district || '-'],
                    ['Taluka', application.taluka || '-'],
                    [copy.common.address, application.address || '-'],
                  ]}
                />

                <InfoSection
                  title="Medical Case Details"
                  icon={<Stethoscope className="h-5 w-5" />}
                  items={[
                    ['Disease / Condition', details.disease_name || '-'],
                    ['Treatment Type', details.treatment_type || '-'],
                    ['Hospital Name', details.hospital_name || '-'],
                    ['Doctor Name', details.doctor_name || '-'],
                    ['Doctor Contact', details.doctor_contact || '-'],
                    ['Estimated Cost', details.estimated_cost ? `Rs. ${details.estimated_cost}` : '-'],
                    ['Required Support', details.required_amount ? `Rs. ${details.required_amount}` : '-'],
                    ['Emergency', isHealthEmergency(details) ? 'Yes' : 'No'],
                    ['Case Summary', details.case_summary || '-'],
                  ]}
                />

                <DocumentsSection documents={documents} signedUrls={signedUrls} noDocumentsLabel={copy.common.noDocuments} />
              </div>

              <aside className="space-y-6">
                <DecisionCard application={application} details={details} />

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-5 w-5 flex-shrink-0" />
                    <div>
                      <h3 className="font-black">Medical Privacy</h3>
                      <p className="mt-2 text-sm leading-6">
                        Apne medical documents aur case details sirf trusted
                        admin/committee review ke liye share karen. Public QR
                        verification page par medical data show nahi hota.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

function SummaryCard({
  application,
  details,
}: {
  application: HealthApplicationDetail
  details: HealthApplicationDetails
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {application.application_no || 'Application'}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${getHealthStatusClass(
            application.status,
          )}`}
        >
          {getHealthStatusLabel(application.status)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${getHealthCasePriorityClass(details)}`}
        >
          {isHealthEmergency(details) ? (
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          ) : null}
          {getHealthCasePriorityLabel(details)}
        </span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${getHealthCommitteeDecisionClass(details.health_committee_decision)}`}
        >
          {getHealthCommitteeDecisionLabel(details.health_committee_decision)}
        </span>
      </div>

      <h2 className="mt-4 text-3xl font-black text-slate-950">
        {application.applicant_name}
      </h2>
      <p className="mt-2 text-slate-600">
        Membership No: <strong>{application.membership_no}</strong>
      </p>
    </section>
  )
}

function DecisionCard({
  application,
  details,
}: {
  application: HealthApplicationDetail
  details: HealthApplicationDetails
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        <BadgeIndianRupee className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-black text-slate-950">Admin Decision</h2>

      <div className="mt-5 space-y-4 text-sm text-slate-700">
        <p><strong>Status:</strong> {getHealthStatusLabel(application.status)}</p>
        <p><strong>Approved Amount:</strong> {application.approved_amount ? `Rs. ${Number(application.approved_amount)}` : 'Pending'}</p>
        <p><strong>Payment Status:</strong> {getHealthPaymentStatusLabel(details.payment_status)}</p>
        <p><strong>Case Priority:</strong> {getHealthCasePriorityLabel(details)}</p>
        <p><strong>Committee Decision:</strong> {getHealthCommitteeDecisionLabel(details.health_committee_decision)}</p>
        <p><strong>Submitted:</strong> {new Date(application.submitted_at).toLocaleString()}</p>
        {application.reviewed_at ? <p><strong>Reviewed:</strong> {new Date(application.reviewed_at).toLocaleString()}</p> : null}
        {application.approved_at ? <p><strong>Approved:</strong> {new Date(application.approved_at).toLocaleString()}</p> : null}
        {application.completed_at ? <p><strong>Closed:</strong> {new Date(application.completed_at).toLocaleString()}</p> : null}
      </div>

      {application.admin_remarks ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Admin Remarks:</strong> {application.admin_remarks}
        </div>
      ) : null}

      {details.health_committee_remarks ? (
        <div className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm text-purple-900">
          <strong>Committee Decision Notes:</strong>{' '}
          {details.health_committee_remarks}
        </div>
      ) : null}

      {details.medical_committee_remarks ? (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Medical Committee Remarks:</strong>{' '}
          {details.medical_committee_remarks}
        </div>
      ) : null}

      {details.follow_up_notes ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <strong>Follow-up Notes:</strong> {details.follow_up_notes}
        </div>
      ) : null}

      {details.case_close_report ? (
        <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-sm text-slate-800">
          <strong>Case Close Report:</strong> {details.case_close_report}
        </div>
      ) : null}
    </section>
  )
}

function InfoSection({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: Array<[string, string]>
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className={label.includes('Summary') ? 'md:col-span-2' : ''}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-700">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function DocumentsSection({
  documents,
  signedUrls,
  noDocumentsLabel,
}: {
  documents: HealthDocumentRecord[]
  signedUrls: Record<string, string>
  noDocumentsLabel: string
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <FileHeart className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-black text-slate-950">
          Medical Documents
        </h2>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {noDocumentsLabel}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-black text-slate-950">
                    {getHealthDocumentLabel(document.document_type)}
                  </h3>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {document.file_name || 'Uploaded document'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatHealthFileSize(document.file_size)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${getHealthDocumentStatusClass(
                    document.verification_status,
                  )}`}
                >
                  {getHealthDocumentStatusLabel(document.verification_status)}
                </span>
              </div>

              {document.admin_note ? (
                <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600">
                  <strong>Admin note:</strong> {document.admin_note}
                </p>
              ) : null}

              {signedUrls[document.id] ? (
                <a
                  href={signedUrls[document.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white no-underline transition hover:bg-slate-800"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Open Document
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
