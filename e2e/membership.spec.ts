import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'node:path'
test('signup → application → admin approval → card download → QR', async ({ page, browser, baseURL }) => {
  test.skip(process.env.E2E_ALLOW_MUTATIONS !== 'STAGING_ONLY', 'Requires explicitly authorized isolated staging accounts')
  const required = ['E2E_STAGING_ORIGIN','E2E_SUPABASE_URL','E2E_SERVICE_ROLE_KEY','E2E_ADMIN_EMAIL','E2E_ADMIN_PASSWORD'] as const
  for (const key of required) expect(process.env[key], `${key} required`).toBeTruthy()
  expect(new URL(baseURL!).origin).toBe(new URL(process.env.E2E_STAGING_ORIGIN!).origin)
  const db = createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = `${Date.now()}`
  const email = `jas-e2e-${token}@example.test`
  const password = `JasTest!${token}`
  let userId = ''
  const admin = await browser.newContext()
  try {
    await page.goto('/signup')
    await page.locator('#fullName').fill(`E2E ${token}`)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#confirmPassword').fill(password)
    await page.locator('form').filter({ has: page.locator('#email') }).locator('button[type=submit]').click()
    // Isolated staging only: confirm the signup without relying on an external mailbox.
    await expect.poll(async () => {
      for (let n = 1; n <= 10; n++) {
        const { data, error } = await db.auth.admin.listUsers({ page: n, perPage: 100 })
        if (error) throw error
        userId = data.users.find((u) => u.email === email)?.id || ''
        if (userId || data.users.length < 100) break
      }
      return userId
    }, { timeout: 30000 }).not.toBe('')
    const confirmed = await db.auth.admin.updateUserById(userId, { email_confirm: true }); expect(confirmed.error).toBeNull()
    await page.goto('/login')
    await page.locator('#email').fill(email); await page.locator('#password').fill(password)
    await page.locator('form').filter({ has: page.locator('#email') }).locator('button[type=submit]').click()
    await page.waitForURL('**/dashboard')
    await page.goto('/register')
    await page.locator('#fullName').fill(`E2E ${token}`); await page.locator('#fatherName').fill('Test Parent')
    await page.locator('#cnic').fill(`44404-${token.slice(-7)}-1`); await page.locator('#mobile').fill('03001234567')
    await page.getByRole('button', { name: /Next Step/ }).click()
    await page.locator('#district').selectOption({ label: 'Umerkot' })
    await page.locator('#taluka').selectOption({ label: 'Kunri' })
    await page.locator('#address').fill('Staging test address')
    await page.getByRole('button', { name: /Next Step/ }).click()
    await page.locator('#profession').fill('Test'); await page.locator('#dateOfBirth').fill('1990-01-01')
    await page.locator('#gender').selectOption({ label: 'Male' }); await page.locator('#education').fill('Test')
    await page.getByRole('button', { name: /Next Step/ }).click()
    await page.locator('#emergencyContactName').fill('Test Contact'); await page.locator('#emergencyContactRelation').fill('Brother')
    await page.locator('#emergencyContactMobile').fill('03001234568')
    await page.getByRole('button', { name: /Next Step/ }).click()
    await page.locator('#photo').setInputFiles(resolve('public/jas/logo.jpeg'))
    await page.locator('.reg-declaration input[type=checkbox]').check()
    await page.locator('.reg-form button[type=submit]').click()
    await page.waitForURL('**/dashboard')
    const member = await db.from('members').select('id,status').eq('user_id', userId).single()
    expect(member.error).toBeNull(); expect(member.data?.status).toBe('pending')
    const review = await admin.newPage(); await review.goto(`${baseURL}/login`)
    await review.locator('#email').fill(process.env.E2E_ADMIN_EMAIL!); await review.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD!)
    await review.locator('form').filter({ has: review.locator('#email') }).locator('button[type=submit]').click()
    await review.waitForURL(/\/(admin|dashboard)/)
    await review.goto(`${baseURL}/admin/members/${member.data!.id}`)
    review.on('dialog', (dialog) => dialog.accept())
    await review.getByRole('button', { name: /Approve/i }).click()
    let memberNo = ''
    await expect.poll(async () => {
      const { data } = await db.from('members').select('status,member_no').eq('id', member.data!.id).single()
      memberNo = data?.member_no || ''; return data?.status
    }).toBe('approved')
    await page.goto('/card'); await expect(page.getByRole('heading', { name: /Digital Membership Card/i })).toBeVisible()
    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download Front PNG/i }).click()
    expect((await downloaded).suggestedFilename()).toMatch(/\.png$/)
    const visitor = await browser.newContext(); const verify = await visitor.newPage()
    await verify.goto(`${baseURL}/verify/${memberNo}`)
    await expect(verify.getByText(`E2E ${token}`, { exact: true })).toBeVisible()
    await visitor.close()
  } finally {
    await admin.close()
    if (userId) {
      const photos = await db.storage.from('member-photos').list(userId)
      if (photos.data?.length) await db.storage.from('member-photos').remove(photos.data.map((p) => `${userId}/${p.name}`))
      const removed = await db.auth.admin.deleteUser(userId)
      if (removed.error) throw new Error('Staging test user cleanup failed; remove test user manually.')
    }
  }
})
