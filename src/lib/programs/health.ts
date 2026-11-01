import { localizedProgramLabel, type ProgramLabelMap } from '../program-status-i18n'

export type HealthStatus =
  | 'submitted'
  | 'under_review'
  | 'need_more_info'
  | 'approved'
  | 'rejected'
  | 'paid_completed'
  | 'completed'

export type HealthDocumentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'needs_reupload'

export type HealthDocumentType =
  | 'patient_cnic_bform'
  | 'member_cnic'
  | 'medical_reports'
  | 'doctor_prescription'
  | 'hospital_estimate'
  | 'lab_reports'
  | 'other'

export type HealthPaymentStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'partially_released'
  | 'released'
  | 'completed'

export type HealthCommitteeDecision =
  | 'pending'
  | 'recommended'
  | 'not_recommended'
  | 'approved'
  | 'rejected'
  | 'deferred'

export type HealthTreatmentType =
  | 'Emergency Treatment'
  | 'Surgery'
  | 'Medicine Support'
  | 'Lab Tests'
  | 'Hospital Admission'
  | 'Follow-up Treatment'
  | 'Chronic Disease Support'
  | 'Other'

export type MemberRelationship =
  | 'self'
  | 'son'
  | 'daughter'
  | 'father'
  | 'mother'
  | 'brother'
  | 'sister'
  | 'wife'
  | 'husband'
  | 'guardian'
  | 'other'

export type VerifyMembershipResult = {
  valid: boolean
  reason?: string
  member_id?: string
  membership_no?: string
  full_name?: string
  district?: string
  taluka?: string
  status?: string
}

export type HealthApplicationDetails = {
  case_priority?: 'emergency' | 'urgent' | 'normal' | string
  patient_age?: string
  patient_gender?: string
  guardian_name?: string
  disease_name?: string
  treatment_type?: string
  hospital_name?: string
  doctor_name?: string
  doctor_contact?: string
  estimated_cost?: string
  required_amount?: string
  emergency?: boolean
  case_summary?: string
  medical_committee_remarks?: string
  health_committee_decision?: HealthCommitteeDecision | string
  health_committee_reviewed_at?: string
  health_committee_members?: string
  health_committee_remarks?: string
  payment_status?: HealthPaymentStatus | string
  follow_up_notes?: string
  case_close_report?: string
}

export type HealthDocumentConfig = {
  type: HealthDocumentType
  label: string
  description: string
  required: boolean
}

