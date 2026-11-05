import { describe, expect, it } from 'vitest'
import { donationIntakeSchema, validateIntakeReceipt, MAX_INTAKE_RECEIPT_BYTES } from './donation-intake'

const valid = { idempotencyKey: crypto.randomUUID(), donorName: 'Public Donor', contact: 'donor@example.test', amount: '250.50', purpose: 'general_fund', paymentMethod: 'bank', transactionReference: 'TX-123', notes: '', website: '', captchaToken: '', accessToken: '' }

describe('public donation validation', () => {
  it('accepts anonymous and authenticated input without membership fields', () => {
    expect(donationIntakeSchema.parse(valid).donorName).toBe('Public Donor')
    expect(donationIntakeSchema.parse({ ...valid, accessToken: 'jwt' }).accessToken).toBe('jwt')
  })
  it.each(['0', '-1', 'NaN', 'Infinity', '1e3', '0.001', '100000001', ''])('rejects invalid amount %s', amount => {
    expect(donationIntakeSchema.safeParse({ ...valid, amount }).success).toBe(false)
  })
  it.each([{ transactionReference: ' ' }, { donorName: '' }, { contact: 'bad-contact' }, { purpose: 'bad' }, { paymentMethod: 'bad' }, { notes: 'a'.repeat(2001) }, { website: 'bot' }, { status: 'approved' }, { donor_user_id: crypto.randomUUID() }])('rejects invalid or privileged fields %j', fields => {
    expect(donationIntakeSchema.safeParse({ ...valid, ...fields }).success).toBe(false)
  })
  it('accepts no receipt and validates bytes instead of trusting MIME', async () => {
    expect(await validateIntakeReceipt(null)).toBeNull()
    await expect(validateIntakeReceipt(new File(['<script>'], 'fake.png', { type: 'image/png' }))).rejects.toThrow('valid PDF')
    await expect(validateIntakeReceipt(new File(['%PDF-1.4'], 'proof.pdf', { type: 'application/pdf' }))).resolves.toBeInstanceOf(Uint8Array)
    await expect(validateIntakeReceipt(new File(['text'], 'proof.txt', { type: 'text/plain' }))).rejects.toThrow()
    await expect(validateIntakeReceipt(new File([new Uint8Array(MAX_INTAKE_RECEIPT_BYTES + 1)], 'big.pdf', { type: 'application/pdf' }))).rejects.toThrow('2MB')
  })
})
