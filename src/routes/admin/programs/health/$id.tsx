// src/routes/admin/programs/health/$id.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  Download,
  FileHeart,
  HeartPulse,
  Loader2,
  Printer,
  Save,
  ShieldCheck,
  Stethoscope,
  User,
  XCircle,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'
import { useAdminProgramsCopy } from '../../../../lib/admin-programs-i18n'
import {
  HEALTH_DOCUMENT_BUCKET,
  formatHealthFileSize,
  formatHealthMoney,
  getHealthCasePriorityClass,
  getHealthCasePriorityLabel,
  getHealthCommitteeDecisionClass,
  getHealthCommitteeDecisionLabel,
  getHealthDocumentLabel,
  getHealthDocumentStatusClass,
  getHealthDocumentStatusLabel,
  getHealthPaymentStatusLabel,
  getHealthStatusClass,
  getHealthStatusLabel,
  healthCommitteeDecisionOptions,
  healthPaymentStatusOptions,
  isHealthEmergency,
  sanitizeHealthReportText,
  type HealthApplicationDetails,
  type HealthDocumentRecord,
  type HealthStatus,
} from '../../../../lib/programs/health'

export const Route = createFileRoute('/admin/programs/health/$id')({
  component: AdminHealthApplicationDetailPage,
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
  assigned_admin_id: string | null
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  reviewed_at: string | null
  approved_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type ReviewFormState = {
  status: string
  approvedAmount: string
  adminRemarks: string
  medicalCommitteeRemarks: string
  casePriority: string
  committeeDecision: string
  committeeMembers: string
  committeeRemarks: string
  paymentStatus: string
  followUpNotes: string
  caseCloseReport: string
}

type DocumentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'needs_reupload'

function AdminHealthApplicationDetailPage() {
  const { copy } = useAdminProgramsCopy('health')
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [application, setApplication] =
    useState<HealthApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<HealthDocumentRecord[]>([])
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [reviewForm, setReviewForm] = useState<ReviewFormState>({
    status: 'submitted',
    approvedAmount: '',
    adminRemarks: '',
    medicalCommitteeRemarks: '',
    casePriority: 'normal',
    committeeDecision: 'pending',
    committeeMembers: '',
    committeeRemarks: '',
    paymentStatus: 'not_started',
    followUpNotes: '',
    caseCloseReport: '',
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [documentSavingId, setDocumentSavingId] = useState<string | null>(null)
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
      setMessage('Health admin detail dekhne ke liye pehle login karen.')
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

    const { data, error } = await supabase
      .from('program_applications')
      .select('*')
      .eq('id', id)
      .eq('program_key', 'health')
      .maybeSingle()

    if (error) {
      setMessage(error.message)
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    if (!data) {
      setMessage('Health application not found or access denied.')
      setApplication(null)
      setDocuments([])
      setLoading(false)
      return
    }

    const row = data as unknown as HealthApplicationDetail
    setApplication(row)
    setReviewForm({
      status: row.status,
      approvedAmount: row.approved_amount ? String(row.approved_amount) : '',
      adminRemarks: row.admin_remarks || '',
      medicalCommitteeRemarks: row.details?.medical_committee_remarks || '',
      casePriority: row.details?.case_priority || (row.details?.emergency ? 'emergency' : 'normal'),
      committeeDecision: row.details?.health_committee_decision || 'pending',
      committeeMembers: row.details?.health_committee_members || '',
      committeeRemarks: row.details?.health_committee_remarks || '',
      paymentStatus: row.details?.payment_status || 'not_started',
      followUpNotes: row.details?.follow_up_notes || '',
      caseCloseReport: row.details?.case_close_report || '',
    })

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

  function updateReviewField<K extends keyof ReviewFormState>(
    key: K,
    value: ReviewFormState[K],
  ) {
    setReviewForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!application) return

    setSaving(true)
    setMessage('')

    const mergedDetails: HealthApplicationDetails = {
      ...(application.details || {}),
      medical_committee_remarks: reviewForm.medicalCommitteeRemarks.trim(),
      case_priority: reviewForm.casePriority,
      health_committee_decision: reviewForm.committeeDecision,
      health_committee_members: reviewForm.committeeMembers.trim(),
      health_committee_remarks: reviewForm.committeeRemarks.trim(),
      health_committee_reviewed_at:
        reviewForm.committeeDecision && reviewForm.committeeDecision !== 'pending'
          ? application.details?.health_committee_reviewed_at || new Date().toISOString()
          : '',
      payment_status: reviewForm.paymentStatus,
      follow_up_notes: reviewForm.followUpNotes.trim(),
      case_close_report: reviewForm.caseCloseReport.trim(),
    }

    const { error } = await supabase
      .from('program_applications')
      .update({
        status: reviewForm.status as HealthStatus,
        approved_amount: reviewForm.approvedAmount
          ? Number(reviewForm.approvedAmount)
          : null,
        admin_remarks: reviewForm.adminRemarks.trim() || null,
        details: mergedDetails,
        assigned_admin_id: application.assigned_admin_id || currentUserId,
      })
      .eq('id', application.id)
      .eq('program_key', 'health')

    if (error) {
      setMessage(error.message)
      setSaving(false)
      return
    }

    setMessage('Health case review saved successfully.')
    await loadApplication()
    setSaving(false)
  }

  async function assignToMe() {
    if (!application || !currentUserId) return

    setAssigning(true)
    setMessage('')

    const { error } = await supabase
      .from('program_applications')
      .update({
        assigned_admin_id: currentUserId,
        status: (application.status === 'submitted' ? 'under_review' : application.status) as HealthStatus,
      })
      .eq('id', application.id)
      .eq('program_key', 'health')

    if (error) {
      setMessage(error.message)
      setAssigning(false)
      return
    }

    await loadApplication()
    setAssigning(false)
  }

  async function clearReviewer() {
    if (!application) return

    setAssigning(true)
    setMessage('')

    const { error } = await supabase
      .from('program_applications')
      .update({ assigned_admin_id: null })
      .eq('id', application.id)
      .eq('program_key', 'health')

    if (error) {
      setMessage(error.message)
      setAssigning(false)
      return
    }

    await loadApplication()
    setAssigning(false)
  }

  async function updateDocumentStatus({
    document,
    status,
    note,
  }: {
    document: HealthDocumentRecord
    status: DocumentVerificationStatus
    note?: string
  }) {
    setDocumentSavingId(document.id)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('program_documents')
      .update({
        verification_status: status,
        is_verified: status === 'verified',
        admin_note: note ?? document.admin_note,
        verified_by: user?.id ?? null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', document.id)
      .eq('program_key', 'health')

    if (error) {
      setMessage(error.message)
      setDocumentSavingId(null)
      return
    }

    await loadApplication()
    setDocumentSavingId(null)
  }

  const details = useMemo<HealthApplicationDetails>(
    () => application?.details || {},
    [application],
  )

  async function handleBack() {
    await navigate({ to: '/admin/programs/health' })
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-10 text-white md:py-14">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-sm font-bold text-red-300 transition hover:text-red-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.program.detailBack}
          </button>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HeartPulse className="h-4 w-4 text-red-300" />
                Restricted Health Case
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                Review Medical Help Case
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Sensitive medical case details. Sirf authorized health
                committee/admin use ke liye.
              </p>
            </div>

            {application ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={() => printHealthCaseReport(application, details, documents)}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Close Report
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
                <p className="font-black text-white">
                  {application.application_no || 'Application'}
                </p>
                <p className="mt-1 text-white/70">
                  Submitted: {new Date(application.created_at).toLocaleDateString()}
                </p>
                </div>
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
              <h2 className="text-2xl font-black">{copy.common.applicationNotAvailable}</h2>
              <p className="mt-3 font-semibold">{message}</p>

              <Link
                to="/admin/programs/health"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-black text-white no-underline"
              >
                {copy.program.detailBack}
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="space-y-6">
                <PrivacyNotice />

                <SummaryCard application={application} details={details} />

                <InfoSection
                  title={copy.program.patientDetails}
                  icon={<User className="h-5 w-5" />}
                  items={[
                    ['Patient Name', application.applicant_name],
                    ['CNIC / B-form', application.applicant_cnic || '-'],
                    ['Age', details.patient_age || '-'],
                    ['Gender', details.patient_gender || '-'],
                    ['Guardian Name', details.guardian_name || '-'],
                    ['Phone', application.phone],
                    ['Email', application.email || '-'],
                    ['Relationship', application.relationship_to_member],
                    ['Membership No', application.membership_no],
                    ['District', application.district || '-'],
                    ['Taluka', application.taluka || '-'],
                    ['Address', application.address || '-'],
                  ]}
                />

                <InfoSection
                  title="Medical Case Details"
                  icon={<Stethoscope className="h-5 w-5" />}
                  items={[
                    ['Disease / Condition', details.disease_name || '-'],
                    ['Treatment Type', details.treatment_type || '-'],
                    [`${copy.program.hospital} Name`, details.hospital_name || '-'],
                    ['Doctor Name', details.doctor_name || '-'],
                    ['Doctor Contact', details.doctor_contact || '-'],
                    ['Estimated Cost', details.estimated_cost ? `Rs. ${details.estimated_cost}` : '-'],
                    ['Required Support', details.required_amount ? `Rs. ${details.required_amount}` : '-'],
                    ['Emergency', isHealthEmergency(details) ? 'Yes' : 'No'],
                    ['Case Priority', getHealthCasePriorityLabel(details)],
                    ['Case Summary', details.case_summary || '-'],
                  ]}
                />

                <InfoSection
                  title="Health Committee Review"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  items={[
                    [
                      'Committee Decision',
                      getHealthCommitteeDecisionLabel(details.health_committee_decision),
                    ],
                    ['Committee Members', details.health_committee_members || '-'],
                    [
                      'Committee Reviewed At',
                      details.health_committee_reviewed_at
                        ? new Date(details.health_committee_reviewed_at).toLocaleString()
                        : '-',
                    ],
                    ['Committee Remarks', details.health_committee_remarks || '-'],
                  ]}
                />

                <DocumentsReviewSection
                  documents={documents}
                  signedUrls={signedUrls}
                  documentSavingId={documentSavingId}
                  onUpdateDocumentStatus={updateDocumentStatus}
                />
              </div>

              <aside className="space-y-6">
                <ReviewerCard
                  application={application}
                  currentUserId={currentUserId}
                  assigning={assigning}
                  onAssignToMe={assignToMe}
                  onClearReviewer={clearReviewer}
                />

                <ReviewForm
                  form={reviewForm}
                  saving={saving}
                  message={message}
                  onChange={updateReviewField}
                  onSubmit={handleSaveReview}
                />
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}


function PrivacyNotice() {
  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-900 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 flex-shrink-0" />
        <div>
          <h2 className="font-black">Medical Privacy & Restricted Access</h2>
          <p className="mt-1">
            Is case mein sensitive medical information ho sakti hai. Documents,
            disease details, committee notes aur close report sirf authorized
            health committee/admin review ke liye use karen.
          </p>
        </div>
      </div>
    </section>
  )
}

function printHealthCaseReport(
  application: HealthApplicationDetail,
  details: HealthApplicationDetails,
  documents: HealthDocumentRecord[],
) {
  const rows: Array<[string, string]> = [
    ['Case No', application.application_no || application.id],
    ['Patient Name', application.applicant_name],
    ['Membership No', application.membership_no],
    ['District / Taluka', `${application.district || '-'} / ${application.taluka || '-'}`],
    ['Status', getHealthStatusLabel(application.status)],
    ['Priority', getHealthCasePriorityLabel(details)],
    ['Emergency', isHealthEmergency(details) ? 'Yes' : 'No'],
    ['Disease / Condition', details.disease_name || '-'],
    ['Treatment Type', details.treatment_type || '-'],
    ['Hospital', details.hospital_name || '-'],
    ['Doctor', details.doctor_name || '-'],
    ['Estimated Cost', formatHealthMoney(details.estimated_cost)],
    ['Required Support', formatHealthMoney(details.required_amount)],
    ['Approved Amount', application.approved_amount ? formatHealthMoney(application.approved_amount) : 'Pending'],
    ['Payment Status', getHealthPaymentStatusLabel(details.payment_status)],
    ['Committee Decision', getHealthCommitteeDecisionLabel(details.health_committee_decision)],
    ['Committee Members', details.health_committee_members || '-'],
    ['Committee Remarks', details.health_committee_remarks || details.medical_committee_remarks || '-'],
    ['Follow-up Notes', details.follow_up_notes || '-'],
    ['Case Close Report', details.case_close_report || '-'],
  ]

  const documentRows = documents
    .map(
      (document) => `
        <tr>
          <td>${sanitizeHealthReportText(getHealthDocumentLabel(document.document_type))}</td>
          <td>${sanitizeHealthReportText(getHealthDocumentStatusLabel(document.verification_status))}</td>
          <td>${sanitizeHealthReportText(document.admin_note || '-')}</td>
        </tr>
      `,
    )
    .join('')

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Health Case Report - ${sanitizeHealthReportText(application.application_no || application.id)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
          h1 { margin: 0 0 8px; }
          .muted { color: #64748b; margin-bottom: 24px; }
          .privacy { border: 1px solid #fecaca; background: #fef2f2; color: #7f1d1d; padding: 14px; border-radius: 12px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; }
          .section { margin-top: 28px; }
          @media print { button { display: none; } body { padding: 16px; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Print / Save PDF</button>
        <h1>Jatt Alliance Sindh — Health Case Report</h1>
        <div class="muted">Generated: ${sanitizeHealthReportText(new Date().toLocaleString())}</div>
        <div class="privacy"><strong>Restricted:</strong> This report contains sensitive medical information. Share only with authorized JAS health committee/admin users.</div>
        <table>
          <tbody>
            ${rows
              .map(
                ([label, value]) => `
                  <tr>
                    <th>${sanitizeHealthReportText(label)}</th>
                    <td>${sanitizeHealthReportText(value)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="section">
          <h2>Document Verification</h2>
          <table>
            <thead><tr><th>Document</th><th>Status</th><th>Admin Note</th></tr></thead>
            <tbody>${documentRows || '<tr><td colspan="3">No documents uploaded.</td></tr>'}</tbody>
          </table>
        </div>
      </body>
    </html>
  `

  const reportWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!reportWindow) return

  reportWindow.document.write(html)
  reportWindow.document.close()
}

function SummaryCard({
  application,
  details,
}: {
  application: HealthApplicationDetail
  details: HealthApplicationDetails
}) {
  const { copy } = useAdminProgramsCopy('health')

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
        {copy.common.membershipNo}: <strong>{application.membership_no}</strong>
      </p>
    </section>
  )
}

function ReviewerCard({
  application,
  currentUserId,
  assigning,
  onAssignToMe,
  onClearReviewer,
}: {
  application: HealthApplicationDetail
  currentUserId: string | null
  assigning: boolean
  onAssignToMe: () => void
  onClearReviewer: () => void
}) {
  const { copy } = useAdminProgramsCopy('health')

  const assignedToMe =
    currentUserId && application.assigned_admin_id === currentUserId

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-black text-slate-950">Reviewer</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Case ko apne naam assign karen. Submitted case assign hotay hi Under
        Medical Review ban jayega.
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <strong>Status:</strong>{' '}
        {application.assigned_admin_id
          ? assignedToMe
            ? 'Assigned to you'
            : 'Assigned to another reviewer'
          : 'Unassigned'}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onAssignToMe}
          disabled={assigning || assignedToMe === true}
          className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-red-400 disabled:opacity-60"
        >
          {assigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {copy.common.assignToMe}
        </button>

        <button
          type="button"
          onClick={onClearReviewer}
          disabled={assigning || !application.assigned_admin_id}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          Clear
        </button>
      </div>
    </section>
  )
}

function ReviewForm({
  form,
  saving,
  message,
  onChange,
  onSubmit,
}: {
  form: ReviewFormState
  saving: boolean
  message: string
  onChange: <K extends keyof ReviewFormState>(
    key: K,
    value: ReviewFormState[K],
  ) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const { copy } = useAdminProgramsCopy('health')

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <BadgeIndianRupee className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-black text-slate-950">Case Review</h2>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Case Status
          <select
            value={form.status}
            onChange={(event) => onChange('status', event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
          >
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Medical Review</option>
            <option value="need_more_info">Need More Info</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid_completed">Payment Released</option>
            <option value="completed">Case Closed</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-slate-700">
          Approved Support Amount
          <input
            value={form.approvedAmount}
            onChange={(event) => onChange('approvedAmount', event.target.value)}
            placeholder="e.g. 25000"
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
          />
        </label>

        <label className="grid gap-2 text-sm font-black text-slate-700">
          Payment Status
          <select
            value={form.paymentStatus}
            onChange={(event) => onChange('paymentStatus', event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
          >
            {healthPaymentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <TextareaField label="Admin Remarks" value={form.adminRemarks} onChange={(value) => onChange('adminRemarks', value)} />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          Case Priority
          <select
            value={form.casePriority}
            onChange={(event) => onChange('casePriority', event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black text-slate-700">
          Health Committee Decision
          <select
            value={form.committeeDecision}
            onChange={(event) => onChange('committeeDecision', event.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
          >
            {healthCommitteeDecisionOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <TextareaField label="Committee Members / Reviewers" value={form.committeeMembers} onChange={(value) => onChange('committeeMembers', value)} />
        <TextareaField label="Medical Committee Remarks" value={form.medicalCommitteeRemarks} onChange={(value) => onChange('medicalCommitteeRemarks', value)} />
        <TextareaField label="Committee Decision Notes" value={form.committeeRemarks} onChange={(value) => onChange('committeeRemarks', value)} />
        <TextareaField label="Follow-up Notes" value={form.followUpNotes} onChange={(value) => onChange('followUpNotes', value)} />
        <TextareaField label="Case Close Report" value={form.caseCloseReport} onChange={(value) => onChange('caseCloseReport', value)} />
      </div>

      {message ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {copy.common.saveReview}
      </button>
    </form>
  )
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-red-500"
      />
    </label>
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

function DocumentsReviewSection({
  documents,
  signedUrls,
  documentSavingId,
  onUpdateDocumentStatus,
}: {
  documents: HealthDocumentRecord[]
  signedUrls: Record<string, string>
  documentSavingId: string | null
  onUpdateDocumentStatus: (args: {
    document: HealthDocumentRecord
    status: DocumentVerificationStatus
    note?: string
  }) => void
}) {
  const { copy } = useAdminProgramsCopy('health')

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <FileHeart className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-black text-slate-950">
          Medical {copy.common.documentVerification}
        </h2>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          No documents uploaded.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <DocumentReviewCard
              key={document.id}
              document={document}
              signedUrl={signedUrls[document.id]}
              saving={documentSavingId === document.id}
              onUpdateDocumentStatus={onUpdateDocumentStatus}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DocumentReviewCard({
  document,
  signedUrl,
  saving,
  onUpdateDocumentStatus,
}: {
  document: HealthDocumentRecord
  signedUrl?: string
  saving: boolean
  onUpdateDocumentStatus: (args: {
    document: HealthDocumentRecord
    status: DocumentVerificationStatus
    note?: string
  }) => void
}) {
  const [note, setNote] = useState(document.admin_note || '')

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Document note"
        rows={3}
        className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-red-500"
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {signedUrl ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50"
          >
            <Download className="mr-2 h-4 w-4" />
            Open
          </a>
        ) : null}

        <button
          type="button"
          onClick={() =>
            onUpdateDocumentStatus({ document, status: 'verified', note })
          }
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          Verify
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateDocumentStatus({ document, status: 'needs_reupload', note })
          }
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          Re-upload
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateDocumentStatus({ document, status: 'rejected', note })
          }
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </button>
      </div>
    </article>
  )
}
