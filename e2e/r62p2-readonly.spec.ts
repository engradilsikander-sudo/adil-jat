/**
 * JWAS R6.2-P2-A — guarded, local-only, synthetic browser acceptance.
 *
 * IMPORTANT: These tests DO NOT validate the real migrated Supabase users,
 * real admin authorization, real payment recipient or actual bank QR payee.
 * Those still require separately authorized, read-only live acceptance.
 */
import { expect, test, type Page, type Response } from '@playwright/test'
import { installSyntheticSession, verifySyntheticSession } from './fixtures/mobile-session'

test.use({ serviceWorkers: 'block' })

const blockedRequests = new WeakMap<Page, string[]>()

function requireLocalOrigin(baseURL: string | undefined) {
  test.skip(!baseURL || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname),
    'Read-only synthetic acceptance is loopback-only; never run synthetic JWTs against Preview or Production.')
}

async function installReadOnlySession(page: Page, options: Parameters<typeof installSyntheticSession>[1] = {}) {
  const state = await installSyntheticSession(page, options)
  const blocked: string[] = []
  blockedRequests.set(page, blocked)

  // Route.fallback() preserves the existing exact Auth/REST/Storage mock; it
  // does not send those requests to the real Supabase backend.
  await page.route('**/*', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const method = req.method()
    const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
    // The existing admin navigation makes precisely this read-only RPC call.
    const isRoleRead = method === 'POST' && [
      '/rest/v1/rpc/current_user_can_manage_finance',
      '/rest/v1/rpc/get_my_area_permissions',
    ].includes(url.pathname)
    if (!isRead && !isRoleRead) {
      blocked.push(`${method} ${url.pathname}`)
      await route.fulfill({ status: 405, contentType: 'application/json', body: '{"error":"R6.2-P2-A read-only guard blocked a write"}' })
      return
    }
    await route.fallback()
  })
  return state
}

test.afterEach(async ({ page }, testInfo) => {
  await verifySyntheticSession(page, testInfo)
  const blocked = blockedRequests.get(page)
  if (blocked) expect(blocked, 'No mutation attempts may occur in the read-only suite').toEqual([])
})

test('P2-A1: existing approved member sees their linked dashboard and scoped notification count', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  const state = await installReadOnlySession(page, { role: 'member', language: 'en' })
  await page.goto('/dashboard')
  await expect(page.locator('.dashboard-title')).toContainText('Mobile Fixture Member')
  await expect(page.locator('.dashboard-info-chips')).toContainText('JAS-2026-10001')
  await expect(page.locator('.member-navigation a[href="/card"]')).toHaveCount(1)
  await expect.poll(() => state.requests.some(line =>
    line.startsWith('HEAD /rest/v1/notifications?') && line.includes('is_read=eq.false'),
  )).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('P2-A2: approved member has a card and JWAS public verification URL without downloading', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  await installReadOnlySession(page, { role: 'member', language: 'en' })

  // The existing synthetic session fixture intentionally rejects unrecognized
  // queries. Supply only this extra read-only card-designation query as an
  // empty list, leaving the Auth/REST/Storage mock otherwise untouched.
  let designationReads = 0
  await page.route(url => url.pathname === '/rest/v1/organization_committee_members', async route => {
    const req = route.request()
    const url = new URL(req.url())
    expect(req.method()).toBe('GET')
    expect(url.searchParams.get('member_id')).toBe('in.(member-mobile-fixture)')
    expect(url.searchParams.get('status')).toBe('eq.active')
    designationReads++
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '[]' })
  })

  await page.goto('/card')
  await expect(page.getByRole('heading', { name: 'Digital Membership Card' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your card is ready' })).toBeVisible()
  await expect(page.locator('.card-preview-layout')).toBeVisible()
  await expect(page.locator('a[href="/verify/JAS-2026-10001"]')).toBeVisible()
  const verificationPath = '/verify/JAS-2026-10001'

  const verificationPanel = page.getByRole('complementary').filter({
    has: page.getByRole('heading', { name: 'Your card is ready' }),
  })

  await expect(
    verificationPanel.getByText(/^(?:localhost|127\.0\.0\.1)(?::\d+)?\/verify\/JAS-2026-10001$/),
  ).toBeVisible()

  await expect(
    verificationPanel.getByRole('link', { name: 'Open Verification' }),
  ).toHaveAttribute('href', verificationPath)
  expect(designationReads).toBeGreaterThan(0)
})

test('P2-A3: ordinary member cannot open an admin-only program page', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  const state = await installReadOnlySession(page, { role: 'member', language: 'en' })
  await page.goto('/admin/programs/education')
  // This route intentionally stays at the requested URL and shows a denial.
  await expect(page.getByText('Education area access required.', { exact: true })).toBeVisible()
  // Authorization must stop before protected application records are requested.
  expect(state.requests.filter(line => line.includes('/rest/v1/program_applications?'))).toEqual([])
})

