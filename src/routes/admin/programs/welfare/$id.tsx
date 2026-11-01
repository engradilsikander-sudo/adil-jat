// src/routes/admin/programs/welfare/$id.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileCheck2,
  HandHeart,
  Loader2,
  Printer,
  Save,
  User,
  XCircle,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase/client'
import { useAdminProgramsCopy } from '../../../../lib/admin-programs-i18n'
import {
  WELFARE_DOCUMENT_BUCKET,
  formatWelfareFileSize,
  formatWelfareMoney,
  getWelfareCasePriorityClass,
  getWelfareCasePriorityLabel,
  getWelfareCommitteeDecisionClass,
  getWelfareCommitteeDecisionLabel,
  getWelfareDocumentLabel,
  getWelfareDocumentStatusClass,
  getWelfareDocumentStatusLabel,
  getWelfarePaymentStatusLabel,
  getWelfareStatusClass,
  getWelfareStatusLabel,
  sanitizeWelfareReportText,
  welfareCommitteeDecisionOptions,
  welfarePaymentStatusOptions,
  type WelfareApplicationDetails,
  type WelfareDocumentRecord,
  type WelfareStatus,
} from '../../../../lib/programs/welfare'

export const Route = createFileRoute('/admin/programs/welfare/$id')({
  component: AdminWelfareApplicationDetailPage,
})

type WelfareApplicationDetail = {
  id: string
  application_no: string | null
  applicant_user_id: string
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
  status: WelfareStatus | string
  assigned_admin_id: string | null
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  reviewed_at: string | null
  approved_at: string | null
  completed_at: string | null
  created_at: string
}

type ReviewFormState = {
  status: WelfareStatus
  approvedAmount: string
  adminRemarks: string
  verifierRemarks: string
  committeeDecision: string
  committeeMembers: string
  committeeRemarks: string
  paymentStatus: string
  paymentReference: string
  followUpNotes: string
  caseCloseReport: string
}

type UserRoleRow = { role: string }
type AssignmentRow = { id: string; can_view: boolean | null }

