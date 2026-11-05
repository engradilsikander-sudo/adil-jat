import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from './supabase/admin'
import { donationIntakeSchema, validateIntakeReceipt } from './donation-intake'

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

export async function submitDonation(form: FormData) {
  const input = donationIntakeSchema.parse(Object.fromEntries([...form.entries()].filter(([key]) => key !== 'receipt')))
  const receipt = form.get('receipt')
  if (receipt !== null && !(receipt instanceof File)) throw new Error('Invalid receipt.')
  const bytes = await validateIntakeReceipt(receipt)
  const admin = createSupabaseAdminClient()
  // These service-only RPCs deliberately have no browser-accessible grants.
  const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  let userId: string | null = null
  if (input.accessToken) {
    const { data, error } = await admin.auth.getUser(input.accessToken)
    if (error || !data.user) throw new Error('Session expired. Sign in again or submit after signing out.')
    userId = data.user.id
  }

  const secret = process.env.DONATION_TURNSTILE_SECRET_KEY
  // Test bypass is restricted to an explicitly configured loopback Supabase stack.
  const local = process.env.DONATION_LOCAL_TEST === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.SUPABASE_URL || 'https://invalid').hostname)
  if (!local) {
    if (!secret || !input.captchaToken) throw new Error('Please complete the donation security check.')
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret, response: input.captchaToken }), signal: AbortSignal.timeout(10000),
    })
    const result = await response.json() as { success?: boolean; action?: string; hostname?: string }
    const hosts = (process.env.DONATION_ALLOWED_HOSTNAMES || '').split(',').map(v => v.trim()).filter(Boolean)
    if (!response.ok || !result.success || result.action !== 'donation' || !result.hostname || !hosts.includes(result.hostname)) {
      throw new Error('Security check failed. Complete a new check and retry.')
    }
  }

  const budget = await rpc('consume_donation_intake_budget', { _contact_hash: hash(input.contact.toLowerCase()) })
  if (budget.error) throw new Error('Donation submission is temporarily unavailable. Please try again later.')
  if (budget.data !== true) throw new Error('Too many submissions. Please try again in one hour.')

  const payload = { donorName: input.donorName, contact: input.contact, amount: Number(input.amount), purpose: input.purpose, paymentMethod: input.paymentMethod, transactionReference: input.transactionReference, notes: input.notes }
  const digest = hash(JSON.stringify({ ...payload, userId, receiptHash: bytes ? hash(bytes) : null, receiptType: bytes ? receipt!.type : null }))
  // Content-addressed, unguessable path; retries never overwrite a prior object.
  const receiptPath = bytes ? `intake/${input.idempotencyKey}/${digest}` : null
  if (bytes && receiptPath) {
    const { error } = await admin.storage.from('finance-documents').upload(receiptPath, bytes, { contentType: receipt!.type, upsert: false })
    if (error && String((error as { statusCode?: string }).statusCode) !== '409') throw new Error('Receipt upload failed. Retry this submission.')
  }
  const { data, error } = await rpc('submit_public_donation', {
    _key: input.idempotencyKey, _fingerprint: digest, _user_id: userId, _payload: payload, _receipt_path: receiptPath,
  })
  if (error) {
    if (error.message.includes('idempotency_conflict')) throw new Error('This submission was already received with different details. Restore the original details and retry.')
    throw new Error('Submission could not be confirmed. Keep your details and retry; the same submission will not be duplicated.')
  }
  return data as { donationNo: string; status: 'pending' }
}