// Observe the existing fixture; never fulfill or relax its request contracts here.
function waitForApiResponse(page: Page, pathname: string, method = 'GET', matches = (_url: URL) => true) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    return response.request().method() === method && url.pathname === pathname && matches(url)
  })
}

async function expectCompletedJson(response: Response, expected: unknown) {
  expect(await response.finished(), 'Mock response must finish without a network error').toBeNull()
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual(expected)
  const url = new URL(response.url())
  await test.info().attach('completed-api-response', {
    body: JSON.stringify({ method: response.request().method(), pathname: url.pathname,
      query: Object.fromEntries(url.searchParams), status: response.status(), body: expected }),
    contentType: 'application/json',
  })
}

test('P2-A4: synthetic Super Admin sees program console without mutating data', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  await installReadOnlySession(page, { role: 'admin', language: 'en' })
  // Register before navigation, including the unfiltered role lookup used by
  // loadCurrentAdminAreaAccess (not the header's filtered navigation lookup).
  const userResponse = waitForApiResponse(page, '/auth/v1/user')
  const roleResponse = waitForApiResponse(page, '/rest/v1/user_roles', 'GET', url => !url.searchParams.has('role'))
  const applicationResponse = waitForApiResponse(page, '/rest/v1/program_applications')
  await page.goto('/admin/programs/education')
  const [user, roles, applications] = await Promise.all([userResponse, roleResponse, applicationResponse])
  expect(await user.finished()).toBeNull()
  expect(user.status()).toBe(200)
  const identity = await user.json() as { id: string; role: string }
  expect(identity.role).toBe('authenticated')
  expect(Object.fromEntries(new URL(roles.url()).searchParams)).toEqual({ select: 'role', user_id: `eq.${identity.id}` })
  await expectCompletedJson(roles, [{ role: 'super_admin' }])
  const query = new URL(applications.url()).searchParams
  expect(query.get('program_key')).toBe('eq.education')
  expect(query.get('order')).toBe('created_at.desc,id.asc')
  expect(query.get('offset')).toBe('0')
  expect(query.get('limit')).toBe('500')
  expect(applications.request().headers().prefer).toContain('count=exact')
  expect(applications.headers()['content-range']).toBe('*/0')
  await expectCompletedJson(applications, [])

  const consolePage = page.locator('.admin-program-admin-page')
  // This branch renders only after loading=false and message='', unlike the shell.
  await expect(consolePage.getByRole('heading', { name: 'No education applications found', exact: true })).toBeVisible()
  await expect(consolePage.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  await expect(consolePage.locator('.animate-spin')).toHaveCount(0)
  await expect(consolePage.getByRole('heading', { name: 'Unable to load applications', exact: true })).toHaveCount(0)
  await expect(page.locator('.admin-sidebar')).toBeVisible()
  await expect(page.locator('.admin-filter-grid')).toBeVisible()
  await expect(page.locator('.admin-sidebar')).toContainText('JWAS Admin Panel')
})

