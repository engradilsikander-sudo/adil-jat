// src/lib/membership-fee.ts

export const MEMBERSHIP_BASE_FEE = 500
export const MEMBERSHIP_FEE_CURRENCY = 'PKR'
export const MEMBERSHIP_PROCESSING_LABEL = 'applicable tax/processing charges'
export const MEMBERSHIP_PAYMENT_COMING_SOON_TEXT =
  'Membership fee: Rs. 500 PKR. Upload your receipt for admin verification.'

export const MEMBERSHIP_RECEIPT_BUCKET = 'membership-receipts'
export const MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const MEMBERSHIP_RECEIPT_MAX_SIZE_LABEL = '5MB'
export const MEMBERSHIP_RECEIPT_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]

export const MEMBERSHIP_PAYMENT_QR_IMAGE_PATH = '/jas/membership-payment-qr.jpg'

/**
 * No payment destination is trusted merely because it appears in source code.
 * Values are public (VITE_); never put credentials, passwords or tokens here.
 * The release operator MUST confirm the displayed account and QR with the
 * organization before setting the two explicit verification flags.
 */
export type MembershipPaymentAccountConfig = {
  verified?: string
  network?: string
  accountTitle?: string
  accountNumber?: string
  iban?: string
}

export type MembershipPaymentAccount = {
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string
}

function isValidPkIban(value: string): boolean {
  if (!/^PK\d{2}[A-Z0-9]{20}$/.test(value)) return false
  const moved = value.slice(4) + value.slice(0, 4)
  let remainder = 0
  for (const char of moved) {
    const digits = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

export function resolveMembershipPaymentAccount(config: MembershipPaymentAccountConfig): MembershipPaymentAccount | null {
  if (config.verified !== 'true') return null
  const bankName = config.network?.trim() ?? ''
  const accountTitle = config.accountTitle?.trim() ?? ''
  const accountNumber = (config.accountNumber ?? '').replace(/[\s-]/g, '')
  const iban = (config.iban ?? '').replace(/\s/g, '').toUpperCase()

  if (!bankName || bankName.length > 60 || !accountTitle || accountTitle.length > 100) return null
  if (/^(test|example|your name|account holder|placeholder)$/i.test(accountTitle)) return null
  if (!/^\d{10,24}$/.test(accountNumber) || /^(\d)\1+$/.test(accountNumber)) return null
  if (accountNumber.includes('123456789') || accountNumber.includes('987654321')) return null
  if (/easypaisa|jazzcash/i.test(bankName) && !/^03\d{9}$/.test(accountNumber)) return null
  if (iban && !isValidPkIban(iban)) return null
  return { bankName, accountTitle, accountNumber, iban }
}

export function isMembershipQrApproved(account: MembershipPaymentAccount | null, flag: string | undefined) {
  return Boolean(account) && flag === 'true'
}

export const MEMBERSHIP_MANUAL_PAYMENT_DETAILS = resolveMembershipPaymentAccount({
  verified: import.meta.env.VITE_MEMBERSHIP_PAYMENT_DETAILS_VERIFIED,
  network: import.meta.env.VITE_MEMBERSHIP_PAYMENT_NETWORK,
  accountTitle: import.meta.env.VITE_MEMBERSHIP_PAYMENT_ACCOUNT_TITLE,
  accountNumber: import.meta.env.VITE_MEMBERSHIP_PAYMENT_ACCOUNT_NUMBER,
  iban: import.meta.env.VITE_MEMBERSHIP_PAYMENT_IBAN,
})

export const MEMBERSHIP_PAYMENT_QR_APPROVED = isMembershipQrApproved(
  MEMBERSHIP_MANUAL_PAYMENT_DETAILS,
  import.meta.env.VITE_MEMBERSHIP_PAYMENT_QR_VERIFIED,
)

export type MembershipPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'waived'

export type MembershipPaymentMethod =
  | 'manual'
  | 'jazzcash'
  | 'easypaisa'
  | 'bank'
  | 'gateway'

export type MembershipPayment = {
  id: string
  member_id: string
  user_id: string
  base_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: MembershipPaymentStatus
  payment_method: MembershipPaymentMethod
  gateway_provider: string | null
  gateway_reference: string | null
  receipt_path: string | null
  receipt_file_name: string | null
  receipt_mime_type: string | null
  receipt_size_bytes: number | null
  receipt_uploaded_at: string | null
  admin_note: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type MembershipPaymentReceiptPayload = {
  receipt_path?: string | null
  receipt_file_name?: string | null
  receipt_mime_type?: string | null
  receipt_size_bytes?: number | null
  receipt_uploaded_at?: string | null
}

export function formatMembershipMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0)

  return `Rs. ${amount.toLocaleString('en-PK', {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: 0,
  })}`
}

export function getMembershipFeeNotice() {
  return 'Membership fee: Rs. 500 PKR. Upload your receipt for admin verification.'
}

export function getMembershipFeeSubtext() {
  return 'Total payable: Rs. 500. No additional tax or processing charges.'
}

export function getManualMembershipPaymentInstruction() {
  return 'Pay Rs. 500 using the listed account details, then upload your receipt. A receipt is reviewed by an administrator before payment is marked paid.'
}

export function getMembershipPaymentQrHelpText() {
  return 'Review the receipt against this payment record’s total amount. Historical payment amounts are retained.'

}

export function getMembershipPaymentStatusLabel(
  status: MembershipPaymentStatus | null | undefined,
) {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    case 'refunded':
      return 'Refunded'
    case 'waived':
      return 'Waived'
    default:
      return 'Pending'
  }
}

export function getMembershipPaymentStatusClass(
  status: MembershipPaymentStatus | null | undefined,
) {
  switch (status) {
    case 'paid':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'waived':
      return 'border-sky-200 bg-sky-50 text-sky-800'
    case 'failed':
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'refunded':
      return 'border-purple-200 bg-purple-50 text-purple-800'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800'
  }
}

export function getMembershipPaymentDisplayStatus(
  payment: Pick<MembershipPayment, 'status'> | null | undefined,
) {
  return payment?.status ?? 'pending'
}

export function assertMembershipPaymentCollectionEnabled() {
  if (Number(MEMBERSHIP_BASE_FEE) <= 0) {
    throw new Error('Membership is free. Membership payments and receipts are disabled.')
  }
}

export function validateMembershipReceiptFile(file: Pick<File, 'type' | 'size'>) {
  if (!MEMBERSHIP_RECEIPT_ALLOWED_TYPES.includes(file.type) || file.size <= 0 || file.size > MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES) {
    return 'Receipt must be PNG, JPG, WebP or PDF, up to 5MB.'
  }
  return ''
}
