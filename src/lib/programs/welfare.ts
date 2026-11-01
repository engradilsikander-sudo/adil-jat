import { localizedProgramLabel, type ProgramLabelMap } from '../program-status-i18n'

export type WelfareStatus =
  | 'submitted'
  | 'under_review'
  | 'need_more_info'
  | 'approved'
  | 'rejected'
  | 'paid_completed'
  | 'completed'

export type WelfareDocumentVerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'needs_reupload'

export type WelfareDocumentType =
  | 'applicant_cnic'
  | 'member_cnic'
  | 'income_proof'
  | 'case_proof'
  | 'family_document'
  | 'expense_estimate'
  | 'other'

export type WelfareCaseType =
  | 'Financial Help'
  | 'Ration Support'
  | 'Widow Support'
  | 'Orphan Support'
  | 'Emergency Help'
  | 'Marriage Support'
  | 'Disaster Relief'
  | 'Legal Help'
  | 'Family Support'
  | 'Other'

export type WelfarePaymentStatus =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'partially_released'
  | 'released'
  | 'completed'

export type WelfareCommitteeDecision =
  | 'pending'
  | 'recommended'
  | 'not_recommended'
  | 'approved'
  | 'rejected'
  | 'deferred'

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

export type WelfareApplicationDetails = {
  case_priority?: 'emergency' | 'urgent' | 'normal' | string
  case_type?: WelfareCaseType | string
  reason?: string
  required_amount?: string
  family_members?: string
  monthly_income?: string
  current_support_source?: string
  emergency?: boolean
  verifier_remarks?: string
  welfare_committee_decision?: WelfareCommitteeDecision | string
  welfare_committee_reviewed_at?: string
  welfare_committee_members?: string
  welfare_committee_remarks?: string
  payment_status?: WelfarePaymentStatus | string
  payment_reference?: string
  follow_up_notes?: string
  case_close_report?: string
}

export type WelfareDocumentConfig = {
  type: WelfareDocumentType
  label: string
  description: string
  required: boolean
}

