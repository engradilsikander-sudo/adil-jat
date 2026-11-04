import { expect, test, type Page } from '@playwright/test'
import { installSyntheticSession, verifySyntheticSession } from './fixtures/mobile-session'

// These test UI behavior only: no real auth, RLS, database writes, or Storage validation.
// Keep service workers blocked so a production preferences bootstrap hang remains
// visible for UX.4-B; do not stub serviceWorker.ready or weaken the UI assertion.
test.use({ serviceWorkers: 'block' })
test.afterEach(async ({ page }, testInfo) => { await verifySyntheticSession(page, testInfo) })

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    .toBe(true)
}

async function expectControlsInsideViewport(page: Page, selector: string) {
  const result = await page.locator(selector).evaluate((container) => {
    const viewportWidth = window.innerWidth
    const controls = [...container.querySelectorAll<HTMLElement>('input,select,button,a')].filter(
      (control) => control.getClientRects().length > 0,
    )
    return controls
      .map((control) => {
        const rect = control.getBoundingClientRect()
        return { tag: control.tagName, left: rect.left, right: rect.right, width: rect.width }
      })
      .filter((rect) => rect.left < -1 || rect.right > viewportWidth + 1 || rect.width < 44)
  })
  expect(result).toEqual([])
}

test('registration moves focus to the next step on a Pixel-class viewport', async ({ page, baseURL }) => {
  test.skip(!['127.0.0.1', 'localhost'].includes(new URL(baseURL!).hostname), 'Synthetic authentication fixtures are local-only')
  await installSyntheticSession(page, { memberRecord: false })

  await page.goto('/register')
  await expect(page.locator('#fullName')).toBeVisible()
  await page.locator('#fullName').fill('Mobile Registration')
  await page.locator('#fatherName').fill('Fixture Parent')
  await page.locator('#cnic').fill('44104-1234567-1')
  await page.locator('#mobile').fill('03001234567')
  await page.getByRole('button', { name: /Next Step/i }).click()

  await expect(page.locator('.reg-section-title')).toBeFocused()
  await expect(page.locator('#district')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('member dashboard navigation reaches Notifications and the read mutation stays ID-scoped', async ({ page, baseURL }) => {
  test.skip(!['127.0.0.1', 'localhost'].includes(new URL(baseURL!).hostname), 'Synthetic authentication fixtures are local-only')
  const fixture = await installSyntheticSession(page)
  const requestLog = fixture.requests

  await page.goto('/dashboard')
  await expect(page.locator('.member-navigation')).toBeVisible()
  await expect(page.locator('.member-navigation a')).toHaveCount(4)
  await expectControlsInsideViewport(page, '.member-navigation')
  await expectNoHorizontalOverflow(page)

  await page.locator('.member-navigation a[href="/notifications"]').click()
  await expect(page).toHaveURL(/\/notifications$/)
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await expect.poll(() => requestLog.some((entry) => entry.startsWith('PATCH ') && entry.includes('/notifications?'))).toBe(true)
  const readMutation = requestLog.find((entry) => entry.startsWith('PATCH ') && entry.includes('/notifications?')) ?? ''
  expect(decodeURIComponent(readMutation)).toContain('id=in.(notification-mobile-1,notification-mobile-2)')
})

test('Sindhi notification preferences remain RTL and protect a dirty draft on refresh', async ({ page, baseURL }) => {
  test.skip(!['127.0.0.1', 'localhost'].includes(new URL(baseURL!).hostname), 'Synthetic authentication fixtures are local-only')
  const fixture = await installSyntheticSession(page, { language: 'sd' })

  await page.goto('/notification-preferences')
  const main = page.locator('main')
  await expect(main).toHaveAttribute('dir', 'rtl')
  const membershipToggle = page.getByRole('checkbox', { name: /ميمبرشپ اپڊيٽس/i })
  await expect(membershipToggle).toBeChecked()
  await membershipToggle.click()
  await expect(membershipToggle).not.toBeChecked()

  let dialogSeen = false
  page.once('dialog', async (dialog) => {
    dialogSeen = true
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'ريفريش' }).click()
  await expect.poll(() => dialogSeen).toBe(true)
  await expect(membershipToggle).not.toBeChecked()
  await page.getByRole('button', { name: 'ترجيحات محفوظ ڪريو' }).click()
  await expect.poll(() => fixture.requests.some(entry => entry.startsWith('POST /rest/v1/notification_preferences?'))).toBe(true)
  await expect(page.getByRole('button', { name: 'ترجيحات محفوظ ڪريو' })).toBeEnabled()
  await page.getByRole('button', { name: 'ريفريش' }).click()
  await expect(membershipToggle).not.toBeChecked()
  await expectNoHorizontalOverflow(page)
})

test('Urdu profile editing remains usable in a short mobile viewport and guards unsaved changes', async ({ page, baseURL }) => {
  test.skip(!['127.0.0.1', 'localhost'].includes(new URL(baseURL!).hostname), 'Synthetic authentication fixtures are local-only')
  await page.setViewportSize({ width: 390, height: 520 })
  await installSyntheticSession(page, { language: 'ur' })

  await page.goto('/profile-update')
  const heading = page.getByRole('heading', { name: 'پروفائل اپڈیٹ کی درخواست' })
  await expect(heading).toBeVisible()
  await expect(heading.locator('xpath=ancestor::main')).toHaveAttribute('dir', 'rtl')

  const teacher = page.getByLabel('پیشہ')
  await expect(teacher).toBeVisible()
  await teacher.fill('Principal')

  const fontSize = await teacher.evaluate((input: HTMLInputElement) => Number.parseFloat(getComputedStyle(input).fontSize))
  expect(fontSize).toBeGreaterThanOrEqual(16)

  let leaveDialogSeen = false
  page.once('dialog', async (dialog) => {
    leaveDialogSeen = true
    await dialog.dismiss()
  })
  await page.locator('.jas-mobile-toggle').click()
  const mobileDashboard = page.locator('#jas-nav-drawer a[href="/dashboard"]')
  await expect(mobileDashboard).toBeVisible()
  await mobileDashboard.click()
  await expect.poll(() => leaveDialogSeen).toBe(true)
  await expect(page).toHaveURL(/\/profile-update$/)
  await expect(teacher).toHaveValue('Principal')
  await expectNoHorizontalOverflow(page)
})

test('admin program review controls fit and remain usable under the real mobile project', async ({ page, baseURL }) => {
  test.skip(!['127.0.0.1', 'localhost'].includes(new URL(baseURL!).hostname), 'Synthetic authentication fixtures are local-only')
  await installSyntheticSession(page, { role: 'admin', language: 'ur' })

  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/admin/programs/education')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur')
  await expect(page.locator('.admin-filter-grid')).toBeVisible()
  await expectControlsInsideViewport(page, '.admin-filter-grid')
  await expectNoHorizontalOverflow(page)

  const menu = page.locator('.admin-mobile-menu-btn')
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  const dialog = page.getByRole('dialog', { name: 'مینو' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'ایڈمن مینو بند کریں' })).toBeFocused()
  // Urdu/RTL menu must dock at the right-hand edge without page-level overflow.
  await expect.poll(() => dialog.locator('.admin-mobile-drawer-panel').evaluate(
    panel => Math.abs(panel.getBoundingClientRect().right - window.innerWidth) <= 2,
  )).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')

  await menu.click()
  await expect(dialog).toBeVisible()
  await dialog.locator('a[href="/admin/programs/education"]').click()
  await expect(dialog).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  expect(errors).toEqual([])
})
