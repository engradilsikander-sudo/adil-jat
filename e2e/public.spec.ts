import { test, expect } from '@playwright/test'

test('public donation form is available without login and fits the viewport', async ({ page }) => {
  await page.goto('/donate')
  await expect(page.getByRole('heading', { name: 'Public donation form' })).toBeVisible()
  await expect(page.getByLabel('Donor name')).toBeVisible()
  await expect(page.getByLabel('Email or phone')).toBeVisible()
  await expect(page.getByLabel('Payment Method').locator('option[value="cash"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear Draft' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Donation for Verification' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
})

test('local receipt recovery requires identical contents and fields after a lost response', async ({ page }) => {
  test.skip(process.env.R1_LOCAL_INTEGRATION !== 'true', 'Requires explicit local Supabase runtime')
  await page.goto('/donate')
  await page.getByLabel('Donor name').fill('R1-r1 Receipt Donor')
  await page.getByLabel('Email or phone').fill(`receipt-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Donation Amount').fill('45.67')
  await page.getByLabel('Transaction / Reference No').fill(`R1-r1-${crypto.randomUUID()}`)
  const receipt = { name: 'receipt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 original mobile receipt') }
  await page.getByLabel(/Receipt Screenshot/).setInputFiles(receipt)
  let writes = 0
  await page.route('**/*', async route => {
    if (route.request().method() === 'POST' && route.request().url().includes('/_serverFn/')) {
      writes++
      if (writes === 1) { await route.fetch(); await route.abort('failed'); return }
    }
    await route.continue()
  })
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByRole('alert')).toContainText('Submission could not be confirmed')
  const key = await page.evaluate(() => JSON.parse(sessionStorage.getItem('jas-donation-draft')!).idempotencyKey)
  await page.reload()
  await expect(page.getByLabel('Donor name')).toHaveValue('R1-r1 Receipt Donor')
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByRole('alert')).toContainText('Reselect the original receipt')
  await page.getByLabel(/Receipt Screenshot/).setInputFiles({ ...receipt, buffer: Buffer.from('%PDF-1.4 changed mobile receipt') })
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByRole('alert')).toContainText('receipt differs')
  await page.getByLabel(/Receipt Screenshot/).setInputFiles(receipt)
  await page.getByLabel('Donation Amount').fill('99.99')
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByRole('alert')).toContainText('details differ')
  expect(writes).toBe(1)
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('jas-donation-draft')!).idempotencyKey)).toBe(key)
  await page.getByLabel('Donation Amount').fill('45.67')
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByText(/Donation reference: DON-/)).toBeVisible()
  expect(writes).toBe(2)
})

test('local anonymous donation survives a lost HTTP response without duplication', async ({ page }) => {
  test.skip(process.env.R1_LOCAL_INTEGRATION !== 'true', 'Requires explicit local Supabase runtime')
  await page.goto('/donate')
  await page.getByLabel('Donor name').fill('R1 Mobile Donor')
  await page.getByLabel('Email or phone').fill(`mobile-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Donation Amount').fill('123.45')
  await page.getByLabel('Transaction / Reference No').fill(`R1-mobile-${crypto.randomUUID()}`)
  let lost = false
  await page.route('**/*', async route => {
    if (!lost && route.request().method() === 'POST' && route.request().url().includes('/_serverFn/')) {
      lost = true
      await route.fetch() // commit on the server, discard the response in transit
      await route.abort('failed')
    } else await route.continue()
  })
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByRole('button', { name: 'Submit Donation for Verification' })).toBeEnabled()
  expect(lost).toBe(true)
  await page.reload()
  await expect(page.getByLabel('Donor name')).toHaveValue('R1 Mobile Donor')
  await page.getByRole('button', { name: 'Submit Donation for Verification' }).click()
  await expect(page.getByText(/Donation reference: DON-/)).toBeVisible()
  await expect(page.getByText(/Pending verification — this is not confirmation of payment/)).toBeVisible()
})
test('landing and login remain usable without horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /One community/i })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.getByRole('link', { name: /^Login$/i }).click()
  await expect(page.locator('#email')).toBeVisible()
  await expect(page.locator('#password')).toBeVisible()
})


test('JWAS public identity, footer, QR and social metadata are consistent', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.locator('.welcome-brand')).toHaveAccessibleName('Jatt Welfare Alliance Sindh')
  await expect(page.locator('.welcome-brand strong')).toHaveText('Jatt Welfare Alliance Sindh')
  await expect(page.locator('.welcome-footer')).toContainText('Jatt Welfare Alliance Sindh')
  await expect(page.locator('.welcome-footer')).toContainText('©')
  await expect(page.locator('.welcome-tagline')).toHaveText('Education · Health · Dignity')
  await expect(page).toHaveTitle('Jatt Welfare Alliance Sindh | Member & Programs Portal')
  for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[name="twitter:title"]', 'meta[name="twitter:description"]']) {
    await expect(page.locator(selector)).toHaveAttribute('content', /Jatt Welfare Alliance Sindh/)
  }
  const manifest = await (await request.get('/manifest.json')).json()
  expect(manifest.name).toBe('Jatt Welfare Alliance Sindh')
  expect(manifest.short_name).toBe('JWAS')
  await page.screenshot({ path: '/tmp/jwas-b1-home.png', fullPage: true })
  await page.goto('/verify/INVALID')
  await expect(page.getByText('Jatt Welfare Alliance Sindh', { exact: true }).first()).toBeVisible()
  await expect(page.locator('body')).toContainText('JAS-YYYY-0001') // existing issued-number contract
  await page.goto('/login')
  await expect(page.locator('.jas-nav-brand strong')).toHaveText('Jatt Welfare Alliance Sindh')
  await expect(page.locator('.jas-nav-brand small')).toHaveText('Education · Health · Dignity')
})
