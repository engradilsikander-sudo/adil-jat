// src/routes/programs/health/apply.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  CheckCircle2,
  FileHeart,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramApplyCopy } from '../../../lib/program-apply-i18n'
import {
  HEALTH_DOCUMENT_ACCEPT,
  HEALTH_DOCUMENT_BUCKET,
  createHealthDocumentStoragePath,
  formatHealthFileSize,
  healthDocumentOptions,
  healthRequiredDocumentTypes,
  patientGenderOptions,
  relationshipOptions,
  treatmentTypeOptions,
  validateHealthDocumentFile,
  type HealthDocumentType,
  type MemberRelationship,
  type VerifyMembershipResult,
} from '../../../lib/programs/health'

export const Route = createFileRoute('/programs/health/apply')({
  component: HealthApplyPage,
})

type HealthFormState = {
  membershipNo: string
  relationshipToMember: MemberRelationship

  patientName: string
  guardianName: string
  patientCnic: string
  patientAge: string
  patientGender: string
  phone: string
  email: string
  district: string
  taluka: string
  address: string

  diseaseName: string
  treatmentType: string
  hospitalName: string
  doctorName: string
  doctorContact: string
  estimatedCost: string
  requiredAmount: string
  emergency: boolean
  caseSummary: string
}

type DocumentFileState = Partial<Record<HealthDocumentType, File | null>>

const initialForm: HealthFormState = {
  membershipNo: '',
  relationshipToMember: 'self',

  patientName: '',
  guardianName: '',
  patientCnic: '',
  patientAge: '',
  patientGender: 'Male',
  phone: '',
  email: '',
  district: '',
  taluka: '',
  address: '',

  diseaseName: '',
  treatmentType: 'Medicine Support',
  hospitalName: '',
  doctorName: '',
  doctorContact: '',
  estimatedCost: '',
  requiredAmount: '',
  emergency: false,
  caseSummary: '',
}

