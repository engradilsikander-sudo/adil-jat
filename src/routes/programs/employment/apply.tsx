import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useProgramApplyCopy } from '../../../lib/program-apply-i18n'
import type { Database } from '../../../lib/supabase/database.types'
import {
  EMPLOYMENT_DOCUMENT_ACCEPT,
  EMPLOYMENT_DOCUMENT_BUCKET,
  createEmploymentDocumentStoragePath,
  currentEmploymentStatusOptions,
  employmentDocumentOptions,
  employmentRequiredDocumentTypes,
  employmentTypeOptions,
  formatEmploymentFileSize,
  normalizeSkills,
  parseVerifyMembershipResult,
  trainingInterestOptions,
  validateEmploymentDocumentFile,
  type EmploymentCurrentStatus,
  type EmploymentDocumentType,
  type EmploymentType,
  type TrainingInterest,
  type VerifyMembershipResult,
} from '../../../lib/programs/employment'

export const Route = createFileRoute('/programs/employment/apply')({
  component: EmploymentApplyPage,
})

type ProgramDocumentInsert = Database['public']['Tables']['program_documents']['Insert']

type FormState = {
  membershipNo: string
  educationLevel: string
  fieldOfStudy: string
  skills: string
  experienceYears: string
  experienceSummary: string
  preferredJobLocation: string
  expectedSalary: string
  employmentType: EmploymentType
  currentEmploymentStatus: EmploymentCurrentStatus
  trainingInterest: TrainingInterest
  skillDevelopmentRequest: string
  cvSummary: string
  availability: string
}

const initialForm: FormState = {
  membershipNo: '',
  educationLevel: '',
  fieldOfStudy: '',
  skills: '',
  experienceYears: '',
  experienceSummary: '',
  preferredJobLocation: '',
  expectedSalary: '',
  employmentType: 'any',
  currentEmploymentStatus: 'unemployed',
  trainingInterest: 'computer_skills',
  skillDevelopmentRequest: '',
  cvSummary: '',
  availability: '',
}

