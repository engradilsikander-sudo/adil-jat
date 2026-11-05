import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ rpc: vi.fn(), upload: vi.fn(), getUser: vi.fn() }))
vi.mock('./supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mock.rpc, auth: { getUser: mock.getUser }, storage: { from: () => ({ upload: mock.upload }) } }) }))
import { submitDonationResult } from './donation-submit.server'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

function form() {
  const data = new FormData()
  for (const [key, value] of Object.entries({ idempotencyKey: crypto.randomUUID(), donorName: 'Public Donor', contact: 'donor@example.test', amount: '123.45', purpose: 'general_fund', paymentMethod: 'bank', transactionReference: 'TX-123', notes: '', website: '', captchaToken: 'challenge', accessToken: '' })) data.set(key, value)
  return data
}
beforeEach(() => {
  vi.stubEnv('DONATION_LOCAL_TEST', 'false')
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321')
  vi.stubEnv('DONATION_TURNSTILE_SECRET_KEY', 'test-only-secret')
  vi.stubEnv('DONATION_ALLOWED_HOSTNAMES', 'jwas.app')
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({ success: true, action: 'donation', hostname: 'jwas.app' })))
  mock.rpc.mockReset().mockImplementation(async name => ({ error: null, data: name === 'consume_donation_intake_budget' ? true : { donationNo: 'DON-TEST-1', status: 'pending', privateField: 'never return' } }))
  mock.upload.mockReset().mockResolvedValue({ error: null })
  mock.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: { message: 'internal auth detail' } })
})

it.each(['bank', 'jazzcash', 'easypaisa', 'manual_transfer'])('accepts electronic %s and limits the public acknowledgement', async method => {
  const data = form(); data.set('paymentMethod', method)
  expect(await submitDonationResult(data)).toEqual({ ok: true, donationNo: 'DON-TEST-1', status: 'pending' })
})
it.each(['cash', 'unsupported'])('rejects public %s server-side before any write', async method => {
  const data = form(); data.set('paymentMethod', method)
  expect(await submitDonationResult(data)).toMatchObject({ ok: false, code: 'validation', outcome: 'not_submitted' })
  expect(mock.rpc).not.toHaveBeenCalled()
})
it('rejects missing references, duplicate parts, unknown fields and invalid form objects', async () => {
  const missing = form(); missing.set('transactionReference', '')
  const duplicate = form(); duplicate.append('amount', '20')
  const unknown = form(); unknown.set('approved_by', 'forged')
  for (const input of [missing, duplicate, unknown, {} as FormData]) {
    expect(await submitDonationResult(input)).toMatchObject({ ok: false, code: 'validation', outcome: 'not_submitted' })
  }
  expect(mock.rpc).not.toHaveBeenCalled()
})
it.each([
  { success: false, 'error-codes': ['timeout-or-duplicate'] },
  { success: true, action: 'wrong', hostname: 'jwas.app' },
  { success: true, action: 'donation', hostname: 'jwas.app.attacker.test' },
  { success: true, action: 'donation' },
])('fails closed for invalid or expired Turnstile results %#', async response => {
  vi.mocked(fetch).mockResolvedValue(Response.json(response))
  expect(await submitDonationResult(form())).toMatchObject({ ok: false, code: 'captcha', outcome: 'not_submitted' })
  expect(mock.rpc).not.toHaveBeenCalled()
})
it('fails closed for missing configuration, provider exceptions and malformed responses', async () => {
  vi.stubEnv('DONATION_TURNSTILE_SECRET_KEY', '')
  expect(await submitDonationResult(form())).toMatchObject({ code: 'captcha' })
  vi.stubEnv('DONATION_TURNSTILE_SECRET_KEY', 'test-only-secret')
  vi.mocked(fetch).mockRejectedValue(new Error('secret provider stack'))
  expect(await submitDonationResult(form())).toMatchObject({ code: 'captcha' })
  vi.mocked(fetch).mockResolvedValue(new Response('not-json'))
  expect(await submitDonationResult(form())).toMatchObject({ code: 'captcha' })
})
it('returns clear rate-limit feedback without writing or leaking internals', async () => {
  mock.rpc.mockResolvedValue({ data: false, error: null })
  const result = await submitDonationResult(form())
  expect(result).toMatchObject({ ok: false, code: 'rate_limit', outcome: 'not_submitted' })
  expect(mock.rpc).toHaveBeenCalledTimes(1)
  expect(JSON.stringify(result)).not.toMatch(/stack|postgres|service_role/)
})
it('distinguishes pre-write exceptions from an uncertain database result', async () => {
  mock.rpc.mockRejectedValue(new Error('secret database internals'))
  expect(await submitDonationResult(form())).toMatchObject({ code: 'unavailable', outcome: 'not_submitted' })
  mock.rpc.mockImplementation(async name => {
    if (name === 'consume_donation_intake_budget') return { data: true, error: null }
    throw new Error('secret database internals')
  })
  const result = await submitDonationResult(form())
  expect(result).toMatchObject({ code: 'unconfirmed', outcome: 'unconfirmed' })
  expect(JSON.stringify(result)).not.toMatch(/secret|stack|database internals/)
})
it('reports payload conflict without inventing success or exposing SQL', async () => {
  mock.rpc.mockImplementation(async name => name === 'consume_donation_intake_budget' ? { data: true, error: null } : { data: null, error: { message: 'idempotency_conflict: internal SQL details' } })
  const result = await submitDonationResult(form())
  expect(result).toMatchObject({ code: 'conflict', outcome: 'unconfirmed' })
  expect(JSON.stringify(result)).not.toContain('SQL')
})
it('keeps upload paths independent of filenames and never upserts', async () => {
  const data = form(); data.set('receipt', new File(['%PDF-1.4 proof'], '../../escape.pdf', { type: 'application/pdf' }))
  expect(await submitDonationResult(data)).toMatchObject({ ok: true })
  expect(mock.upload).toHaveBeenCalledWith(expect.stringMatching(/^intake\/[a-f0-9-]+\/[a-f0-9]{64}$/), expect.any(Uint8Array), { contentType: 'application/pdf', upsert: false })
})