export type WelfareDocumentRecord = {
  id: string
  application_id: string
  program_key: 'welfare'
  uploaded_by: string
  document_type: WelfareDocumentType | string
  file_path: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  verification_status: WelfareDocumentVerificationStatus | string
  is_verified: boolean
  admin_note: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export const WELFARE_DOCUMENT_BUCKET = 'welfare-documents'
export const WELFARE_MAX_DOCUMENT_SIZE_MB = 8
export const WELFARE_MAX_DOCUMENT_SIZE_BYTES =
  WELFARE_MAX_DOCUMENT_SIZE_MB * 1024 * 1024
export const WELFARE_DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
export const WELFARE_ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const relationshipOptions: Array<{ value: MemberRelationship; label: string }> = [
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

export const welfareCaseTypeOptions: WelfareCaseType[] = [
  'Financial Help',
  'Ration Support',
  'Widow Support',
  'Orphan Support',
  'Emergency Help',
  'Marriage Support',
  'Disaster Relief',
  'Legal Help',
  'Family Support',
  'Other',
]

export const welfarePaymentStatusOptions: Array<{ value: WelfarePaymentStatus; label: string }> = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending', label: 'Fund Pending' },
  { value: 'approved', label: 'Fund Approved' },
  { value: 'partially_released', label: 'Partially Released' },
  { value: 'released', label: 'Fund Released' },
  { value: 'completed', label: 'Completed' },
]

export const welfareCommitteeDecisionOptions: Array<{
  value: WelfareCommitteeDecision
  label: string
}> = [
  { value: 'pending', label: 'Pending Welfare Committee' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'not_recommended', label: 'Not Recommended' },
  { value: 'approved', label: 'Committee Approved' },
  { value: 'rejected', label: 'Committee Rejected' },
  { value: 'deferred', label: 'Deferred / More Info Needed' },
]

export const welfareDocumentOptions: WelfareDocumentConfig[] = [
  {
    type: 'applicant_cnic',
    label: 'Applicant CNIC / B-form',
    description: 'Upload applicant CNIC, B-form or identity document copy.',
    required: true,
  },
  {
    type: 'member_cnic',
    label: 'Member CNIC',
    description: 'Upload approved JAS member CNIC copy.',
    required: true,
  },
  {
    type: 'income_proof',
    label: 'Income / Need Proof',
    description: 'Upload income proof, poverty certificate, salary slip, or need proof if available.',
    required: false,
  },
  {
    type: 'case_proof',
    label: 'Case Proof',
    description: 'Upload proof related to the case, such as bill, ration slip, disaster proof, legal notice, or support request.',
    required: true,
  },
  {
    type: 'family_document',
    label: 'Family / Dependency Document',
    description: 'Upload widow/orphan/family dependency proof if relevant.',
    required: false,
  },
  {
    type: 'expense_estimate',
    label: 'Expense Estimate / Challan',
    description: 'Upload estimated cost, challan, bill, or written estimate.',
    required: false,
  },
  {
    type: 'other',
    label: 'Other Supporting Document',
    description: 'Upload any other supporting welfare document if needed.',
    required: false,
  },
]

export const welfareRequiredDocumentTypes = welfareDocumentOptions
  .filter((item) => item.required)
  .map((item) => item.type)

export const welfareStatusLabels: Record<WelfareStatus, string> = {
  submitted: 'New',
  under_review: 'Under Verification',
  need_more_info: 'Need More Info',
  approved: 'Approved',
  rejected: 'Rejected',
  paid_completed: 'Fund Released',
  completed: 'Closed',
}

export const welfareDocumentStatusLabels: Record<
  WelfareDocumentVerificationStatus,
  string
> = {
  pending: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_reupload: 'Needs Re-upload',
}

const welfareStatusLabelTranslations: Record<WelfareStatus, ProgramLabelMap> = {
  submitted: { en: 'New', ur: 'نیا', sd: 'نئون' },
  under_review: { en: 'Under Verification', ur: 'تصدیق جاری', sd: 'تصديق جاري' },
  need_more_info: { en: 'Need More Info', ur: 'مزید معلومات درکار', sd: 'وڌيڪ معلومات گهربل' },
  approved: { en: 'Approved', ur: 'منظور شدہ', sd: 'منظور ٿيل' },
  rejected: { en: 'Rejected', ur: 'مسترد', sd: 'رد ٿيل' },
  paid_completed: { en: 'Fund Released', ur: 'فنڈ جاری', sd: 'فنڊ جاري' },
  completed: { en: 'Closed', ur: 'بند', sd: 'بند' },
}

const welfareDocumentStatusLabelTranslations: Record<
  WelfareDocumentVerificationStatus,
  ProgramLabelMap
> = {
  pending: { en: 'Pending Verification', ur: 'تصدیق باقی', sd: 'تصديق باقي' },
  verified: { en: 'Verified', ur: 'تصدیق شدہ', sd: 'تصديق ٿيل' },
  rejected: { en: 'Rejected', ur: 'مسترد', sd: 'رد ٿيل' },
  needs_reupload: { en: 'Needs Re-upload', ur: 'دوبارہ اپلوڈ درکار', sd: 'ٻيهر اپلوڊ گهربل' },
}

const welfarePaymentStatusLabelTranslations: Record<WelfarePaymentStatus, ProgramLabelMap> = {
  not_started: { en: 'Not Started', ur: 'شروع نہیں ہوا', sd: 'شروع نه ٿيو' },
  pending: { en: 'Fund Pending', ur: 'فنڈ باقی', sd: 'فنڊ باقي' },
  approved: { en: 'Fund Approved', ur: 'فنڈ منظور', sd: 'فنڊ منظور' },
  partially_released: { en: 'Partially Released', ur: 'جزوی جاری', sd: 'جزوي جاري' },
  released: { en: 'Fund Released', ur: 'فنڈ جاری', sd: 'فنڊ جاري' },
  completed: { en: 'Completed', ur: 'مکمل', sd: 'مڪمل' },
}

const welfareCommitteeDecisionLabelTranslations: Record<WelfareCommitteeDecision, ProgramLabelMap> = {
  pending: { en: 'Pending Welfare Committee', ur: 'ویلفیئر کمیٹی جائزہ باقی', sd: 'ويلفيئر ڪميٽي جائزو باقي' },
  recommended: { en: 'Recommended', ur: 'سفارش شدہ', sd: 'سفارش ٿيل' },
  not_recommended: { en: 'Not Recommended', ur: 'سفارش نہیں ہوئی', sd: 'سفارش نه ٿيل' },
  approved: { en: 'Committee Approved', ur: 'کمیٹی سے منظور', sd: 'ڪميٽي منظور ٿيل' },
  rejected: { en: 'Committee Rejected', ur: 'کمیٹی سے مسترد', sd: 'ڪميٽي رد ٿيل' },
  deferred: { en: 'Deferred / More Info Needed', ur: 'موخر / مزید معلومات درکار', sd: 'ملتوي / وڌيڪ معلومات گهربل' },
}

const welfareCasePriorityLabelTranslations: Record<string, ProgramLabelMap> = {
  emergency: { en: 'Emergency', ur: 'ایمرجنسی', sd: 'ايمرجنسي' },
  urgent: { en: 'Urgent', ur: 'فوری', sd: 'تڪڙو' },
  normal: { en: 'Normal', ur: 'نارمل', sd: 'نارمل' },
}

const welfareDocumentLabelTranslations: Record<WelfareDocumentType, ProgramLabelMap> = {
  applicant_cnic: { en: 'Applicant CNIC / B-form', ur: 'درخواست گزار CNIC / ب فارم', sd: 'درخواست ڏيندڙ CNIC / ب فارم' },
  member_cnic: { en: 'Member CNIC', ur: 'ممبر CNIC', sd: 'ميمبر CNIC' },
  income_proof: { en: 'Income / Need Proof', ur: 'آمدنی / ضرورت کا ثبوت', sd: 'آمدني / ضرورت جو ثبوت' },
  case_proof: { en: 'Case Proof', ur: 'کیس ثبوت', sd: 'ڪيس ثبوت' },
  family_document: { en: 'Family / Dependency Document', ur: 'خاندان / زیر کفالت دستاویز', sd: 'خاندان / زير ڪفالت دستاويز' },
  expense_estimate: { en: 'Expense Estimate / Challan', ur: 'خرچ تخمینہ / چالان', sd: 'خرچ تخمينو / چالان' },
  other: { en: 'Other Supporting Document', ur: 'دیگر معاون دستاویز', sd: 'ٻيو مددگار دستاويز' },
}

export function getWelfareStatusLabel(status: string) {
  const typedStatus = status as WelfareStatus

  return localizedProgramLabel(
    welfareStatusLabelTranslations[typedStatus],
    welfareStatusLabels[typedStatus] ?? status,
  )
}

export function getWelfareStatusClass(status: string) {
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

export function getWelfareDocumentConfig(type: string) {
  return welfareDocumentOptions.find((item) => item.type === type)
}

export function getWelfareDocumentLabel(type: string) {
  const typedType = type as WelfareDocumentType
  const fallback = getWelfareDocumentConfig(type)?.label ?? type

  return localizedProgramLabel(welfareDocumentLabelTranslations[typedType], fallback)
}

export function getWelfareDocumentStatusLabel(status: string) {
  const typedStatus = status as WelfareDocumentVerificationStatus

  return localizedProgramLabel(
    welfareDocumentStatusLabelTranslations[typedStatus],
    welfareDocumentStatusLabels[typedStatus] ?? status,
  )
}

export function getWelfareDocumentStatusClass(status: string) {
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

export function getWelfarePaymentStatusLabel(status?: string | null) {
  if (!status) {
    return localizedProgramLabel(
      welfarePaymentStatusLabelTranslations.not_started,
      'Not Started',
    )
  }

  const typedStatus = status as WelfarePaymentStatus
  const fallback =
    welfarePaymentStatusOptions.find((item) => item.value === status)?.label ??
    status

  return localizedProgramLabel(
    welfarePaymentStatusLabelTranslations[typedStatus],
    fallback,
  )
}

export function validateWelfareDocumentFile(file: File) {
  if (file.size > WELFARE_MAX_DOCUMENT_SIZE_BYTES) {
    return { ok: false, message: `File size ${WELFARE_MAX_DOCUMENT_SIZE_MB}MB se kam honi chahiye.` }
  }

  if (
    file.type &&
    !WELFARE_ALLOWED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof WELFARE_ALLOWED_DOCUMENT_MIME_TYPES)[number],
    )
  ) {
    return { ok: false, message: 'Sirf PDF, JPG, PNG ya WEBP document upload karen.' }
  }

  return { ok: true, message: '' }
}

export function createWelfareDocumentStoragePath({
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

export function formatWelfareFileSize(size?: number | null) {
  if (!size) return 'Unknown size'
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function isWelfareEmergency(details?: WelfareApplicationDetails | null) {
  return Boolean(details?.emergency)
}

export function getWelfareCommitteeDecisionLabel(status?: string | null) {
  if (!status) {
    return localizedProgramLabel(
      welfareCommitteeDecisionLabelTranslations.pending,
      'Pending Welfare Committee',
    )
  }

  const typedStatus = status as WelfareCommitteeDecision
  const fallback =
    welfareCommitteeDecisionOptions.find((item) => item.value === status)?.label ??
    status

  return localizedProgramLabel(
    welfareCommitteeDecisionLabelTranslations[typedStatus],
    fallback,
  )
}

export function getWelfareCommitteeDecisionClass(status?: string | null) {
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

export function getWelfareCasePriority(details?: WelfareApplicationDetails | null) {
  if (details?.case_priority) return details.case_priority
  return isWelfareEmergency(details) ? 'emergency' : 'normal'
}

export function getWelfareCasePriorityLabel(details?: WelfareApplicationDetails | null) {
  const priority = getWelfareCasePriority(details)

  return localizedProgramLabel(
    welfareCasePriorityLabelTranslations[priority],
    priority === 'emergency'
      ? 'Emergency'
      : priority === 'urgent'
        ? 'Urgent'
        : 'Normal',
  )
}

export function getWelfareCasePriorityClass(details?: WelfareApplicationDetails | null) {
  const priority = getWelfareCasePriority(details)
  if (priority === 'emergency') return 'bg-red-100 text-red-800 border-red-200'
  if (priority === 'urgent') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

export function sortWelfareCasesByPriority<T extends { details?: WelfareApplicationDetails | null; created_at: string }>(items: T[]) {
  const priorityWeight = (details?: WelfareApplicationDetails | null) => {
    const priority = getWelfareCasePriority(details)
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

export function formatWelfareMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '-'
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return `Rs. ${amount.toLocaleString('en-PK')}`
}

export function sanitizeWelfareReportText(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