export type HealthDocumentRecord = {
  id: string
  application_id: string
  program_key: 'health'
  uploaded_by: string
  document_type: HealthDocumentType | string
  file_path: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  verification_status: HealthDocumentVerificationStatus | string
  is_verified: boolean
  admin_note: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export const HEALTH_DOCUMENT_BUCKET = 'health-documents'

export const HEALTH_MAX_DOCUMENT_SIZE_MB = 8

export const HEALTH_MAX_DOCUMENT_SIZE_BYTES =
  HEALTH_MAX_DOCUMENT_SIZE_MB * 1024 * 1024

export const HEALTH_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'

export const HEALTH_ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const relationshipOptions: Array<{
  value: MemberRelationship
  label: string
}> = [
  { value: 'self', label: 'Self' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'wife', label: 'Wife' },
  { value: 'husband', label: 'Husband' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
]

export const patientGenderOptions = ['Male', 'Female', 'Other']

export const treatmentTypeOptions: HealthTreatmentType[] = [
  'Emergency Treatment',
  'Surgery',
  'Medicine Support',
  'Lab Tests',
  'Hospital Admission',
  'Follow-up Treatment',
  'Chronic Disease Support',
  'Other',
]

export const healthPaymentStatusOptions: Array<{
  value: HealthPaymentStatus
  label: string
}> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending', label: 'Payment Pending' },
  { value: 'approved', label: 'Payment Approved' },
  { value: 'partially_released', label: 'Partially Released' },
  { value: 'released', label: 'Released' },
  { value: 'completed', label: 'Completed' },
]

export const healthCommitteeDecisionOptions: Array<{
  value: HealthCommitteeDecision
  label: string
}> = [
  { value: 'pending', label: 'Pending Committee Review' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'not_recommended', label: 'Not Recommended' },
  { value: 'approved', label: 'Committee Approved' },
  { value: 'rejected', label: 'Committee Rejected' },
  { value: 'deferred', label: 'Deferred / More Info Needed' },
]

export const healthDocumentOptions: HealthDocumentConfig[] = [
  {
    type: 'patient_cnic_bform',
    label: 'Patient CNIC / B-form',
    description: 'Upload patient CNIC, B-form or identity document copy.',
    required: true,
  },
  {
    type: 'member_cnic',
    label: 'Member CNIC',
    description: 'Upload approved JAS member CNIC copy.',
    required: true,
  },
  {
    type: 'medical_reports',
    label: 'Medical Reports',
    description: 'Upload diagnosis report, discharge summary or case report.',
    required: true,
  },
  {
    type: 'doctor_prescription',
    label: 'Doctor Prescription',
    description: 'Upload doctor prescription or treatment advice.',
    required: true,
  },
  {
    type: 'hospital_estimate',
    label: 'Hospital Estimate',
    description: 'Upload hospital estimate, bill or treatment cost proof.',
    required: true,
  },
  {
    type: 'lab_reports',
    label: 'Lab Reports',
    description: 'Upload lab reports if available.',
    required: false,
  },
  {
    type: 'other',
    label: 'Other Supporting Document',
    description: 'Upload any other supporting medical document if needed.',
    required: false,
  },
]

export const healthRequiredDocumentTypes = healthDocumentOptions
  .filter((item) => item.required)
  .map((item) => item.type)

export const healthStatusLabels: Record<HealthStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Medical Review',
  need_more_info: 'Need More Info',
  approved: 'Approved',
  rejected: 'Rejected',
  paid_completed: 'Payment Released',
  completed: 'Case Closed',
}

export const healthDocumentStatusLabels: Record<
  HealthDocumentVerificationStatus,
  string
> = {
  pending: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_reupload: 'Needs Re-upload',
}

const healthStatusLabelTranslations: Record<HealthStatus, ProgramLabelMap> = {
  submitted: { en: 'Submitted', ur: 'جمع شدہ', sd: 'جمع ٿيل' },
  under_review: { en: 'Under Medical Review', ur: 'طبی جائزہ جاری', sd: 'طبي جائزو جاري' },
  need_more_info: { en: 'Need More Info', ur: 'مزید معلومات درکار', sd: 'وڌيڪ معلومات گهربل' },
  approved: { en: 'Approved', ur: 'منظور شدہ', sd: 'منظور ٿيل' },
  rejected: { en: 'Rejected', ur: 'مسترد', sd: 'رد ٿيل' },
  paid_completed: { en: 'Payment Released', ur: 'ادائیگی جاری', sd: 'ادائيگي جاري' },
  completed: { en: 'Closed', ur: 'بند', sd: 'بند' },
}

const healthDocumentStatusLabelTranslations: Record<
  HealthDocumentVerificationStatus,
  ProgramLabelMap
> = {
  pending: { en: 'Pending Verification', ur: 'تصدیق باقی', sd: 'تصديق باقي' },
  verified: { en: 'Verified', ur: 'تصدیق شدہ', sd: 'تصديق ٿيل' },
  rejected: { en: 'Rejected', ur: 'مسترد', sd: 'رد ٿيل' },
  needs_reupload: { en: 'Needs Re-upload', ur: 'دوبارہ اپلوڈ درکار', sd: 'ٻيهر اپلوڊ گهربل' },
}

