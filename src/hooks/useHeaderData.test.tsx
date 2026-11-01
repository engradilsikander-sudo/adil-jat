// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useHeaderData } from './useHeaderData'
const mock = vi.hoisted(() => ({ profile: vi.fn(), count: vi.fn() }))
vi.mock('../lib/supabase/client', () => ({ supabase: { from: () => {
  const q = { select: () => q, eq: () => q, abortSignal: () => q, maybeSingle: mock.profile, then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => mock.count().then(resolve, reject) }; return q
} } }))
beforeEach(() => {
  mock.profile.mockReset().mockResolvedValue({ data: { full_name: 'Member A', member_no: 'JAS-A', status: 'approved' }, error: null })
  mock.count.mockReset().mockResolvedValue({ count: 3, error: null })
})
afterEach(cleanup)
it('reuses profile on rerenders and refreshes only count after notification events', async () => {
  const { result, rerender } = renderHook(() => useHeaderData('a'))
  await waitFor(() => expect(result.current.profileReady).toBe(true))
  rerender()
  expect(mock.profile).toHaveBeenCalledTimes(1)
  mock.count.mockResolvedValue({ count: 0, error: null })
  act(() => window.dispatchEvent(new Event('jas-notifications-updated')))
  await waitFor(() => expect(result.current.count).toBe(0))
  expect(mock.profile).toHaveBeenCalledTimes(1)
  expect(mock.count).toHaveBeenCalledTimes(2)
})
it('hides the previous account immediately and ignores its late result', async () => {
  let resolve!: (value: unknown) => void
  mock.profile.mockReturnValueOnce(new Promise((done) => { resolve = done }))
  const { result, rerender } = renderHook(({ id }) => useHeaderData(id), { initialProps: { id: 'a' } })
  mock.profile.mockResolvedValue({ data: { full_name: 'Member B', member_no: 'JAS-B', status: 'pending' }, error: null })
  rerender({ id: 'b' })
  expect(result.current.profile).toBeNull()
  await waitFor(() => expect(result.current.profile?.name).toBe('Member B'))
  await act(async () => resolve({ data: { full_name: 'Member A', status: 'approved' }, error: null }))
  expect(result.current.profile?.name).toBe('Member B')
  rerender({ id: '' })
  expect(result.current.profile).toBeNull()
  expect(result.current.count).toBe(0)
})
it('distinguishes lookup failure from a confirmed missing membership and supports retry', async () => {
  mock.profile.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
  const { result } = renderHook(() => useHeaderData('a'))
  await waitFor(() => expect(result.current.profileError).toBe(true))
  expect(result.current.profileReady).toBe(false)
  mock.profile.mockResolvedValue({ data: null, error: null })
  act(() => result.current.retry())
  await waitFor(() => expect(result.current.profileReady).toBe(true))
  expect(result.current.profileError).toBe(false)
  expect(result.current.profile).toBeNull()
})
it('queues a read-event refresh when an older count request is still pending', async () => {
  let resolve!: (value: unknown) => void
  mock.count.mockReturnValueOnce(new Promise((done) => { resolve = done }))
  const { result } = renderHook(() => useHeaderData('a'))
  await waitFor(() => expect(mock.count).toHaveBeenCalledTimes(1))
  mock.count.mockResolvedValue({ count: 0, error: null })
  act(() => window.dispatchEvent(new Event('jas-notifications-updated')))
  await act(async () => resolve({ count: 3, error: null }))
  await waitFor(() => expect(mock.count).toHaveBeenCalledTimes(2))
  expect(result.current.count).toBe(0)
})