test('P2-A4-r1-N1: completed member authorization denies education records', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  const state = await installReadOnlySession(page, { role: 'member', language: 'en' })
  const userResponse = waitForApiResponse(page, '/auth/v1/user')
  const roleResponse = waitForApiResponse(page, '/rest/v1/user_roles', 'GET', url => !url.searchParams.has('role'))
  const areaResponse = waitForApiResponse(page, '/rest/v1/rpc/get_my_area_permissions', 'POST')
  await page.goto('/admin/programs/education')
  const [user, roles, permissions] = await Promise.all([userResponse, roleResponse, areaResponse])
  expect(await user.finished()).toBeNull()
  expect(user.status()).toBe(200)
  const identity = await user.json() as { id: string; role: string }
  expect(identity.role).toBe('authenticated')
  expect(Object.fromEntries(new URL(roles.url()).searchParams)).toEqual({ select: 'role', user_id: `eq.${identity.id}` })
  await expectCompletedJson(roles, [])
  await expectCompletedJson(permissions, [])

  const consolePage = page.locator('.admin-program-admin-page')
  await expect(consolePage.getByRole('heading', { name: 'Unable to load applications', exact: true })).toBeVisible()
  await expect(consolePage.getByText('Education area access required.', { exact: true })).toBeVisible()
  await expect(consolePage.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled()
  await expect(consolePage.locator('.animate-spin')).toHaveCount(0)
  await expect(consolePage.getByRole('heading', { name: 'No education applications found', exact: true })).toHaveCount(0)
  expect(state.requests.filter(line => line.includes('/rest/v1/program_applications?'))).toEqual([])
})

test('P2-A5: new application shows approved PKR 500 Easypaisa details and QR, without submitting', async ({ page, baseURL }) => {
  requireLocalOrigin(baseURL)
  await page.setViewportSize({ width: 390, height: 844 })
  await installReadOnlySession(page, { role: 'member', language: 'en', memberRecord: false })
  await page.goto('/register')
  await expect(page.locator('#fullName')).toBeVisible()

  await page.locator('#fullName').fill('Read Only Fixture')
  await page.locator('#fatherName').fill('Fixture Parent')
  await page.locator('#cnic').fill('44104-1234567-1')
  await page.locator('#mobile').fill('03001234567')
  await page.getByRole('button', { name: /Next Step/i }).click()
  await page.locator('#district').selectOption({ label: 'Umerkot' })
  await page.locator('#taluka').selectOption({ label: 'Kunri' })
  await page.locator('#address').fill('Fixture location')
  await page.getByRole('button', { name: /Next Step/i }).click()
  await page.locator('#profession').fill('Teacher')
  await page.locator('#casteBranch').fill('Fixture')
  await page.locator('#dateOfBirth').fill('1990-01-01')
  await page.locator('#gender').selectOption({ label: 'Male' })
  await page.locator('#education').fill('Graduate')
  await page.locator('#bloodGroup').selectOption({ label: 'O+' })
  await page.getByRole('button', { name: /Next Step/i }).click()
  await page.locator('#emergencyContactName').fill('Fixture Contact')
  await page.locator('#emergencyContactRelation').fill('Brother')
  await page.locator('#emergencyContactMobile').fill('03111234567')
  await page.getByRole('button', { name: /Next Step/i }).click()

  await expect(page.locator('#membership-payment-title')).toContainText('Rs. 500')
  await expect(page.locator('#membership-payment-title')).toContainText('PKR')
  const paymentSection = page.locator('section[aria-labelledby="membership-payment-title"]')
  await expect(paymentSection.getByText('Easypaisa', { exact: true })).toBeVisible()
  await expect(paymentSection.getByText('Adil Sikandar', { exact: true })).toBeVisible()
  await expect(paymentSection.getByText('03332911141', { exact: true })).toBeVisible()
  await expect(paymentSection.getByText('PK41TMFB0000000055415311', { exact: true })).toBeVisible()
  const qr = page.locator('img[src="/jas/membership-payment-qr.jpg"]')
  await expect(qr).toBeVisible()
  await expect.poll(() => qr.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
  await expect(page.locator('#membership-receipt')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  // No photo selection, file upload or submit click occurs in this test.
})