const healthPaymentStatusLabelTranslations: Record<HealthPaymentStatus, ProgramLabelMap> = {
  not_started: { en: 'Not Started', ur: 'شروع نہیں ہوا', sd: 'شروع نه ٿيو' },
  pending: { en: 'Payment Pending', ur: 'ادائیگی باقی', sd: 'ادائيگي باقي' },
  approved: { en: 'Payment Approved', ur: 'ادائیگی منظور', sd: 'ادائيگي منظور' },
  partially_released: { en: 'Partially Released', ur: 'جزوی جاری', sd: 'جزوي جاري' },
  released: { en: 'Payment Released', ur: 'ادائیگی جاری', sd: 'ادائيگي جاري' },
  completed: { en: 'Completed', ur: 'مکمل', sd: 'مڪمل' },
}

const healthCommitteeDecisionLabelTranslations: Record<HealthCommitteeDecision, ProgramLabelMap> = {
  pending: { en: 'Pending Committee Review', ur: 'کمیٹی جائزہ باقی', sd: 'ڪميٽي جائزو باقي' },
  recommended: { en: 'Recommended', ur: 'سفارش شدہ', sd: 'سفارش ٿيل' },
  not_recommended: { en: 'Not Recommended', ur: 'سفارش نہیں ہوئی', sd: 'سفارش نه ٿيل' },
  approved: { en: 'Committee Approved', ur: 'کمیٹی سے منظور', sd: 'ڪميٽي منظور ٿيل' },
  rejected: { en: 'Committee Rejected', ur: 'کمیٹی سے مسترد', sd: 'ڪميٽي رد ٿيل' },
  deferred: { en: 'Deferred / More Info Needed', ur: 'موخر / مزید معلومات درکار', sd: 'ملتوي / وڌيڪ معلومات گهربل' },
}

const healthCasePriorityLabelTranslations: Record<string, ProgramLabelMap> = {
  emergency: { en: 'Emergency', ur: 'ایمرجنسی', sd: 'ايمرجنسي' },
  urgent: { en: 'Urgent', ur: 'فوری', sd: 'تڪڙو' },
  normal: { en: 'Normal', ur: 'نارمل', sd: 'نارمل' },
}

const healthDocumentLabelTranslations: Record<HealthDocumentType, ProgramLabelMap> = {
  patient_cnic_bform: { en: 'Patient CNIC / B-form', ur: 'مریض CNIC / ب فارم', sd: 'مريض CNIC / ب فارم' },
  member_cnic: { en: 'Member CNIC', ur: 'ممبر CNIC', sd: 'ميمبر CNIC' },
  medical_reports: { en: 'Medical Reports', ur: 'میڈیکل رپورٹس', sd: 'ميڊيڪل رپورٽون' },
  doctor_prescription: { en: 'Doctor Prescription', ur: 'ڈاکٹر نسخہ', sd: 'ڊاڪٽر نسخو' },
  hospital_estimate: { en: 'Hospital Estimate', ur: 'ہسپتال تخمینہ', sd: 'اسپتال تخمينو' },
  lab_reports: { en: 'Lab Reports', ur: 'لیب رپورٹس', sd: 'ليب رپورٽون' },
  other: { en: 'Other Supporting Document', ur: 'دیگر معاون دستاویز', sd: 'ٻيو مددگار دستاويز' },
}

export function getHealthStatusLabel(status: string) {
  const typedStatus = status as HealthStatus

  return localizedProgramLabel(
    healthStatusLabelTranslations[typedStatus],
    healthStatusLabels[typedStatus] ?? status,
  )
}

