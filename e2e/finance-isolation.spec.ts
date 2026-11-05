import { expect, test } from '@playwright/test'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

test.use({ serviceWorkers: 'block' })
test.describe('R1.2 real local Finance routes', () => {
  test.skip(process.env.R1_LOCAL_INTEGRATION !== 'true', 'Requires the loopback-only fixture runner')
  let service: SupabaseClient
  const sessions: Record<string, Session> = {}
  const run = crypto.randomUUID()
  const marker = `LOCAL R12 BROWSER ${run}`
  test.beforeAll(async () => {
    const url = process.env.SUPABASE_URL!
    if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Loopback required')
    service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    for (const [label, roles] of [['super', ['super_admin']], ['admin', ['admin']], ['finance', ['finance_admin']], ['member', []]] as const) {
      const email = `r12-browser-${label}-${run}@example.test`, password = `R12!${crypto.randomUUID()}`
      const created = await service.auth.admin.createUser({ email, password, email_confirm: true })
      expect(created.error).toBeNull()
      if (roles.length) expect((await service.from('user_roles').insert(roles.map(role => ({ user_id: created.data.user!.id, role })))).error).toBeNull()
      const client = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
      const signed = await client.auth.signInWithPassword({ email, password })
      expect(signed.error).toBeNull(); sessions[label] = signed.data.session!
    }
    expect((await service.from('finance_donations').insert({ donor_name: marker, amount: 32.12, purpose: 'general_fund', payment_method: 'bank', status: 'pending' })).error).toBeNull()
  })

  for (const label of ['admin', 'finance', 'member', 'anonymous']) {
    test(`${label} direct Finance URL is denied without loading ledgers`, async ({ page }) => {
      if (sessions[label]) await page.addInitScript(session => { localStorage.setItem('jas-app-auth', JSON.stringify(session)); localStorage.setItem('jas_language', 'en') }, sessions[label])
      const ledgerRequests: string[] = []
      page.on('request', req => { if (/\/rest\/v1\/finance_(donations|expenses|audit_logs)/.test(req.url())) ledgerRequests.push(req.url()) })
      await page.goto('/admin/finance')
      await expect(page.getByRole('alert').filter({ hasText: 'Finance access requires Super Admin' })).toBeVisible({ timeout: 15000 })
      await expect(page.locator('a[href="/admin/finance"]')).toHaveCount(0)
      await expect(page.getByText(marker)).toHaveCount(0)
      expect(ledgerRequests).toEqual([])
    })
  }

  test('Super Admin opens Finance; database revocation clears it using the same browser session', async ({ page }) => {
    await page.addInitScript(session => { localStorage.setItem('jas-app-auth', JSON.stringify(session)); localStorage.setItem('jas_language', 'en') }, sessions.super)
    await page.goto('/admin/finance')
    await expect(page.getByRole('button', { name: 'Donations', exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Donations', exact: true }).click()
    await expect(page.getByText(marker, { exact: true })).toBeVisible()
    expect((await service.from('user_roles').delete().eq('user_id', sessions.super.user.id).eq('role', 'super_admin')).error).toBeNull()
    await expect(page.getByRole('alert').filter({ hasText: 'Finance access requires Super Admin' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(marker)).toHaveCount(0)
    await expect(page.locator('a[href="/admin/finance"]')).toHaveCount(0)
  })
})
