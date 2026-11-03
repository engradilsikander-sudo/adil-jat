// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PwaBootstrap } from './PwaBootstrap'
import { I18nProvider } from '../../lib/i18n'
vi.mock('../../lib/supabase/client', () => ({ supabase: { auth: {
  getUser: async () => ({ data: { user: null } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
} } }))
vi.mock('../../lib/web-push', () => ({ getDeviceLabel: vi.fn(), normalizeNotificationPreferences: vi.fn(), supportsWebPush: () => false, urlBase64ToUint8Array: vi.fn() }))
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllEnvs() })
it('offers Later and requires confirmation before requesting activation', async () => {
  vi.stubEnv('DEV', false)
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) })
  Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
  const postMessage = vi.fn()
  const registration = Object.assign(new EventTarget(), { waiting: { postMessage }, installing: null, update: vi.fn(async () => {}) })
  const serviceWorker = Object.assign(new EventTarget(), { controller: {}, register: vi.fn(async () => registration) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<I18nProvider><PwaBootstrap /></I18nProvider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Update now' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(postMessage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Later' }))
  expect(screen.queryByRole('button', { name: 'Update now' })).toBeNull()
  cleanup()
  render(<I18nProvider><PwaBootstrap /></I18nProvider>)
  confirm.mockReturnValue(true)
  fireEvent.click(await screen.findByRole('button', { name: 'Update now' }))
  expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
})


it('localizes the update prompt in Urdu, exposes RTL, and caps short-screen height', async () => {
  vi.stubEnv('DEV', false)
  localStorage.setItem('jas_language', 'ur')
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) })
  Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
  const registration = Object.assign(new EventTarget(), { waiting: { postMessage: vi.fn() }, installing: null, update: vi.fn(async () => {}) })
  const serviceWorker = Object.assign(new EventTarget(), { controller: {}, register: vi.fn(async () => registration) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })

  render(<I18nProvider><PwaBootstrap /></I18nProvider>)
  const updateButton = await screen.findByRole('button', { name: 'ابھی اپڈیٹ کریں' })
  expect(updateButton.closest('.pwa-toast-stack')?.getAttribute('dir')).toBe('rtl')
  const styleText = document.querySelector('.pwa-toast-stack style')?.textContent ?? ''
  expect(styleText).toContain('max-height: calc(100dvh')
  expect(styleText).toContain('overflow-y: auto')
})
