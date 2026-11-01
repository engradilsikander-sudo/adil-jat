// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuthRole } from './useAuthRole'
const mock = vi.hoisted(() => ({ callback: null as null | ((event: string, session: unknown) => void), roles: vi.fn(), session: vi.fn(), signOut: vi.fn() }))
vi.mock('../lib/supabase/client', () => ({ supabase: {
  auth: { getSession: mock.session, signOut: mock.signOut, onAuthStateChange: (callback: typeof mock.callback) => { mock.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } } },
  from: () => { const q = { select: () => q, eq: () => q, in: () => q, limit: mock.roles }; return q },
} }))
beforeEach(() => { mock.session.mockResolvedValue({ data: { session: { user: { id: 'admin-a', email: 'a@example.com' } } }, error: null }); mock.signOut.mockResolvedValue({ error: null }); mock.roles.mockReset() })
afterEach(cleanup)
it('ignores a pending admin result after logout', async () => {
  let resolve!: (value: unknown) => void
  mock.roles.mockReturnValue(new Promise((done) => { resolve = done }))
  const { result } = renderHook(useAuthRole)
  await waitFor(() => expect(result.current.accountUserId).toBe('admin-a'))
  await act(async () => { await result.current.logout() })
  await act(async () => { resolve({ data: [{ role: 'admin' }], error: null }) })
  expect(result.current.isAdmin).toBe(false)
  expect(result.current.isLoggedIn).toBe(false)
  expect(result.current.authLoading).toBe(false)
})
it('does not apply an old role to a new account', async () => {
  let resolve!: (value: unknown) => void
  mock.roles.mockReturnValueOnce(new Promise((done) => { resolve = done })).mockResolvedValue({ data: [], error: null })
  const { result } = renderHook(useAuthRole)
  await waitFor(() => expect(result.current.accountUserId).toBe('admin-a'))
  await act(async () => { mock.callback?.('SIGNED_IN', { user: { id: 'member-b' } }) })
  await waitFor(() => expect(result.current.authLoading).toBe(false))
  await act(async () => { resolve({ data: [{ role: 'admin' }], error: null }) })
  expect(result.current.accountUserId).toBe('member-b')
  expect(result.current.isAdmin).toBe(false)
})
it('ends loading when the role request fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mock.roles.mockRejectedValue(new Error('offline'))
  const { result } = renderHook(useAuthRole)
  await waitFor(() => expect(result.current.authLoading).toBe(false))
  expect(result.current.isAdmin).toBe(false)
})
