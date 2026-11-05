import { expect, test, type Page } from '@playwright/test'
import { installSyntheticSession, verifySyntheticSession } from './fixtures/mobile-session'

// This is a browser release gate. Synthetic auth is intentionally local-only;
// requests are intercepted in mobile-session.ts and never sent to live accounts.
test.use({ serviceWorkers: 'block' })
test.afterEach(async ({ page }, testInfo) => { await verifySyntheticSession(page, testInfo) })

function onlyLocalSynthetic(baseURL: string | undefined) {
  if (!baseURL) return false
  return ['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)
}
async function noHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 1,
  )).toBe(true)
}

test('PWA manifest, offline fallback and icon resources are accessible', async ({ request }) => {
  const response = await request.get('/manifest.json')
  expect(response.ok()).toBe(true)
  const manifest = await response.json() as {
    display: string, start_url: string, icons: Array<{ src: string, sizes: string }>
  }
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons.find((item) => item.sizes === size)
    expect(icon, `Missing PWA icon ${size}`).toBeTruthy()
    const iconResponse = await request.get(icon!.src)
    expect(iconResponse.ok()).toBe(true)
    expect((await iconResponse.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  }
  for (const path of ['/offline.html', '/sw.js', '/apple-touch-icon.png', '/.well-known/assetlinks.json']) {
    const asset = await request.get(path)
    expect(asset.ok(), `${path} must be served`).toBe(true)
  }
})

test('public landing and login fit narrow mobile viewports without clipping', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 520 },
    { width: 412, height: 915 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.welcome-page')).toBeVisible()
    await noHorizontalOverflow(page)
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await noHorizontalOverflow(page)
    for (const id of ['#email', '#password']) {
      const field = page.locator(id)
      const metrics = await field.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return { left: bounds.left, right: bounds.right,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize) }
      })
      expect(metrics.left).toBeGreaterThanOrEqual(-1)
      expect(metrics.right).toBeLessThanOrEqual(viewport.width + 1)
      expect(metrics.fontSize, `${id} must not trigger iOS focus zoom`).toBeGreaterThanOrEqual(16)
    }
  }
})

test('Urdu and Sindhi language selection persists and keeps text regions RTL', async ({ page }) => {
  await page.goto('/')
  for (const { label, code } of [
    { label: 'Urdu', code: 'ur' },
    { label: 'Sindhi', code: 'sd' },
  ]) {
    await page.locator(`.welcome-header button[title="${label}"]`).click()
    await expect(page.locator('html')).toHaveAttribute('lang', code)
    await expect(page.locator('.welcome-page')).toHaveAttribute('dir', 'rtl')
    await noHorizontalOverflow(page)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', code)
    await expect(page.locator('.welcome-page')).toHaveAttribute('dir', 'rtl')
  }
})

test('real browser offline and reconnect events show an explicit localized notice', async ({ page, context }) => {
  await page.goto('/')
  await page.locator('.welcome-header button[title="Urdu"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur')
  await context.setOffline(true)
  const notice = page.getByTestId('jas-connection-notice')
  await expect(notice).toBeVisible()
  await expect(notice).toHaveAttribute('dir', 'rtl')
  await expect(notice).toContainText('آپ کا انٹرنیٹ منقطع معلوم ہوتا ہے')
  await context.setOffline(false)
  await expect(notice).toContainText('آپ کے فون پر کنکشن بحال دکھائی دے رہا ہے')
  await notice.getByRole('button', { name: 'کنکشن کا پیغام بند کریں' }).click()
  await expect(notice).toHaveCount(0)
  await noHorizontalOverflow(page)
})

test('unsaved member profile field survives offline/reconnect without any write replay', async ({ page, context, baseURL }) => {
  test.skip(!onlyLocalSynthetic(baseURL), 'Synthetic sessions must never run against production')
  const fixture = await installSyntheticSession(page, { language: 'ur' })
  await page.goto('/profile-update')
  const profession = page.getByLabel('پیشہ')
  await expect(profession).toBeVisible()
  await profession.fill('UX12 Unsaved Profession')
  const writesBefore = fixture.requests.filter((request) => /^(POST|PATCH|PUT|DELETE) /.test(request)).length
  await context.setOffline(true)
  await expect(page.getByTestId('jas-connection-notice')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByTestId('jas-connection-notice')).toBeVisible()
  await expect(profession).toHaveValue('UX12 Unsaved Profession')
  const writesAfter = fixture.requests.filter((request) => /^(POST|PATCH|PUT|DELETE) /.test(request)).length
  expect(writesAfter, 'Connectivity events must never replay pending form writes').toBe(writesBefore)
  await noHorizontalOverflow(page)
})

test('admin drawer has keyboard-close/focus recovery in short Urdu mobile viewport', async ({ page, baseURL }) => {
  test.skip(!onlyLocalSynthetic(baseURL), 'Synthetic sessions must never run against production')
  await page.setViewportSize({ width: 390, height: 520 })
  await installSyntheticSession(page, { role: 'admin', language: 'ur' })
  await page.goto('/admin/programs/education')
  const open = page.locator('.admin-mobile-menu-btn')
  await expect(open).toBeVisible()
  await open.click()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  const dialog = page.getByRole('dialog', { name: 'مینو' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(open).toBeFocused()
  await expect(open).toHaveAttribute('aria-expanded', 'false')
  await noHorizontalOverflow(page)
})
