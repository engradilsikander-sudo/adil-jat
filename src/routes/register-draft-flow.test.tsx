// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ComponentType } from 'react'
const state = vi.hoisted(() => ({ blocker: null as null | { enableBeforeUnload: boolean; shouldBlockFn: () => boolean } }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  useBlocker: (options: typeof state.blocker) => { state.blocker = options },
}))
vi.mock('../lib/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'draft-user' } }, error: null }) },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: null }) }; return q },
} }))
import { Route } from './register'
import { I18nProvider } from '../lib/i18n'
import { registerDraftKey } from '../lib/register.validation'
afterEach(cleanup)
it('saves only after opt-in and turns off auto-save when the draft is cleared', async () => {
  localStorage.clear()
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)
  const input = await screen.findByPlaceholderText('Enter full name')
  fireEvent.change(input, { target: { value: 'Member Draft' } })
  expect(localStorage.getItem(registerDraftKey('draft-user'))).toBeNull()
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  expect(state.blocker?.shouldBlockFn()).toBe(true)
  const optIn = screen.getByRole('checkbox', { name: 'Automatically save my draft on this device' })
  fireEvent.click(optIn)
  await waitFor(() => expect(localStorage.getItem(registerDraftKey('draft-user'))).toContain('Member Draft'), { timeout: 2500 })
  expect(state.blocker?.enableBeforeUnload).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /Clear draft/i }))
  expect(localStorage.getItem(registerDraftKey('draft-user'))).toBeNull()
  expect((optIn as HTMLInputElement).checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
})
