import { test, expect } from '@playwright/test'

test('public donation form is available without login and fits the viewport', async ({ page }) => {
  await page.goto('/donate')
  await expect(page.getByRole('heading', { name: 'Public donation form' })).toBeVisible()
  await expect(page.getByLabel('Donor name')).toBeVisible()
  await expect(page.getByLabel('Email or phone')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit Donation for Verification' })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
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
