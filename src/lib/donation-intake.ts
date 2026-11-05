import { z } from 'zod'

export const donationIntakeSchema = z.object({
  idempotencyKey: z.uuid(),
  donorName: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(5).max(160).refine(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d ()-]{7,25}$/.test(v), 'Enter an email address or phone number.'),
  amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/).refine(v => Number(v) > 0 && Number(v) <= 100000000, 'Enter an amount between 0.01 and 100,000,000.'),
  purpose: z.enum(['education', 'health', 'welfare', 'general_fund']),
  paymentMethod: z.enum(['cash', 'bank', 'jazzcash', 'easypaisa', 'manual_transfer']),
  transactionReference: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000),
  website: z.string().max(0),
  captchaToken: z.string().max(2048),
  accessToken: z.string().max(8192),
}).strict()

export const MAX_INTAKE_RECEIPT_BYTES = 2 * 1024 * 1024

export async function validateIntakeReceipt(file: File | null) {
  if (!file || file.size === 0) return null
  if (file.size > MAX_INTAKE_RECEIPT_BYTES) throw new Error('Receipt must be at most 2MB.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const starts = (...prefix: number[]) => prefix.every((value, i) => bytes[i] === value)
  const valid =
    (file.type === 'application/pdf' && starts(37, 80, 68, 70, 45)) ||
    (file.type === 'image/png' && starts(137, 80, 78, 71, 13, 10, 26, 10)) ||
    (file.type === 'image/jpeg' && starts(255, 216, 255)) ||
    (file.type === 'image/webp' && starts(82, 73, 70, 70) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP')
  if (!valid) throw new Error('Receipt must be a valid PDF, JPG, PNG or WEBP file.')
  return bytes
}