export function getHealthStatusClass(status: string) {
  switch (status) {
    case 'approved':
    case 'paid_completed':
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'need_more_info':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'under_review':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export function getHealthDocumentConfig(type: string) {
  return healthDocumentOptions.find((item) => item.type === type)
}

export function getHealthDocumentLabel(type: string) {
  const typedType = type as HealthDocumentType
  const fallback = getHealthDocumentConfig(type)?.label ?? type

  return localizedProgramLabel(healthDocumentLabelTranslations[typedType], fallback)
}

export function getHealthDocumentStatusLabel(status: string) {
  const typedStatus = status as HealthDocumentVerificationStatus

  return localizedProgramLabel(
    healthDocumentStatusLabelTranslations[typedStatus],
    healthDocumentStatusLabels[typedStatus] ?? status,
  )
}

export function getHealthDocumentStatusClass(status: string) {
  switch (status) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'needs_reupload':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export function getHealthPaymentStatusLabel(status?: string | null) {
  if (!status) {
    return localizedProgramLabel(
      healthPaymentStatusLabelTranslations.not_started,
      'Not Started',
    )
  }

  const typedStatus = status as HealthPaymentStatus
  const fallback =
    healthPaymentStatusOptions.find((item) => item.value === status)?.label ??
    status

  return localizedProgramLabel(
    healthPaymentStatusLabelTranslations[typedStatus],
    fallback,
  )
}

export function validateHealthDocumentFile(file: File) {
  if (file.size > HEALTH_MAX_DOCUMENT_SIZE_BYTES) {
    return {
      ok: false,
      message: `File size ${HEALTH_MAX_DOCUMENT_SIZE_MB}MB se kam honi chahiye.`,
    }
  }

  if (
    file.type &&
    !HEALTH_ALLOWED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof HEALTH_ALLOWED_DOCUMENT_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      message: 'Sirf PDF, JPG, PNG ya WEBP document upload karen.',
    }
  }

  return { ok: true, message: '' }
}

export function createHealthDocumentStoragePath({
  userId,
  applicationId,
  documentType,
  fileName,
}: {
  userId: string
  applicationId: string
  documentType: string
  fileName: string
}) {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'file'
  const safeDocumentType = documentType.replace(/[^a-z0-9_-]/gi, '-')

  return `${userId}/${applicationId}/${safeDocumentType}-${Date.now()}.${extension}`
}

export function formatHealthFileSize(size?: number | null) {
  if (!size) return 'Unknown size'

  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`

  return `${(kb / 1024).toFixed(2)} MB`
}

export function isHealthEmergency(details?: HealthApplicationDetails | null) {
  return Boolean(details?.emergency)
}


export function getHealthCommitteeDecisionLabel(status?: string | null) {
  if (!status) {
    return localizedProgramLabel(
      healthCommitteeDecisionLabelTranslations.pending,
      'Pending Committee Review',
    )
  }

  const typedStatus = status as HealthCommitteeDecision
  const fallback =
    healthCommitteeDecisionOptions.find((item) => item.value === status)?.label ??
    status

  return localizedProgramLabel(
    healthCommitteeDecisionLabelTranslations[typedStatus],
    fallback,
  )
}

export function getHealthCommitteeDecisionClass(status?: string | null) {
  switch (status) {
    case 'approved':
    case 'recommended':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'rejected':
    case 'not_recommended':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'deferred':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export function getHealthCasePriority(details?: HealthApplicationDetails | null) {
  if (details?.case_priority) return details.case_priority
  return isHealthEmergency(details) ? 'emergency' : 'normal'
}

export function getHealthCasePriorityLabel(details?: HealthApplicationDetails | null) {
  const priority = getHealthCasePriority(details)

  return localizedProgramLabel(
    healthCasePriorityLabelTranslations[priority],
    priority === 'emergency'
      ? 'Emergency'
      : priority === 'urgent'
        ? 'Urgent'
        : 'Normal',
  )
}

export function getHealthCasePriorityClass(details?: HealthApplicationDetails | null) {
  const priority = getHealthCasePriority(details)

  if (priority === 'emergency') return 'bg-red-100 text-red-800 border-red-200'
  if (priority === 'urgent') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

export function sortHealthCasesByPriority<T extends { details?: HealthApplicationDetails | null; created_at: string }>(
  items: T[],
) {
  const priorityWeight = (details?: HealthApplicationDetails | null) => {
    const priority = getHealthCasePriority(details)
    if (priority === 'emergency') return 0
    if (priority === 'urgent') return 1
    return 2
  }

  return [...items].sort((a, b) => {
    const byPriority = priorityWeight(a.details) - priorityWeight(b.details)
    if (byPriority !== 0) return byPriority

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function formatHealthMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-'

  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)

  return `Rs. ${amount.toLocaleString('en-PK')}`
}

export function sanitizeHealthReportText(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === '') return '-'

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
