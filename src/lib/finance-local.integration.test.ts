import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { submitDonation } from './donation-submit.server'

// Opt-in, loopback-only tests use genuine Auth JWTs; fixtures remain clearly labeled.
describe.skipIf(process.env.R1_LOCAL_INTEGRATION !== 'true')('R1.2 real JWT Finance isolation', () => {
  const run = crypto.randomUUID()
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const definitions = [
    ['super', ['super_admin']], ['admin', ['admin']], ['finance', ['finance_admin']],
    ['district', []], ['taluka', []], ['program', ['education_admin']],
    ['member', []], ['nonmember', []], ['different-member', []],
    ['multi-super', ['admin', 'finance_admin', 'super_admin']],
    ['multi-denied', ['admin', 'finance_admin', 'health_admin']], ['revoked', ['super_admin']],
  ] as const
  const actors: Record<string, { client: SupabaseClient; id: string; token: string }> = {}
  let service: SupabaseClient, anonymous: SupabaseClient
  let donationId: string, expenseId: string, auditId: string, ownId: string
  let privatePath: string, ownPath: string, unlinkedPath: string
  const donation = { donor_name: `LOCAL R1.2 ${run}`, amount: 12.34, purpose: 'general_fund', payment_method: 'bank', district: 'Karachi Central', taluka: 'Liaquatabad', notes: 'DISPOSABLE LOCAL SECURITY FIXTURE' }
  const expense = { expense_title: `LOCAL R1.2 ${run}`, amount: 2.34, category: 'general', payment_method: 'bank', paid_to: 'LOCAL R1.2 fixture', district: 'Karachi Central', taluka: 'Liaquatabad' }
  const bytes = new Blob(['%PDF-1.4 LOCAL R1.2 fixture'], { type: 'application/pdf' })
  const denied = (result: { error: unknown; data: unknown }) => expect(Boolean(result.error) || (Array.isArray(result.data) && result.data.length === 0)).toBe(true)

  beforeAll(async () => {
    const url = process.env.SUPABASE_URL!
    if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Local stack required')
    service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, options)
    anonymous = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, options)
    for (const [label, roles] of definitions) {
      const email = `r12-${label}-${run}@example.test`, password = `R12!${crypto.randomUUID()}`
      const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'super_admin' } })
      expect(created.error).toBeNull()
      const id = created.data.user!.id
      if (roles.length) expect((await service.from('user_roles').insert(roles.map(role => ({ user_id: id, role })))).error).toBeNull()
      const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, options)
      const signed = await client.auth.signInWithPassword({ email, password })
      expect(signed.error).toBeNull()
      actors[label] = { client, id, token: signed.data.session!.access_token }
      if (label === 'member' || label === 'different-member') {
        const digits = [...crypto.getRandomValues(new Uint8Array(13))].map(x => x % 10).join('')
        expect((await service.from('members').insert({ user_id: id, full_name: `LOCAL R1.2 ${label}`, father_name: 'Fixture', mobile: '03001234567', cnic: digits.replace(/^(\d{5})(\d{7})(\d)$/, '$1-$2-$3'), district: 'Karachi Central', photo_url: 'local-test/no-photo', status: 'approved', member_no: `R12-${id}` })).error).toBeNull()
      }
      // Include both all-module and finance-specific scoped grants; none can override Finance.
      if (label === 'district' || label === 'taluka' || label === 'finance') {
        expect((await service.from('admin_area_permissions').insert({ user_id: id, module_key: label === 'district' ? 'all' : 'finance', scope: label === 'taluka' ? 'taluka' : 'district', district: 'Karachi Central', taluka: label === 'taluka' ? 'Liaquatabad' : null, can_view: true, can_review: true, can_approve: true, is_active: true })).error).toBeNull()
      }
      // Permit mixed reports to test redaction rather than just the outer RPC gate.
      if (label === 'revoked' || (!roles.includes('super_admin' as never) && !roles.includes('admin' as never))) {
        expect((await service.from('admin_area_permissions').insert({ user_id: id, module_key: 'reports', scope: 'all', can_view: true, is_active: true })).error).toBeNull()
      }
    }
    expect((await service.from('user_roles').delete().eq('user_id', actors.revoked.id).eq('role', 'super_admin')).error).toBeNull()
    privatePath = `intake/${run}/r12.pdf`
    ownPath = `${actors.member.id}/donations/r12-${run}.pdf`
    unlinkedPath = `${actors.member.id}/donations/unlinked-${run}.pdf`
    for (const path of [privatePath, ownPath, unlinkedPath]) expect((await service.storage.from('finance-documents').upload(path, bytes)).error).toBeNull()
    const d = await service.from('finance_donations').insert({ ...donation, receipt_file_path: privatePath, status: 'approved' }).select('id').single()
    const e = await service.from('finance_expenses').insert({ ...expense, document_path: privatePath, status: 'paid' }).select('id').single()
    const own = await service.from('finance_donations').insert({ ...donation, donor_user_id: actors.member.id, receipt_file_path: ownPath, status: 'approved' }).select('id').single()
    for (const result of [d, e, own]) expect(result.error).toBeNull()
    donationId = d.data!.id; expenseId = e.data!.id; ownId = own.data!.id
    const a = await service.from('finance_audit_logs').insert({ action: 'LOCAL_R12_FIXTURE', entity_type: 'donation', entity_id: donationId }).select('id').single()
    expect(a.error).toBeNull(); auditId = a.data!.id
  }, 60000)

  for (const label of [...definitions.map(d => d[0]), 'anonymous']) {
    it(`${label}: effective tables, helpers, reports, Storage and public intake`, async () => {
      const actor = actors[label]
      const client = actor?.client ?? anonymous
      const allowed = label === 'super' || label === 'multi-super'
      for (const [rpc, args] of [
        ['current_user_can_manage_finance', {}],
        ['current_user_can_access_finance_area', { _district: 'Karachi Central', _taluka: 'Liaquatabad', _action: 'approve' }],
        ['current_user_can_access_area_module', { _module_key: 'finance', _action: 'view' }],
      ] as const) {
        const result = await client.rpc(rpc, args)
        expect(!result.error && result.data === true).toBe(allowed)
      }
      for (const [table, id, row] of [
        ['finance_donations', donationId, donation], ['finance_expenses', expenseId, expense],
        ['finance_audit_logs', auditId, { action: 'LOCAL_R12_CLIENT_FIXTURE', entity_type: 'donation', entity_id: donationId }],
      ] as const) {
        const read = await client.from(table).select('id').eq('id', id)
        if (allowed) { expect(read.error).toBeNull(); expect(read.data).toHaveLength(1) } else denied(read)
        const write = await client.from(table).insert(row as Record<string, unknown>).select('id')
        if (allowed) { expect(write.error).toBeNull(); expect(write.data).toHaveLength(1) } else expect(write.error).not.toBeNull()
        if (table !== 'finance_audit_logs' && !allowed) denied(await client.from(table).update({ status: 'approved' }).eq('id', id).select('id'))
        // No finance records are deleted, including fixtures. DELETE lacks a grant.
        expect((await client.from(table).delete().eq('id', crypto.randomUUID())).error).not.toBeNull()
      }
      const bucket = client.storage.from('finance-documents')
      for (const result of [await bucket.download(privatePath), await bucket.createSignedUrl(privatePath, 30)]) {
        if (allowed) expect(result.error).toBeNull(); else expect(result.error).not.toBeNull()
      }
      const listing = await bucket.list(`intake/${run}`)
      if (allowed) { expect(listing.error).toBeNull(); expect(listing.data?.some(x => x.name === 'r12.pdf')).toBe(true) } else denied(listing)
      const scratch = `r12-fixtures/${run}/${label}.pdf`
      for (const result of [await bucket.upload(scratch, bytes), await bucket.upload(privatePath, bytes, { upsert: true }), await bucket.copy(privatePath, `${scratch}.copy`), await bucket.move(`${scratch}.copy`, `${scratch}.moved`)]) {
        if (allowed) expect(result.error).toBeNull(); else expect(result.error).not.toBeNull()
      }
      if (allowed) expect((await bucket.remove([`${scratch}.moved`])).error).toBeNull()
      else {
        // A known existing source must not be movable or deletable.
        expect((await bucket.move(privatePath, `${scratch}.stolen`)).error).not.toBeNull()
        denied(await bucket.remove([privatePath]))
      }
      const report = await client.rpc('jas_reports_center_summary', { _period: 'all' })
      if (label === 'anonymous') expect(report.error).not.toBeNull()
      else {
        expect(report.error).toBeNull()
        expect(report.data.financeVisible).toBe(allowed)
        if (!allowed) {
          expect(report.data.financeByPurpose).toEqual([])
          expect(report.data.recentActivity.some((r: { type: string }) => ['donation', 'expense'].includes(r.type))).toBe(false)
          for (const d of report.data.districtSummaries) expect([Number(d.approvedDonations), Number(d.paidExpenses)]).toEqual([0, 0])
          for (const m of report.data.monthlySummaries) expect([Number(m.donations), Number(m.expenses)]).toEqual([0, 0])
        }
      }
      if (!allowed) expect((await client.rpc('get_audit_logs', { _module_key: 'finance' })).error).not.toBeNull()
      const form = new FormData()
      for (const [key, value] of Object.entries({ idempotencyKey: crypto.randomUUID(), donorName: `LOCAL R1.2 ${label}`, contact: `r12-${crypto.randomUUID()}@example.test`, amount: '1.25', purpose: 'general_fund', paymentMethod: 'bank', transactionReference: `LOCAL-R12-${run}`, notes: 'DISPOSABLE LOCAL SECURITY FIXTURE', website: '', captchaToken: '', accessToken: actor?.token ?? '' })) form.set(key, value)
      expect((await submitDonation(form)).status).toBe('pending')
      // Service-created evidence survived every denied operation.
      expect((await service.storage.from('finance-documents').download(privatePath)).error).toBeNull()
    }, 30000)
  }

  it('preserves linked historical own receipts and history without permitting arbitrary own-folder evidence', async () => {
    const member = actors.member.client
    const read = await member.from('finance_donations').select('id').eq('id', ownId)
    expect(read.error).toBeNull(); expect(read.data).toHaveLength(1)
    const bucket = member.storage.from('finance-documents')
    expect((await bucket.download(ownPath)).error).toBeNull()
    expect((await bucket.createSignedUrl(ownPath, 30)).error).toBeNull()
    expect((await bucket.download(unlinkedPath)).error).not.toBeNull()
    expect((await actors['different-member'].client.storage.from('finance-documents').download(ownPath)).error).not.toBeNull()
    expect((await bucket.upload(ownPath, bytes, { upsert: true })).error).not.toBeNull()
    expect((await bucket.copy(ownPath, `${ownPath}.copy`)).error).not.toBeNull()
    expect((await bucket.move(ownPath, `${ownPath}.moved`)).error).not.toBeNull()
    denied(await bucket.remove([ownPath]))
    denied(await member.from('finance_donations').update({ status: 'rejected' }).eq('id', ownId).select())
    expect((await member.rpc('get_donor_leaderboard')).error).toBeNull()
  })

  it('supports Super Admin decisions, internal cash, accurate reports and immediate database role revocation', async () => {
    const client = actors.super.client
    const d = await client.from('finance_donations').insert({ ...donation, payment_method: 'cash' }).select('id').single()
    const e = await client.from('finance_expenses').insert(expense).select('id').single()
    expect(d.error).toBeNull(); expect(e.error).toBeNull()
    for (const status of ['approved', 'rejected']) expect((await client.from('finance_donations').update({ status }).eq('id', d.data!.id).select().single()).error).toBeNull()
    for (const status of ['approved', 'paid', 'rejected']) expect((await client.from('finance_expenses').update({ status }).eq('id', e.data!.id).select().single()).error).toBeNull()
    const report = await client.rpc('jas_reports_center_summary', { _period: 'all' })
    expect(report.error).toBeNull(); expect(report.data.financeVisible).toBe(true)
    const rows = await service.from('finance_donations').select('amount').eq('status', 'approved')
    expect(rows.error).toBeNull()
    const total = report.data.financeByPurpose.reduce((sum: number, row: { approvedDonations: number }) => sum + Number(row.approvedDonations), 0)
    expect(total).toBeCloseTo(rows.data!.reduce((sum, row) => sum + Number(row.amount), 0), 2)
    expect((await service.from('user_roles').delete().eq('user_id', actors.super.id).eq('role', 'super_admin')).error).toBeNull()
    expect((await client.rpc('current_user_can_manage_finance')).data).toBe(false)
    denied(await client.from('finance_donations').select().eq('id', donationId))
    expect((await client.storage.from('finance-documents').createSignedUrl(privatePath, 30)).error).not.toBeNull()
  })
})