function EmploymentApplyPage() {
  const { copy, textDir, textAlignClass, iconBeforeClass } = useProgramApplyCopy('employment')
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(initialForm)
  const [membership, setMembership] = useState<VerifyMembershipResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<Partial<Record<EmploymentDocumentType, File>>>({})

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function verifyMembership() {
    const membershipNo = form.membershipNo.trim().toUpperCase()

    if (!membershipNo) {
      setMessage('Membership number enter karen.')
      return
    }

    setVerifying(true)
    setMessage('')
    setMembership(null)

    const { data, error } = await supabase.rpc('verify_membership_no', {
      _membership_no: membershipNo,
    })

    setVerifying(false)

    if (error) {
      setMessage(error.message)
      return
    }

    const result = parseVerifyMembershipResult(data)
    setMembership(result)

    if (!result.verified || !result.member) {
      setMessage(result.message || 'Approved membership record nahi mila.')
      return
    }

    setForm((current) => ({ ...current, membershipNo: result.member?.member_no || membershipNo }))
  }

  function handleFileChange(
    type: EmploymentDocumentType,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const validation = validateEmploymentDocumentFile(file)
    if (validation) {
      setMessage(validation)
      return
    }

    setFiles((current) => ({ ...current, [type]: file }))
    setMessage('')
  }

  function removeFile(type: EmploymentDocumentType) {
    setFiles((current) => {
      const next = { ...current }
      delete next[type]
      return next
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Employment profile submit karne ke liye login zaroori hai.')
      return
    }

    if (!membership?.verified || !membership.member) {
      setMessage('Pehle approved membership number verify karen.')
      return
    }

    const missingDocs = employmentRequiredDocumentTypes.filter((type) => !files[type])
    if (missingDocs.length) {
      setMessage('CV/Resume aur CNIC copy upload karna zaroori hai.')
      return
    }

    const skills = normalizeSkills(form.skills)
    if (!form.educationLevel.trim() || !skills.length || !form.preferredJobLocation.trim()) {
      setMessage('Education, skills aur preferred job location required hain.')
      return
    }

    setSubmitting(true)

    const details = {
      father_name: membership.member.father_name,
      member_no: membership.member.member_no,
      cnic: membership.member.cnic || '',
      education_level: form.educationLevel.trim(),
      field_of_study: form.fieldOfStudy.trim(),
      skills,
      experience_years: form.experienceYears.trim(),
      experience_summary: form.experienceSummary.trim(),
      preferred_job_location: form.preferredJobLocation.trim(),
      expected_salary: form.expectedSalary.trim(),
      employment_type: form.employmentType,
      current_employment_status: form.currentEmploymentStatus,
      training_interest: form.trainingInterest,
      skill_development_request: form.skillDevelopmentRequest.trim(),
      cv_summary: form.cvSummary.trim(),
      availability: form.availability.trim(),
      shortlist_status: 'not_shortlisted',
      placement_status: 'not_placed',
    }

    const { data: application, error: applicationError } = await supabase
      .from('program_applications')
      .insert({
        program_key: 'employment',
        applicant_user_id: user.id,
        member_id: membership.member.id,
        membership_no: membership.member.member_no,
        applicant_name: membership.member.full_name,
        applicant_cnic: membership.member.cnic || null,
        phone: membership.member.mobile || '',
        district: membership.member.district || null,
        taluka: membership.member.taluka || null,
        address: membership.member.address || null,
        relationship_to_member: 'self',
        details,
        status: 'submitted',
      })
      .select('id')
      .single()

    if (applicationError || !application) {
      setSubmitting(false)
      setMessage(applicationError?.message || 'Employment profile submit nahi ho saka.')
      return
    }

    const documentRows: ProgramDocumentInsert[] = []

    for (const option of employmentDocumentOptions) {
      const file = files[option.type]
      if (!file) continue

      const filePath = createEmploymentDocumentStoragePath({
        userId: user.id,
        applicationId: application.id,
        documentType: option.type,
        fileName: file.name,
      })

      const { error: uploadError } = await supabase.storage
        .from(EMPLOYMENT_DOCUMENT_BUCKET)
        .upload(filePath, file, { upsert: false, contentType: file.type })

      if (uploadError) {
        setSubmitting(false)
        setMessage(`Application save ho gayi, lekin ${option.label} upload nahi hui: ${uploadError.message}`)
        return
      }

      documentRows.push({
        application_id: application.id,
        program_key: 'employment',
        document_type: option.type,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        verification_status: 'pending',
        is_verified: false,
      })
    }

    if (documentRows.length) {
      const { error: docsError } = await supabase
        .from('program_documents')
        .insert(documentRows)

      if (docsError) {
        setSubmitting(false)
        setMessage(`Application save ho gayi, lekin document records save nahi hue: ${docsError.message}`)
        return
      }
    }

    setSubmitting(false)
    await navigate({ to: '/programs/employment/my-applications' })
  }

  const member = membership?.verified ? membership.member : null

  return (
    <main className="program-apply-page min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-10" dir="ltr">
      <div className="mx-auto max-w-5xl">
        <Link to="/programs/employment" className="text-sm font-black text-emerald-700 no-underline">
          ← {copy.program.back}
        </Link>

        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className={`mb-7 flex flex-wrap items-start justify-between gap-4 ${textAlignClass}`} dir={textDir}>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
                <BriefcaseBusiness className="h-4 w-4" />
                {copy.program.badge}
              </div>
              <h1 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
                {copy.program.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                {copy.program.description}
              </p>
            </div>
          </div>

          {message ? (
            <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="program-apply-form space-y-8">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-black text-slate-950">{copy.program.verifyMembership}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={form.membershipNo}
                  onChange={(event) => update('membershipNo', event.target.value)}
                  placeholder="JAS-2026-0001"
                  className="h-12 rounded-2xl border border-slate-300 bg-white px-4 font-semibold outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={verifyMembership}
                  disabled={verifying}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 font-black text-white disabled:opacity-60"
                >
                  {verifying ? <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} /> : null}
                  {copy.common.verify}
                </button>
              </div>

              {member ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-black">
                    <CheckCircle2 className="h-4 w-4" /> Verified Member
                  </div>
                  <p className="mt-2"><strong>{copy.common.name}:</strong> {member.full_name}</p>
                  <p><strong>{copy.common.father}:</strong> {member.father_name}</p>
                  <p><strong>{copy.common.memberId}:</strong> {member.member_no}</p>
                </div>
              ) : null}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <Field label={copy.program.educationLevel} required>
                <input value={form.educationLevel} onChange={(event) => update('educationLevel', event.target.value)} className="input-clean" placeholder={copy.program.educationPlaceholder} />
              </Field>
              <Field label={copy.program.fieldOfStudy}>
                <input value={form.fieldOfStudy} onChange={(event) => update('fieldOfStudy', event.target.value)} className="input-clean" placeholder={copy.program.fieldPlaceholder} />
              </Field>
              <Field label={copy.program.skills} required>
                <input value={form.skills} onChange={(event) => update('skills', event.target.value)} className="input-clean" placeholder={copy.program.skillsPlaceholder} />
              </Field>
              <Field label={copy.program.experienceYears}>
                <input value={form.experienceYears} onChange={(event) => update('experienceYears', event.target.value)} className="input-clean" placeholder={copy.program.experiencePlaceholder} />
              </Field>
              <Field label={copy.program.preferredJobLocation} required>
                <input value={form.preferredJobLocation} onChange={(event) => update('preferredJobLocation', event.target.value)} className="input-clean" placeholder={copy.program.locationPlaceholder} />
              </Field>
              <Field label={copy.program.expectedSalary}>
                <input value={form.expectedSalary} onChange={(event) => update('expectedSalary', event.target.value)} className="input-clean" placeholder={copy.program.salaryPlaceholder} />
              </Field>
              <Field label={copy.program.employmentType}>
                <select value={form.employmentType} onChange={(event) => update('employmentType', event.target.value as EmploymentType)} className="input-clean">
                  {employmentTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label={copy.program.currentEmploymentStatus}>
                <select value={form.currentEmploymentStatus} onChange={(event) => update('currentEmploymentStatus', event.target.value as EmploymentCurrentStatus)} className="input-clean">
                  {currentEmploymentStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label={copy.program.trainingInterest}>
                <select value={form.trainingInterest} onChange={(event) => update('trainingInterest', event.target.value as TrainingInterest)} className="input-clean">
                  {trainingInterestOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label={copy.program.availability}>
                <input value={form.availability} onChange={(event) => update('availability', event.target.value)} className="input-clean" placeholder={copy.program.availabilityPlaceholder} />
              </Field>
              <Field label={copy.program.experienceSummary} full>
                <textarea value={form.experienceSummary} onChange={(event) => update('experienceSummary', event.target.value)} className="input-clean min-h-28" placeholder={copy.program.experienceSummaryPlaceholder} />
              </Field>
              <Field label={copy.program.skillDevelopmentRequest} full>
                <textarea value={form.skillDevelopmentRequest} onChange={(event) => update('skillDevelopmentRequest', event.target.value)} className="input-clean min-h-28" placeholder={copy.program.skillRequestPlaceholder} />
              </Field>
              <Field label={copy.program.cvSummary} full>
                <textarea value={form.cvSummary} onChange={(event) => update('cvSummary', event.target.value)} className="input-clean min-h-28" placeholder={copy.program.cvSummaryPlaceholder} />
              </Field>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">{copy.program.documentReview}</h2>
              <p className="mt-2 text-sm text-slate-600">
                {copy.common.uploadHint5}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {employmentDocumentOptions.map((option) => {
                  const file = files[option.type]
                  return (
                    <div key={option.type} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-slate-950">{option.label} {option.required ? <span className="text-red-500">*</span> : null}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{option.description}</p>
                        </div>
                        <FileText className="h-5 w-5 text-emerald-700" />
                      </div>
                      {file ? (
                        <div className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700">
                          <p>{file.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatEmploymentFileSize(file.size)}</p>
                          <button type="button" onClick={() => removeFile(option.type)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-red-600">
                            <Trash2 className="h-3.5 w-3.5" /> {copy.common.remove}
                          </button>
                        </div>
                      ) : (
                        <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-slate-200 hover:bg-emerald-50">
                          <Upload className={`${iconBeforeClass} h-4 w-4`} /> {copy.common.uploadFile}
                          <input type="file" accept={EMPLOYMENT_DOCUMENT_ACCEPT} className="sr-only" onChange={(event) => handleFileChange(option.type, event)} />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-700 px-5 font-black text-white transition hover:bg-emerald-800 disabled:opacity-60 md:w-auto"
            >
              {submitting ? <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} /> : null}
              {submitting ? copy.program.submitting : copy.program.submitProfile}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}

function Field({ label, children, required, full }: { label: string; children: ReactNode; required?: boolean; full?: boolean }) {
  return (
    <label className={full ? 'md:col-span-2' : ''}>
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}
