import { createHash } from 'node:crypto'
import { createSupabaseAdminClient } from './supabase/admin'
import { DonationSubmissionError, donationFailure, type DonationSubmissionResult } from './donation-result'
import { donationIntakeSchema, validateIntakeReceipt } from './donation-intake'

const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

export async function submitDonation(form: FormData) {
  let writeStarted = false
  try {
    if (!(form instanceof FormData)) throw new DonationSubmissionError('validation')
    const keys = [...form.keys()]
    if (new Set(keys).size !== keys.length) throw new DonationSubmissionError('validation')
    const parsed = donationIntakeSchema.safeParse(Object.fromEntries([...form.entries()].filter(([key]) => key !== 'receipt')))
    if (!parsed.success) throw new DonationSubmissionError('validation')
    const input = parsed.data
    const receipt = form.get('receipt')
    if (receipt !== null && !(receipt instanceof File)) throw new DonationSubmissionError('receipt')
    const bytes = await validateIntakeReceipt(receipt).catch(() => { throw new DonationSubmissionError('receipt') })
    const admin = createSupabaseAdminClient()
    // These service-only RPCs deliberately have no browser-accessible grants.
    const rpc = admin.rpc.bind(admin) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
    let userId: string | null = null
    if (input.accessToken) {
      const { data, error } = await admin.auth.getUser(input.accessToken)
      if (error || !data.user) throw new DonationSubmissionError('session')
      userId = data.user.id
    }

    const secret = process.env.DONATION_TURNSTILE_SECRET_KEY
    // Test bypass is restricted to an explicitly configured loopback Supabase stack.
    const local = process.env.DONATION_LOCAL_TEST === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.SUPABASE_URL || 'https://invalid').hostname)
    if (!local) {
      if (!secret || !input.captchaToken) throw new DonationSubmissionError('captcha')
      try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', body: new URLSearchParams({ secret, response: input.captchaToken }), signal: AbortSignal.timeout(10000),
        })
        const result = await response.json() as { success?: boolean; action?: string; hostname?: string }
        const hosts = (process.env.DONATION_ALLOWED_HOSTNAMES || '').split(',').map(v => v.trim()).filter(Boolean)
        if (!response.ok || !result.success || result.action !== 'donation' || !result.hostname || !hosts.includes(result.hostname)) {
          throw new DonationSubmissionError('captcha')
        }
      } catch { throw new DonationSubmissionError('captcha') }
    }

    const budget = await rpc('consume_donation_intake_budget', { _contact_hash: hash(input.contact.toLowerCase()) })
    if (budget.error) throw new DonationSubmissionError('unavailable')
    if (budget.data !== true) throw new DonationSubmissionError('rate_limit')

    const payload = { donorName: input.donorName, contact: input.contact, amount: Number(input.amount), purpose: input.purpose, paymentMethod: input.paymentMethod, transactionReference: input.transactionReference, notes: input.notes }
    const digest = hash(JSON.stringify({ ...payload, userId, receiptHash: bytes ? hash(bytes) : null, receiptType: bytes ? receipt!.type : null }))
    // Content-addressed, unguessable path; retries never overwrite a prior object.
    const receiptPath = bytes ? `intake/${input.idempotencyKey}/${digest}` : null
    if (bytes && receiptPath) {
      const { error } = await admin.storage.from('finance-documents').upload(receiptPath, bytes, { contentType: receipt!.type, upsert: false })
      if (error && String((error as { statusCode?: string }).statusCode) !== '409') throw new DonationSubmissionError('unavailable')
    }
    writeStarted = true
    const { data, error } = await rpc('submit_public_donation', {
      _key: input.idempotencyKey, _fingerprint: digest, _user_id: userId, _payload: payload, _receipt_path: receiptPath,
    })
    if (error) {
      if (error.message.includes('idempotency_conflict')) throw new DonationSubmissionError('conflict')
      throw new DonationSubmissionError('unconfirmed')
    }
    if (!data || typeof data !== 'object' || !('donationNo' in data) || typeof data.donationNo !== 'string' || !('status' in data) || data.status !== 'pending') throw new DonationSubmissionError('unconfirmed')
    return { donationNo: data.donationNo, status: 'pending' as const }
  } catch (error) {
    if (error instanceof DonationSubmissionError) throw error
    throw new DonationSubmissionError(writeStarted ? 'unconfirmed' : 'unavailable')
  }
}

// Serialize only this allowlisted result. Never serialize an Error or database response.
export async function submitDonationResult(form: FormData): Promise<DonationSubmissionResult> {
  try { return { ok: true, ...await submitDonation(form) } }
  catch (error) { return donationFailure(error) }
}
