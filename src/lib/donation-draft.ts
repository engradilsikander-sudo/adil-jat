import { z } from 'zod'
import { MAX_INTAKE_RECEIPT_BYTES, publicDonationFieldsSchema, validateIntakeReceipt } from './donation-intake'

export type DonationFields = z.infer<typeof publicDonationFieldsSchema>
export const DONATION_DRAFT_KEY = 'jas-donation-draft'
export const DONATION_DRAFT_TTL = 24 * 60 * 60 * 1000
const receiptSchema = z.object({
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  type: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  size: z.number().int().positive().max(MAX_INTAKE_RECEIPT_BYTES),
}).strict()
const draftSchema = z.object({
  version: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  ownerId: z.uuid().nullable(),
  idempotencyKey: z.uuid(),
  fields: publicDonationFieldsSchema,
  receipt: receiptSchema.nullable(),
  unresolved: z.boolean(),
}).strict()
export type DonationDraft = z.infer<typeof draftSchema>
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function clearDonationDraft(storage: DraftStorage) {
  storage.removeItem(DONATION_DRAFT_KEY)
  storage.removeItem('jas-donation-key') // Remove only the unbound legacy donation key.
}

export function restoreDonationDraft(storage: DraftStorage, ownerId: string | null, now = Date.now()): {
  draft: DonationDraft | null; discarded: boolean
} {
  const raw = storage.getItem(DONATION_DRAFT_KEY)
  const legacyKey = storage.getItem('jas-donation-key')
  if (!raw && !legacyKey) return { draft: null, discarded: false }
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw || 'null'))
    if (parsed.success && !legacyKey && parsed.data.ownerId === ownerId &&
      parsed.data.createdAt <= now && now - parsed.data.createdAt < DONATION_DRAFT_TTL) {
      return { draft: parsed.data, discarded: false }
    }
  } catch { /* Discard malformed or legacy drafts without restoring personal data. */ }
  clearDonationDraft(storage)
  return { draft: null, discarded: true }
}

export function saveDonationDraft(storage: DraftStorage, draft: DonationDraft) {
  // Strict parsing prevents accidental persistence of tokens, files or extra fields.
  storage.setItem(DONATION_DRAFT_KEY, JSON.stringify(draftSchema.parse(draft)))
  storage.removeItem('jas-donation-key')
}

export async function describeDonationReceipt(file: File | null): Promise<DonationDraft['receipt']> {
  const bytes = await validateIntakeReceipt(file)
  if (!bytes || !file) return null
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)
  return receiptSchema.parse({ sha256: Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''), type: file.type, size: file.size })
}

export function donationRecoveryProblem(draft: DonationDraft, fields: DonationFields, receipt: DonationDraft['receipt']) {
  if (!draft.unresolved) return ''
  if (draft.receipt && !receipt) return 'Reselect the original receipt before retrying this unresolved submission.'
  if (JSON.stringify(draft.receipt) !== JSON.stringify(receipt)) return 'The receipt differs from the original submission. Reselect the same original file; do not start a new donation to retry.'
  // Schema parsing gives a stable field order and trims the same fields as the server.
  const original = publicDonationFieldsSchema.parse(draft.fields)
  const current = publicDonationFieldsSchema.parse(fields)
  if (JSON.stringify({ ...original, amount: Number(original.amount) }) !== JSON.stringify({ ...current, amount: Number(current.amount) })) {
    return 'These details differ from the unresolved submission. Restore the original details before retrying with the same key.'
  }
  return ''
}