function HealthApplyPage() {
  const { copy, textDir, textAlignClass, iconBeforeClass } = useProgramApplyCopy('health')
  const navigate = useNavigate()

  const [form, setForm] = useState<HealthFormState>(initialForm)
  const [documentFiles, setDocumentFiles] = useState<DocumentFileState>({})
  const [verifiedMember, setVerifiedMember] =
    useState<VerifyMembershipResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function updateField<K extends keyof HealthFormState>(
    key: K,
    value: HealthFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateDocumentFile(
    documentType: HealthDocumentType,
    file: File | null,
  ) {
    setDocumentFiles((prev) => ({ ...prev, [documentType]: file }))
  }

  function handleDocumentChange(
    documentType: HealthDocumentType,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setMessage('')
    const file = event.currentTarget.files?.[0] ?? null

    if (!file) {
      updateDocumentFile(documentType, null)
      return
    }

    const validation = validateHealthDocumentFile(file)

    if (!validation.ok) {
      setMessage(validation.message)
      event.currentTarget.value = ''
      updateDocumentFile(documentType, null)
      return
    }

    updateDocumentFile(documentType, file)
  }

  async function verifyMembershipNo() {
    setMessage('')
    setVerifiedMember(null)

    if (!form.membershipNo.trim()) {
      setMessage('Membership number required hai.')
      return
    }

    setVerifying(true)

    const { data, error } = await supabase.rpc('verify_membership_no', {
      _membership_no: form.membershipNo.trim(),
    })

    setVerifying(false)

    if (error) {
      setMessage(error.message)
      return
    }

    const result = data as unknown as VerifyMembershipResult

    if (!result.valid) {
      setVerifiedMember(result)
      setMessage(result.reason || 'Membership verification failed.')
      return
    }

    setVerifiedMember(result)
    setForm((prev) => ({
      ...prev,
      membershipNo: result.membership_no || prev.membershipNo,
      district: prev.district || result.district || '',
      taluka: prev.taluka || result.taluka || '',
    }))
    setMessage('Membership verified successfully.')
  }

  function validateRequiredDocuments() {
    const missingDocuments = healthRequiredDocumentTypes.filter(
      (documentType) => !documentFiles[documentType],
    )

    if (missingDocuments.length > 0) {
      const labels = missingDocuments
        .map(
          (documentType) =>
            healthDocumentOptions.find((item) => item.type === documentType)
              ?.label ?? documentType,
        )
        .join(', ')

      return `Required documents upload karen: ${labels}`
    }

    return ''
  }

  async function uploadApplicationDocuments({
    userId,
    applicationId,
  }: {
    userId: string
    applicationId: string
  }) {
    const selectedDocuments = healthDocumentOptions.filter(
      (document) => documentFiles[document.type],
    )

    for (const document of selectedDocuments) {
      const file = documentFiles[document.type]
      if (!file) continue

      const validation = validateHealthDocumentFile(file)
      if (!validation.ok) {
        throw new Error(`${document.label}: ${validation.message}`)
      }

      const filePath = createHealthDocumentStoragePath({
        userId,
        applicationId,
        documentType: document.type,
        fileName: file.name,
      })

      const { error: uploadError } = await supabase.storage
        .from(HEALTH_DOCUMENT_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`${document.label}: ${uploadError.message}`)
      }

      const { error: documentError } = await supabase
        .from('program_documents')
        .insert({
          application_id: applicationId,
          program_key: 'health',
          uploaded_by: userId,
          document_type: document.type,
          file_path: filePath,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          verification_status: 'pending',
          is_verified: false,
        })

      if (documentError) {
        throw new Error(`${document.label}: ${documentError.message}`)
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Application submit karne ke liye pehle login/signup karen.')
      return
    }

    if (!verifiedMember?.valid) {
      setMessage('Pehle membership number verify karen.')
      return
    }

    if (!form.patientName.trim()) {
      setMessage('Patient full name required hai.')
      return
    }

    if (!form.phone.trim()) {
      setMessage('Phone number required hai.')
      return
    }

    if (!form.diseaseName.trim()) {
      setMessage('Disease / medical condition required hai.')
      return
    }

    if (!form.caseSummary.trim()) {
      setMessage('Case summary required hai.')
      return
    }

    const documentError = validateRequiredDocuments()
    if (documentError) {
      setMessage(documentError)
      return
    }

    setSubmitting(true)

    const details = {
      patient_age: form.patientAge.trim(),
      patient_gender: form.patientGender,
      guardian_name: form.guardianName.trim(),
      disease_name: form.diseaseName.trim(),
      treatment_type: form.treatmentType,
      hospital_name: form.hospitalName.trim(),
      doctor_name: form.doctorName.trim(),
      doctor_contact: form.doctorContact.trim(),
      estimated_cost: form.estimatedCost.trim(),
      required_amount: form.requiredAmount.trim(),
      emergency: form.emergency,
      case_priority: form.emergency ? 'emergency' : 'normal',
      case_summary: form.caseSummary.trim(),
      payment_status: 'not_started',
    }

    const { data: applicationRow, error: applicationError } = await supabase
      .from('program_applications')
      .insert({
        program_key: 'health',
        applicant_user_id: user.id,
        membership_no: form.membershipNo.trim(),
        relationship_to_member: form.relationshipToMember,
        applicant_name: form.patientName.trim(),
        applicant_cnic: form.patientCnic.trim() || null,
        phone: form.phone.trim(),
        email: form.email.trim() || user.email || null,
        district: form.district.trim() || null,
        taluka: form.taluka.trim() || null,
        address: form.address.trim() || null,
        details,
        status: 'submitted',
      })
      .select('id')
      .single()

    if (applicationError || !applicationRow?.id) {
      setSubmitting(false)
      setMessage(applicationError?.message || 'Application submit nahi ho saki.')
      return
    }

    try {
      await uploadApplicationDocuments({
        userId: user.id,
        applicationId: applicationRow.id,
      })
    } catch (error) {
      setSubmitting(false)
      setMessage(
        error instanceof Error
          ? `Application submit ho gayi, lekin document upload me issue aya: ${error.message}`
          : 'Application submit ho gayi, lekin document upload me issue aya.',
      )
      return
    }

    setSubmitting(false)
    await navigate({ to: '/programs/health/my-applications' })
  }

  return (
    <main className="program-apply-page min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className={`max-w-3xl space-y-5 ${textAlignClass}`} dir={textDir}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-red-300" />
              {copy.program.badge}
            </div>

            <h1 className="text-4xl font-black md:text-6xl">
              {copy.program.title}
            </h1>

            <p className="text-lg leading-8 text-white/75">
              {copy.program.description}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-16">
        <form onSubmit={handleSubmit} className="program-apply-form mx-auto grid max-w-6xl gap-6">
          <FormCard title={copy.common.membershipVerification}>
            <p className="text-sm leading-7 text-slate-600">
              {copy.common.verifyMembershipText}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <input
                value={form.membershipNo}
                onChange={(event) =>
                  updateField('membershipNo', event.target.value)
                }
                placeholder={copy.common.membershipPlaceholder}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-red-500"
              />

              <button
                type="button"
                onClick={verifyMembershipNo}
                disabled={verifying}
                className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-6 py-3 font-black no-underline transition disabled:opacity-60"
              >
                {verifying ? (
                  <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} />
                ) : (
                  <CheckCircle2 className={`${iconBeforeClass} h-4 w-4`} />
                )}
                {copy.common.verify}
              </button>
            </div>

            {verifiedMember?.valid ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {copy.common.verified}: {verifiedMember.full_name || copy.common.approvedMember} —{' '}
                {verifiedMember.district || copy.common.district} /{' '}
                {verifiedMember.taluka || copy.common.taluka}
              </div>
            ) : null}
          </FormCard>

          <FormCard title={copy.program.patientDetails}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput value={form.patientName} onChange={(value) => updateField('patientName', value)} placeholder={copy.program.patientName} />
              <TextInput value={form.guardianName} onChange={(value) => updateField('guardianName', value)} placeholder={copy.program.guardianName} />
              <select
                value={form.relationshipToMember}
                onChange={(event) =>
                  updateField(
                    'relationshipToMember',
                    event.target.value as MemberRelationship,
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500"
              >
                {relationshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {copy.common.relationship}: {option.label}
                  </option>
                ))}
              </select>
              <TextInput value={form.patientCnic} onChange={(value) => updateField('patientCnic', value)} placeholder={copy.program.patientCnic} />
              <TextInput value={form.patientAge} onChange={(value) => updateField('patientAge', value)} placeholder={copy.program.patientAge} />
              <select
                value={form.patientGender}
                onChange={(event) => updateField('patientGender', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500"
              >
                {patientGenderOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <TextInput value={form.phone} onChange={(value) => updateField('phone', value)} placeholder={copy.common.phone} />
              <TextInput value={form.email} onChange={(value) => updateField('email', value)} placeholder={copy.common.emailOptional} />
              <TextInput value={form.district} onChange={(value) => updateField('district', value)} placeholder={copy.common.district} />
              <TextInput value={form.taluka} onChange={(value) => updateField('taluka', value)} placeholder={copy.common.taluka} />
              <textarea
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                placeholder={copy.common.address}
                rows={3}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500 md:col-span-2"
              />
            </div>
          </FormCard>

          <FormCard title={copy.program.caseDetails}>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput value={form.diseaseName} onChange={(value) => updateField('diseaseName', value)} placeholder={copy.program.diseaseName} />
              <select
                value={form.treatmentType}
                onChange={(event) => updateField('treatmentType', event.target.value)}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500"
              >
                {treatmentTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <TextInput value={form.hospitalName} onChange={(value) => updateField('hospitalName', value)} placeholder={copy.program.hospitalName} />
              <TextInput value={form.doctorName} onChange={(value) => updateField('doctorName', value)} placeholder={copy.program.doctorName} />
              <TextInput value={form.doctorContact} onChange={(value) => updateField('doctorContact', value)} placeholder={copy.program.doctorContact} />
              <TextInput value={form.estimatedCost} onChange={(value) => updateField('estimatedCost', value)} placeholder={copy.program.estimatedCost} />
              <TextInput value={form.requiredAmount} onChange={(value) => updateField('requiredAmount', value)} placeholder={copy.program.requiredAmount} />
              <label className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
                <input
                  type="checkbox"
                  checked={form.emergency}
                  onChange={(event) => updateField('emergency', event.target.checked)}
                  className="h-4 w-4"
                />
                Emergency case
              </label>
              <textarea
                value={form.caseSummary}
                onChange={(event) => updateField('caseSummary', event.target.value)}
                placeholder={copy.program.caseSummary}
                rows={5}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500 md:col-span-2"
              />
            </div>
          </FormCard>

          <FormCard title={copy.program.documentsTitle}>
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="font-semibold leading-6">
                Medical documents private hain. Sirf applicant aur authorized
                health admin/committee in documents ko open kar sakte hain.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {healthDocumentOptions.map((document) => {
                const file = documentFiles[document.type]

                return (
                  <div
                    key={document.type}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">
                          {document.label}{' '}
                          {document.required ? (
                            <span className="text-red-600">*</span>
                          ) : null}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {document.description}
                        </p>
                      </div>
                      <FileHeart className="h-5 w-5 flex-shrink-0 text-red-500" />
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-black text-slate-700 transition hover:border-red-400 hover:text-red-700">
                      <Upload className={`${iconBeforeClass} h-4 w-4`} />
                      Upload Document
                      <input
                        type="file"
                        accept={HEALTH_DOCUMENT_ACCEPT}
                        onChange={(event) =>
                          handleDocumentChange(document.type, event)
                        }
                        className="sr-only"
                      />
                    </label>

                    {file ? (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm shadow-sm">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-800">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatHealthFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateDocumentFile(document.type, null)}
                          className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                          aria-label={`Remove ${document.label}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <p className="mt-4 text-sm text-slate-500">
              {copy.common.uploadHint8}
            </p>
          </FormCard>

          {message ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              {message}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                {copy.common.submitApplication}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {copy.program.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/programs/health"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 no-underline transition hover:bg-slate-50"
              >
                {copy.common.back}
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-red-500 px-6 py-3 font-black text-slate-950 transition hover:bg-red-400 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} />
                ) : (
                  <HeartPulse className={`${iconBeforeClass} h-4 w-4`} />
                )}
                {submitting ? copy.common.submitting : copy.common.submitApplication}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  )
}

function FormCard({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="mb-5 text-2xl font-black text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500"
    />
  )
}
