import {
  MEMBERSHIP_RECEIPT_ALLOWED_TYPES,
  MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES,
  type MembershipPaymentStatus,
} from '../membership-fee'

const MIN_REJECTION_REASON_LENGTH = 10
const MAX_REJECTION_REASON_LENGTH = 500
const ADMIN_NOTE_MAX_LENGTH = 500
const MAX_TEXT_FIELD_LENGTH = 250
const MAX_ADDRESS_LENGTH = 600
const MAX_RECEIPT_FILE_NAME_LENGTH = 180
const MAX_RECEIPT_PATH_LENGTH = 500

const MEMBERSHIP_PAYMENT_STATUSES: MembershipPaymentStatus[] = [
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'waived',
]

export type AdminActionInput = {
  memberId: string
  accessToken: string
}

export type RejectMemberInput = AdminActionInput & {
  rejectionReason: string
}

export type AdminMemberEditPayload = {
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  address: string
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  profession: string | null
  caste_branch: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
  photo_url: string
}

export type UpdateMemberApplicationInput = AdminActionInput & {
  payload: AdminMemberEditPayload
}

export type UpdateMembershipPaymentStatusInput = AdminActionInput & {
  paymentId: string
  status: MembershipPaymentStatus
  adminNote: string | null
}

export type SaveMembershipReceiptInput = AdminActionInput & {
  paymentId?: string | null
  receipt: {
    receipt_path: string
    receipt_file_name: string
    receipt_mime_type: string
    receipt_size_bytes: number
    receipt_uploaded_at: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(data: Record<string, unknown>, fieldName: string) {
  const value = data[fieldName]

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`)
  }

  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }

  return normalized
}

export function requireUuid(value: string, fieldName: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(value)) {
    throw new Error(`${fieldName} is not valid.`)
  }

  return value
}

export function normalizeRejectionReason(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')

  if (normalized.length < MIN_REJECTION_REASON_LENGTH) {
    throw new Error(
      `Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters.`,
    )
  }

  if (normalized.length > MAX_REJECTION_REASON_LENGTH) {
    throw new Error(
      `Rejection reason must be less than ${MAX_REJECTION_REASON_LENGTH} characters.`,
    )
  }

  return normalized
}

export function validateApproveInput(data: unknown): AdminActionInput {
  if (!isRecord(data)) {
    throw new Error('Invalid approval request.')
  }

  return {
    memberId: requireUuid(readString(data, 'memberId'), 'Member ID'),
    accessToken: readString(data, 'accessToken'),
  }
}

export function validateRejectInput(data: unknown): RejectMemberInput {
  if (!isRecord(data)) {
    throw new Error('Invalid rejection request.')
  }

  return {
    memberId: requireUuid(readString(data, 'memberId'), 'Member ID'),
    accessToken: readString(data, 'accessToken'),
    rejectionReason: normalizeRejectionReason(readString(data, 'rejectionReason')),
  }
}

export function validateMemberEditInput(data: unknown): UpdateMemberApplicationInput {
  if (!isRecord(data)) {
    throw new Error('Invalid member update request.')
  }

  const memberId = requireUuid(readString(data, 'memberId'), 'Member ID')
  const accessToken = readString(data, 'accessToken')
  const rawPayload = data.payload

  if (!isRecord(rawPayload)) {
    throw new Error('Application data is required.')
  }

  const payload: AdminMemberEditPayload = {
    full_name: normalizeLimitedText(rawPayload.full_name, 'Full name', MAX_TEXT_FIELD_LENGTH),
    father_name: normalizeLimitedText(rawPayload.father_name, 'Father name', MAX_TEXT_FIELD_LENGTH),
    cnic: normalizeLimitedText(rawPayload.cnic, 'CNIC', 30),
    mobile: normalizeLimitedText(rawPayload.mobile, 'Mobile', 30),
    district: normalizeLimitedText(rawPayload.district, 'District', MAX_TEXT_FIELD_LENGTH),
    taluka: normalizeOptionalLimitedText(rawPayload.taluka, 'Taluka', MAX_TEXT_FIELD_LENGTH),
    address: normalizeLimitedText(rawPayload.address, 'Address', MAX_ADDRESS_LENGTH),
    date_of_birth: normalizeOptionalDate(rawPayload.date_of_birth, 'Date of birth'),
    gender: normalizeOptionalLimitedText(rawPayload.gender, 'Gender', 50),
    education: normalizeOptionalLimitedText(rawPayload.education, 'Education', MAX_TEXT_FIELD_LENGTH),
    blood_group: normalizeOptionalLimitedText(rawPayload.blood_group, 'Blood group', 20),
    profession: normalizeOptionalLimitedText(rawPayload.profession, 'Profession', MAX_TEXT_FIELD_LENGTH),
    caste_branch: normalizeOptionalLimitedText(rawPayload.caste_branch, 'Caste / branch', MAX_TEXT_FIELD_LENGTH),
    emergency_contact_name: normalizeOptionalLimitedText(
      rawPayload.emergency_contact_name,
      'Emergency contact name',
      MAX_TEXT_FIELD_LENGTH,
    ),
    emergency_contact_relation: normalizeOptionalLimitedText(
      rawPayload.emergency_contact_relation,
      'Emergency contact relation',
      MAX_TEXT_FIELD_LENGTH,
    ),
    emergency_contact_mobile: normalizeOptionalLimitedText(
      rawPayload.emergency_contact_mobile,
      'Emergency contact mobile',
      30,
    ),
    declaration_accepted: readBoolean(rawPayload, 'declaration_accepted'),
    photo_url:
      normalizeOptionalLimitedText(rawPayload.photo_url, 'Photo path', MAX_RECEIPT_PATH_LENGTH) ?? '',
  }

  return { memberId, accessToken, payload }
}

export function validatePaymentStatusInput(
  data: unknown,
): UpdateMembershipPaymentStatusInput {
  if (!isRecord(data)) {
    throw new Error('Invalid payment status request.')
  }

  const status = readString(data, 'status') as MembershipPaymentStatus

  if (!MEMBERSHIP_PAYMENT_STATUSES.includes(status)) {
    throw new Error('Payment status is not valid.')
  }

  return {
    memberId: requireUuid(readString(data, 'memberId'), 'Member ID'),
    accessToken: readString(data, 'accessToken'),
    paymentId: requireUuid(readString(data, 'paymentId'), 'Payment ID'),
    status,
    adminNote: normalizeOptionalLimitedText(data.adminNote, 'Admin note', ADMIN_NOTE_MAX_LENGTH),
  }
}

export function validateReceiptInput(data: unknown): SaveMembershipReceiptInput {
  if (!isRecord(data)) {
    throw new Error('Invalid payment receipt request.')
  }

  const memberId = requireUuid(readString(data, 'memberId'), 'Member ID')
  const accessToken = readString(data, 'accessToken')
  const paymentId =
    typeof data.paymentId === 'string' && data.paymentId.trim()
      ? requireUuid(data.paymentId.trim(), 'Payment ID')
      : null
  const rawReceipt = data.receipt

  if (!isRecord(rawReceipt)) {
    throw new Error('Receipt metadata is required.')
  }

  const receiptMimeType = normalizeLimitedText(
    rawReceipt.receipt_mime_type,
    'Receipt type',
    100,
  )

  if (!MEMBERSHIP_RECEIPT_ALLOWED_TYPES.includes(receiptMimeType)) {
    throw new Error('Receipt file type is not allowed.')
  }

  const receiptSizeBytes = readPositiveInteger(
    rawReceipt.receipt_size_bytes,
    'Receipt size',
  )

  if (receiptSizeBytes > MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES) {
    throw new Error('Receipt file is too large.')
  }

  return {
    memberId,
    paymentId,
    accessToken,
    receipt: {
      receipt_path: normalizeLimitedText(
        rawReceipt.receipt_path,
        'Receipt path',
        MAX_RECEIPT_PATH_LENGTH,
      ),
      receipt_file_name: normalizeLimitedText(
        rawReceipt.receipt_file_name,
        'Receipt file name',
        MAX_RECEIPT_FILE_NAME_LENGTH,
      ),
      receipt_mime_type: receiptMimeType,
      receipt_size_bytes: receiptSizeBytes,
      receipt_uploaded_at: normalizeIsoDateTime(
        rawReceipt.receipt_uploaded_at,
        'Receipt uploaded time',
      ),
    },
  }
}

export function normalizeLimitedText(
  value: unknown,
  fieldName: string,
  maxLength: number,
) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`)
  }

  const normalized = value.trim().replace(/\s+/g, ' ')

  if (!normalized) {
    throw new Error(`${fieldName} is required.`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less.`)
  }

  return normalized
}

export function normalizeOptionalLimitedText(
  value: unknown,
  fieldName: string,
  maxLength: number,
) {
  if (value === null || value === undefined) return null

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`)
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or less.`)
  }

  return normalized
}

export function normalizeOptionalDate(value: unknown, fieldName: string) {
  const normalized = normalizeOptionalLimitedText(value, fieldName, 20)
  if (!normalized) return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${fieldName} must be a valid date.`)
  }

  const [year, month, day] = normalized.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!isRealDate) {
    throw new Error(`${fieldName} must be a valid date.`)
  }

  return normalized
}

export function normalizeIsoDateTime(value: unknown, fieldName: string) {
  const normalized = normalizeLimitedText(value, fieldName, 80)
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date/time.`)
  }

  return date.toISOString()
}

function readBoolean(data: Record<string, unknown>, fieldName: string) {
  const value = data[fieldName]

  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be true or false.`)
  }

  return value
}

function readPositiveInteger(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number.`)
  }

  return value
}