function AdminWelfareApplicationDetailPage() {
  const { copy } = useAdminProgramsCopy('welfare')
  const { id } = Route.useParams()
  const [application, setApplication] = useState<WelfareApplicationDetail | null>(null)
  const [documents, setDocuments] = useState<WelfareDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<ReviewFormState>({
    status: 'under_review',
    approvedAmount: '',
    adminRemarks: '',
    verifierRemarks: '',
    committeeDecision: 'pending',
    committeeMembers: '',
    committeeRemarks: '',
    paymentStatus: 'not_started',
    paymentReference: '',
    followUpNotes: '',
    caseCloseReport: '',
  })

  useEffect(() => {
    void loadApplication()
  }, [id])

  async function loadApplication() {
    setLoading(true)
    setMessage('')

    const access = await ensureWelfareAdminAccess()
    if (!access.ok) {
      setMessage(access.message)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_user_id, applicant_name, applicant_cnic, membership_no, relationship_to_member, phone, email, address, district, taluka, details, status, assigned_admin_id, admin_remarks, approved_amount, submitted_at, reviewed_at, approved_at, completed_at, created_at')
      .eq('program_key', 'welfare')
      .eq('id', id)
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

    const row = data as unknown as WelfareApplicationDetail
    const details = row.details || {}

    setApplication(row)
    setDocuments((docs || []) as unknown as WelfareDocumentRecord[])
    setForm({
      status: row.status as WelfareStatus,
      approvedAmount: row.approved_amount ? String(row.approved_amount) : '',
      adminRemarks: row.admin_remarks || '',
      verifierRemarks: details.verifier_remarks || '',
      committeeDecision: details.welfare_committee_decision || 'pending',
      committeeMembers: details.welfare_committee_members || '',
      committeeRemarks: details.welfare_committee_remarks || '',
      paymentStatus: details.payment_status || 'not_started',
      paymentReference: details.payment_reference || '',
      followUpNotes: details.follow_up_notes || '',
      caseCloseReport: details.case_close_report || '',
    })
    setLoading(false)
  }

  function updateForm<K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function assignToMe() {
    setMessage('')
    setAssigning(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Reviewer assign karne ke liye login required hai.')
      setAssigning(false)
      return
    }

    const updatePayload: any = {
      assigned_admin_id: user.id,
      reviewed_at: new Date().toISOString(),
    }

    if (application?.status === 'submitted') {
      updatePayload.status = 'under_review'
    }

    const { error } = await supabase
      .from('program_applications')
      .update(updatePayload)
      .eq('id', id)
      .eq('program_key', 'welfare')

    setAssigning(false)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadApplication()
  }

  async function clearReviewer() {
    setMessage('')
    setAssigning(true)

    const { error } = await supabase
      .from('program_applications')
      .update({ assigned_admin_id: null })
      .eq('id', id)
      .eq('program_key', 'welfare')

    setAssigning(false)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadApplication()
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setSaving(true)

    const now = new Date().toISOString()
    const nextDetails: WelfareApplicationDetails = {
      ...(application?.details || {}),
      verifier_remarks: form.verifierRemarks.trim(),
      welfare_committee_decision: form.committeeDecision,
      welfare_committee_members: form.committeeMembers.trim(),
      welfare_committee_remarks: form.committeeRemarks.trim(),
      welfare_committee_reviewed_at: form.committeeDecision !== 'pending' ? now : application?.details?.welfare_committee_reviewed_at,
      payment_status: form.paymentStatus,
      payment_reference: form.paymentReference.trim(),
      follow_up_notes: form.followUpNotes.trim(),
      case_close_report: form.caseCloseReport.trim(),
    }

    const updatePayload: any = {
      status: form.status,
      admin_remarks: form.adminRemarks.trim() || null,
      approved_amount: form.approvedAmount ? Number(form.approvedAmount) : null,
      details: nextDetails,
      reviewed_at: now,
    }

    if (['approved', 'paid_completed', 'completed'].includes(form.status)) {
      updatePayload.approved_at = application?.approved_at || now
    }

    if (form.status === 'completed') {
      updatePayload.completed_at = application?.completed_at || now
    }

    const { error } = await supabase
      .from('program_applications')
      .update(updatePayload)
      .eq('id', id)
      .eq('program_key', 'welfare')

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    await loadApplication()
    setMessage('Welfare case review saved successfully.')
  }

  async function updateDocumentStatus(document: WelfareDocumentRecord, status: string, note: string) {
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Document verify karne ke liye login required hai.')
      return
    }

    const { error } = await supabase
      .from('program_documents')
      .update({
        verification_status: status,
        is_verified: status === 'verified',
        admin_note: note.trim() || null,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq('id', document.id)
      .eq('program_key', 'welfare')

    if (error) {
      setMessage(error.message)
      return
    }

    await loadApplication()
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

  function printCloseReport() {
    if (!application) return
    const details = application.details || {}
    const reportHtml = `
      <!doctype html>
      <html>
        <head>
          <title>${sanitizeWelfareReportText(application.application_no || 'Welfare Case Report')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            .muted { color: #64748b; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 24px; }
            .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; }
            .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
            .value { margin-top: 6px; font-weight: 700; }
            .section { margin-top: 26px; }
            pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>JAS ${sanitizeWelfareReportText(copy.program.detailBadge)} Close Report</h1>
          <p class="muted">${sanitizeWelfareReportText(application.application_no || '-')}</p>
          <div class="grid">
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.program.applicantName)}</div><div class="value">${sanitizeWelfareReportText(application.applicant_name)}</div></div>
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.common.membershipNo)}</div><div class="value">${sanitizeWelfareReportText(application.membership_no)}</div></div>
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.program.caseType)}</div><div class="value">${sanitizeWelfareReportText(details.case_type)}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${sanitizeWelfareReportText(getWelfareStatusLabel(application.status))}</div></div>
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.common.requiredAmount)}</div><div class="value">${sanitizeWelfareReportText(formatWelfareMoney(details.required_amount))}</div></div>
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.common.approvedAmount)}</div><div class="value">${sanitizeWelfareReportText(application.approved_amount ? formatWelfareMoney(application.approved_amount) : '-')}</div></div>
            <div class="box"><div class="label">Fund Status</div><div class="value">${sanitizeWelfareReportText(getWelfarePaymentStatusLabel(details.payment_status))}</div></div>
            <div class="box"><div class="label">${sanitizeWelfareReportText(copy.common.committeeDecision)}</div><div class="value">${sanitizeWelfareReportText(getWelfareCommitteeDecisionLabel(details.welfare_committee_decision))}</div></div>
          </div>
          <div class="section"><h2>Case Reason</h2><pre>${sanitizeWelfareReportText(details.reason)}</pre></div>
          <div class="section"><h2>Verifier Remarks</h2><pre>${sanitizeWelfareReportText(details.verifier_remarks)}</pre></div>
          <div class="section"><h2>Committee Remarks</h2><pre>${sanitizeWelfareReportText(details.welfare_committee_remarks)}</pre></div>
          <div class="section"><h2>Case Close Report</h2><pre>${sanitizeWelfareReportText(details.case_close_report)}</pre></div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return
    printWindow.document.write(reportHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></main>
  }

  if (message && !application) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-900">
          <h1 className="text-2xl font-black">{copy.common.unableToLoad}</h1>
          <p className="mt-3 font-semibold">{message}</p>
          <Link to="/admin/programs/welfare" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-black text-white no-underline">{copy.common.back}</Link>
        </div>
      </main>
    )
  }

  if (!application) return null

  const details = application.details || {}

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <Link to="/admin/programs/welfare" className="inline-flex items-center text-sm font-bold text-amber-300 no-underline hover:text-amber-200"><ArrowLeft className="mr-2 h-4 w-4" /> {copy.program.detailBack}</Link>
          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold"><HandHeart className="h-4 w-4 text-amber-300" /> {application.application_no || copy.program.detailBadge}</div>
              <h1 className="mt-5 text-4xl font-black md:text-6xl">{application.applicant_name}</h1>
              <p className="mt-3 text-white/70">{application.district || '-'} / {application.taluka || '-'} • {application.phone}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-sm font-black ${getWelfareStatusClass(application.status)}`}>{getWelfareStatusLabel(application.status)}</span>
              <span className={`rounded-full border px-4 py-2 text-sm font-black ${getWelfareCasePriorityClass(details)}`}>{getWelfareCasePriorityLabel(details)}</span>
              <span className={`rounded-full border px-4 py-2 text-sm font-black ${getWelfareCommitteeDecisionClass(details.welfare_committee_decision)}`}>{getWelfareCommitteeDecisionLabel(details.welfare_committee_decision)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_420px]">
          <form onSubmit={saveReview} className="space-y-6">
            <Panel title={copy.program.caseSummary}>
              <InfoGrid rows={[
                [copy.program.applicantName, application.applicant_name],
                [copy.common.cnic, application.applicant_cnic || '-'],
                [copy.common.membershipNo, application.membership_no],
                [copy.common.relationship, application.relationship_to_member],
                [copy.program.caseType, details.case_type || '-'],
                [copy.common.requiredAmount, formatWelfareMoney(details.required_amount)],
                ['Family Members', details.family_members || '-'],
                ['Monthly Income', details.monthly_income || '-'],
              ]} />
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700"><strong>{copy.program.reason}:</strong> {details.reason || '-'}</div>
            </Panel>

            <Panel title={copy.program.reviewApproval}>
              <div className="grid gap-4 md:grid-cols-2">
                <Select label={copy.common.caseStatus} value={form.status} onChange={(value) => updateForm('status', value as WelfareStatus)} options={[
                  ['submitted', 'New'],
                  ['under_review', 'Under Verification'],
                  ['need_more_info', 'Need More Info'],
                  ['approved', 'Approved'],
                  ['rejected', 'Rejected'],
                  ['paid_completed', 'Fund Released'],
                  ['completed', 'Closed'],
                ]} />
                <Input label={copy.common.approvedAmount} value={form.approvedAmount} onChange={(value) => updateForm('approvedAmount', value)} />
                <Select label={copy.common.committeeDecision} value={form.committeeDecision} onChange={(value) => updateForm('committeeDecision', value)} options={welfareCommitteeDecisionOptions.map((item) => [item.value, item.label])} />
                <Select label="Fund Status" value={form.paymentStatus} onChange={(value) => updateForm('paymentStatus', value)} options={welfarePaymentStatusOptions.map((item) => [item.value, item.label])} />
                <Input label="Committee Members" value={form.committeeMembers} onChange={(value) => updateForm('committeeMembers', value)} />
                <Input label="Payment Reference" value={form.paymentReference} onChange={(value) => updateForm('paymentReference', value)} />
                <Textarea label="Verifier Remarks" value={form.verifierRemarks} onChange={(value) => updateForm('verifierRemarks', value)} />
                <Textarea label="Admin / Approval Remarks" value={form.adminRemarks} onChange={(value) => updateForm('adminRemarks', value)} />
                <Textarea label="Committee Remarks" value={form.committeeRemarks} onChange={(value) => updateForm('committeeRemarks', value)} />
                <Textarea label="Follow-up Notes" value={form.followUpNotes} onChange={(value) => updateForm('followUpNotes', value)} />
                <Textarea label="Case Close Report" value={form.caseCloseReport} onChange={(value) => updateForm('caseCloseReport', value)} className="md:col-span-2" />
              </div>
              {message ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">{message}</div> : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={printCloseReport} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700"><Printer className="mr-2 h-4 w-4" /> Print Close Report</button>
                <button type="submit" disabled={saving} className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-6 py-3 font-black no-underline transition disabled:opacity-60">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {copy.common.saveReview}
                </button>
              </div>
            </Panel>
          </form>

          <aside className="space-y-6">
            <Panel title="Reviewer">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Assigned:</strong> {application.assigned_admin_id ? 'Reviewer assigned' : 'Unassigned'}</div>
              <div className="mt-4 grid gap-3">
                <button type="button" onClick={assignToMe} disabled={assigning} className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 font-black no-underline transition disabled:opacity-60"><User className="mr-2 h-4 w-4" /> {copy.common.assignToMe}</button>
                <button type="button" onClick={clearReviewer} disabled={assigning} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700"><XCircle className="mr-2 h-4 w-4" /> {copy.common.clearReviewer}</button>
              </div>
            </Panel>

            <Panel title={copy.common.documents}>
              <div className="grid gap-3">
                {documents.length === 0 ? <p className="text-sm text-slate-600">No documents uploaded.</p> : null}
                {documents.map((document) => <DocumentReviewCard key={document.id} document={document} onOpen={() => openDocument(document)} onUpdate={(status, note) => updateDocumentStatus(document, status, note)} />)}
              </div>
            </Panel>
          </aside>
        </div>
      </section>
    </main>
  )
}

function DocumentReviewCard({ document, onOpen, onUpdate }: { document: WelfareDocumentRecord; onOpen: () => void; onUpdate: (status: string, note: string) => void }) {
  const [status, setStatus] = useState(document.verification_status || 'pending')
  const [note, setNote] = useState(document.admin_note || '')

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{getWelfareDocumentLabel(document.document_type)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{document.file_name || 'Document'} • {formatWelfareFileSize(document.file_size)}</p>
        </div>
        <button type="button" onClick={onOpen} className="rounded-xl bg-white p-2 text-slate-600 shadow-sm"><Download className="h-4 w-4" /></button>
      </div>
      <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getWelfareDocumentStatusClass(document.verification_status)}`}>{getWelfareDocumentStatusLabel(document.verification_status)}</span>
      <div className="mt-4 grid gap-3">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500">
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="needs_reupload">Needs Re-upload</option>
        </select>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Document note" rows={2} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500" />
        <button type="button" onClick={() => onUpdate(status, note)} className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"><CheckCircle2 className="mr-2 h-4 w-4" /> Save Document</button>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 flex items-center gap-2 text-xl font-black text-slate-950"><FileCheck2 className="h-5 w-5 text-amber-700" />{title}</h2>{children}</section>
}

function InfoGrid({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <div className="grid gap-3 text-sm md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><div className="mt-1 font-bold text-slate-800">{value}</div></div>)}</div>
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500" /></label>
}

function Textarea({ label, value, onChange, className = '' }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`grid gap-2 text-sm font-bold text-slate-700 ${className}`}><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500" /></label>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500">{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
}

async function ensureWelfareAdminAccess(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { ok: false, message: 'Admin panel dekhne ke liye pehle login karen.' }

  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).returns<UserRoleRow[]>()
  if (rolesError) return { ok: false, message: rolesError.message }

  const hasGlobalAccess = (roles || []).some((item) => ['admin', 'super_admin', 'welfare_admin'].includes(item.role))
  if (hasGlobalAccess) return { ok: true }

  const { data: assignments, error: assignmentError } = await supabase.from('program_admin_assignments').select('id, can_view').eq('user_id', user.id).eq('program_key', 'welfare').eq('can_view', true).limit(1).returns<AssignmentRow[]>()
  if (assignmentError) return { ok: false, message: assignmentError.message }
  if (assignments?.length) return { ok: true }

  return { ok: false, message: 'Aap ke account ko Welfare Admin access nahi mila.' }
}
