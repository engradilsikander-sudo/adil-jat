import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { submitDonation } from './donation-submit.server'

// Opt-in: real local Auth JWTs and PostgREST/Storage, not simulated role claims.
describe.skipIf(process.env.R1_LOCAL_INTEGRATION !== 'true')('R1 local JWT authorization and intake', () => {
  let admin: SupabaseClient, anon: SupabaseClient, member: SupabaseClient, outsider: SupabaseClient
  let token: string, userId: string, memberId: string
  const run = crypto.randomUUID()
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  function form(contact = `${crypto.randomUUID()}@example.test`, key = crypto.randomUUID()) {
    const data = new FormData()
    for (const [k, v] of Object.entries({ idempotencyKey: key, donorName: 'R1 Local Test', contact, amount: '150.25', purpose: 'general_fund', paymentMethod: 'bank', transactionReference: `R1-${run}`, notes: 'LOCAL R1 TEST RECORD — not a real payment', website: '', captchaToken: '', accessToken: '' })) data.set(k, v)
    return data
  }
  beforeAll(async () => {
    const url = process.env.SUPABASE_URL!
    if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Refusing nonlocal database')
    admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options)
    anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, options)
    async function user(label: string) {
      const email = `r1-${label}-${run}@example.test`, password = `R1!${crypto.randomUUID()}`
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      expect(created.error).toBeNull()
      const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, options)
      const signed = await client.auth.signInWithPassword({ email, password })
      expect(signed.error).toBeNull()
      return { client, user: created.data.user!, token: signed.data.session!.access_token }
    }
    const a = await user('member'), b = await user('outsider')
    member = a.client; outsider = b.client; token = a.token; userId = a.user.id
    const created = await admin.from('members').insert({ user_id: userId, full_name: 'R1 Approved Member', father_name: 'R1 Test Father', mobile: '03001234567', cnic: run.replace(/\D/g, '').padEnd(13, '0').slice(0, 13).replace(/^(\d{5})(\d{7})(\d)$/, '$1-$2-$3'), district: 'Karachi Central', photo_url: 'local-test/no-photo', status: 'approved', member_no: `R1-${run}` }).select('id').single()
    expect(created.error).toBeNull()
    memberId = created.data!.id
  }, 30000)

  it('submits anonymously as pending and retries a discarded response concurrently exactly once', async () => {
    const data = form()
    await submitDonation(data) // simulate commit followed by lost response
    const results = await Promise.all([submitDonation(data), submitDonation(data)])
    expect(results[0]).toEqual(results[1])
    expect(results[0].status).toBe('pending')
    const rows = await admin.from('finance_donations').select('*').eq('donation_no', results[0].donationNo)
    expect(rows.data).toHaveLength(1)
    expect(rows.data![0]).toMatchObject({ status: 'pending', donor_user_id: null, donor_member_id: null, approved_at: null, approved_by: null })
    data.set('amount', '999')
    await expect(submitDonation(data)).rejects.toThrow('different details')
  })
  it('links a real authenticated approved member using authoritative snapshots', async () => {
    const data = form(); data.set('accessToken', token)
    const result = await submitDonation(data)
    const rows = await member.from('finance_donations').select('*').eq('donation_no', result.donationNo)
    expect(rows.error).toBeNull()
    expect(rows.data?.[0]).toMatchObject({ donor_user_id: userId, donor_member_id: memberId, donor_name_snapshot: 'R1 Approved Member', status: 'pending' })
    const ownUpdate = await member.from('finance_donations').update({ status: 'approved' }).eq('donation_no', result.donationNo).select()
    expect(ownUpdate.error !== null || ownUpdate.data?.length === 0).toBe(true)
  })
  it('rejects direct RPC, reads, writes, and raw member insert bypasses', async () => {
    for (const client of [anon, member, outsider]) {
      expect((await client.rpc('submit_public_donation', { _key: crypto.randomUUID(), _fingerprint: 'a'.repeat(64), _user_id: null, _payload: {}, _receipt_path: null })).error).not.toBeNull()
      expect((await client.rpc('consume_donation_intake_budget', { _contact_hash: 'a'.repeat(64) })).error).not.toBeNull()
      expect((await client.from('donation_intake_keys').select('*')).error).not.toBeNull()
    }
    expect((await anon.from('finance_donations').select('*')).error).not.toBeNull()
    expect((await anon.from('finance_donations').update({ status: 'approved' }).eq('transaction_reference', `R1-${run}`)).error).not.toBeNull()
    expect((await anon.from('finance_donations').delete().eq('transaction_reference', `R1-${run}`)).error).not.toBeNull()
    const read = await outsider.from('finance_donations').select('*').eq('transaction_reference', `R1-${run}`)
    expect(read.error).toBeNull(); expect(read.data).toEqual([])
    const update = await outsider.from('finance_donations').update({ status: 'approved' }).eq('transaction_reference', `R1-${run}`).select()
    expect(update.error !== null || update.data?.length === 0).toBe(true)
    expect((await member.from('finance_donations').insert({ donor_name: 'Forgery', amount: 1, purpose: 'general_fund', payment_method: 'bank', donor_user_id: userId, created_by: userId, donor_member_id: memberId, status: 'pending' })).error).not.toBeNull()
  })
  it('accepts authenticated nonmembers and rejects an invalid JWT', async () => {
    const session = await outsider.auth.getSession()
    const data = form(); data.set('accessToken', session.data.session!.access_token)
    const result = await submitDonation(data)
    const row = await admin.from('finance_donations').select('donor_user_id,donor_member_id,status').eq('donation_no', result.donationNo).single()
    expect(row.data).toMatchObject({ donor_user_id: session.data.session!.user.id, donor_member_id: null, status: 'pending' })
    data.set('accessToken', 'invalid-jwt')
    await expect(submitDonation(data)).rejects.toThrow('Session expired')
  })
  it('rejects invalid submissions in the actual server handler', async () => {
    for (const amount of ['0', '-1', '1.234', '100000001']) {
      const data = form(); data.set('amount', amount)
      await expect(submitDonation(data)).rejects.toThrow()
    }
    const missing = form(); missing.set('transactionReference', ' ')
    await expect(submitDonation(missing)).rejects.toThrow()
    const receipt = form(); receipt.set('receipt', new File(['not an image'], 'fake.png', { type: 'image/png' }))
    await expect(submitDonation(receipt)).rejects.toThrow('valid PDF')
  })
  it('stores optional receipts privately and prevents listing, reading, replacement, and deletion', async () => {
    const data = form(); data.set('receipt', new File(['%PDF-1.4\nR1 local fixture'], 'proof.pdf', { type: 'application/pdf' }))
    const result = await submitDonation(data)
    expect(await submitDonation(data)).toEqual(result)
    const row = await admin.from('finance_donations').select('receipt_file_path').eq('donation_no', result.donationNo).single()
    const path = row.data!.receipt_file_path
    for (const client of [anon, member, outsider]) {
      const bucket = client.storage.from('finance-documents')
      expect((await bucket.download(path)).error).not.toBeNull()
      expect((await bucket.createSignedUrl(path, 60)).error).not.toBeNull()
      const list = await bucket.list(path.split('/').slice(0, -1).join('/'))
      expect(list.error !== null || list.data?.length === 0).toBe(true)
      expect((await bucket.upload(path, new Blob(['replacement']), { upsert: true })).error).not.toBeNull()
      const removal = await bucket.remove([path])
      expect(removal.error !== null || removal.data?.length === 0).toBe(true)
    }
    expect((await admin.storage.from('finance-documents').download(path)).error).toBeNull()
  })
  it('enforces persistent contact budgets', async () => {
    const contact = `${crypto.randomUUID()}@example.test`
    const data = form(contact)
    for (let i = 0; i < 10; i++) await submitDonation(data)
    await expect(submitDonation(data)).rejects.toThrow('Too many submissions')
  })
  it('fails closed without CAPTCHA outside explicit local testing', async () => {
    const old = process.env.DONATION_LOCAL_TEST
    process.env.DONATION_LOCAL_TEST = 'false'
    try { await expect(submitDonation(form())).rejects.toThrow('security check') }
    finally { process.env.DONATION_LOCAL_TEST = old }
  })
})

