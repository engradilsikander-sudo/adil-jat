// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PwaBootstrap } from './PwaBootstrap'
vi.mock('../../lib/supabase/client', () => ({ supabase: { auth: {
  getUser: async () => ({ data: { user: null } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
} } }))
vi.mock('../../lib/web-push', () => ({ getDeviceLabel: vi.fn(), normalizeNotificationPreferences: vi.fn(), supportsWebPush: () => false, urlBase64ToUint8Array: vi.fn() }))
afterEach(() => { cleanup(); vi.unstubAllEnvs() })
it('offers Later and requires confirmation before requesting activation', async () => {
  vi.stubEnv('DEV', false)
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) })
  Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
  const postMessage = vi.fn()
  const registration = Object.assign(new EventTarget(), { waiting: { postMessage }, installing: null, update: vi.fn(async () => {}) })
  const serviceWorker = Object.assign(new EventTarget(), { controller: {}, register: vi.fn(async () => registration) })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<PwaBootstrap />)
  fireEvent.click(await screen.findByRole('button', { name: 'Update now' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(postMessage).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Later' }))
  expect(screen.queryByRole('button', { name: 'Update now' })).toBeNull()
  cleanup()
  render(<PwaBootstrap />)
  confirm.mockReturnValue(true)
  fireEvent.click(await screen.findByRole('button', { name: 'Update now' }))
  expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
})
