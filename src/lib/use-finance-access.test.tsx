// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), changed: () => {}, unsubscribe: vi.fn() }))
vi.mock('./supabase/client', () => ({ supabase: {
  auth: { getUser: () => state.getUser(), onAuthStateChange: (callback: () => void) => {
    state.changed = callback
    return { data: { subscription: { unsubscribe: state.unsubscribe } } }
  } }, rpc: () => state.rpc(),
} }))
import { useFinanceAccess } from './use-finance-access'
beforeEach(() => {
  state.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'super' } }, error: null })
  state.rpc.mockReset().mockResolvedValue({ data: true, error: null })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

it('starts closed and accepts only a successful true database authorization result', async () => {
  state.rpc.mockResolvedValue({ data: false, error: null })
  const { result } = renderHook(useFinanceAccess)
  expect(result.current.allowed).toBe(false)
  expect(result.current.checking).toBe(true)
  await waitFor(() => expect(result.current.checking).toBe(false))
  expect(result.current.allowed).toBe(false)
})

it('clears immediately on account change and ignores an older in-flight authorization result', async () => {
  const { result } = renderHook(useFinanceAccess)
  await waitFor(() => expect(result.current.allowed).toBe(true))
  let resolve!: (value: unknown) => void
  state.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r }))
  act(() => window.dispatchEvent(new Event('focus')))
  expect(result.current.allowed).toBe(false)
  await waitFor(() => expect(resolve).toBeDefined())
  state.getUser.mockResolvedValue({ data: { user: { id: 'ordinary' } }, error: null })
  state.rpc.mockResolvedValue({ data: false, error: null })
  act(() => state.changed())
  await waitFor(() => expect(result.current.userId).toBe('ordinary'))
  await act(async () => resolve({ data: true, error: null }))
  expect(result.current.allowed).toBe(false)
})

it('removes access on role revocation without requiring a new JWT', async () => {
  vi.useFakeTimers()
  const { result } = renderHook(useFinanceAccess)
  await act(async () => {})
  expect(result.current.allowed).toBe(true)
  state.rpc.mockResolvedValue({ data: false, error: null })
  await act(async () => vi.advanceTimersByTimeAsync(5000))
  expect(result.current.allowed).toBe(false)
})

it('fails closed on expired sessions and permission-check failures', async () => {
  const { result } = renderHook(useFinanceAccess)
  await waitFor(() => expect(result.current.allowed).toBe(true))
  state.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Expired') })
  act(() => state.changed())
  expect(result.current.allowed).toBe(false)
  await waitFor(() => expect(result.current.checking).toBe(false))
  expect(result.current.userId).toBeNull()
  state.getUser.mockRejectedValue(new Error('Offline'))
  act(() => state.changed())
  await waitFor(() => expect(result.current.checking).toBe(false))
  expect(result.current.allowed).toBe(false)
})
