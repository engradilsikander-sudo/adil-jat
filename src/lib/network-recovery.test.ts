import { expect, it, vi } from 'vitest'
import { isTransportFailure, networkFailureMessage, retryTransportRead } from './network-recovery'

it('recognizes transport failures but not authorization, SQL or validation errors', () => {
  expect(isTransportFailure(new TypeError('Failed to fetch'))).toBe(true)
  expect(isTransportFailure({ status: 0, message: 'Network error' })).toBe(true)
  expect(isTransportFailure({ cause: new Error('Network request failed') })).toBe(true)
  expect(isTransportFailure({ code: '42501', message: 'permission denied' })).toBe(false)
  expect(isTransportFailure({ code: 'PGRST202', message: 'function missing' })).toBe(false)
  expect(isTransportFailure({ status: 401, message: 'unauthorized' })).toBe(false)
  expect(isTransportFailure({ status: 429, message: 'too many requests' })).toBe(false)
  expect(isTransportFailure(new DOMException('Aborted', 'AbortError'))).toBe(false)
})

it('retries a read exactly once after a transport failure when online', async () => {
  const read = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce('ok')
  await expect(retryTransportRead(read, { delayMs: 0, isOnline: () => true })).resolves.toBe('ok')
  expect(read).toHaveBeenCalledTimes(2)
})

it('never retries non-network errors or repeats a read while offline', async () => {
  const denied = vi.fn().mockRejectedValue({ code: '42501', message: 'permission denied' })
  await expect(retryTransportRead(denied, { delayMs: 0, isOnline: () => true })).rejects.toMatchObject({ code: '42501' })
  expect(denied).toHaveBeenCalledTimes(1)
  const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(retryTransportRead(offline, { delayMs: 0, isOnline: () => false })).rejects.toThrow('Failed to fetch')
  expect(offline).toHaveBeenCalledTimes(1)
})

it('stops after the second transport failure instead of looping', async () => {
  const read = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(retryTransportRead(read, { delayMs: 0, isOnline: () => true })).rejects.toThrow('Failed to fetch')
  expect(read).toHaveBeenCalledTimes(2)
})

it('supports cancellation before and between retries', async () => {
  const first = new AbortController()
  first.abort()
  const read = vi.fn()
  await expect(retryTransportRead(read, { signal: first.signal })).rejects.toMatchObject({ name: 'AbortError' })
  expect(read).not.toHaveBeenCalled()

  const second = new AbortController()
  const failed = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  const pending = retryTransportRead(failed, { signal: second.signal, delayMs: 100, isOnline: () => true })
  await new Promise((resolve) => setTimeout(resolve, 0))
  second.abort()
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(failed).toHaveBeenCalledTimes(1)
})

it('provides a localized fallback only for network failures', () => {
  expect(networkFailureMessage(new TypeError('Failed to fetch'), 'Check connection')).toBe('Check connection')
  expect(networkFailureMessage({ message: 'Insufficient privileges' }, 'Check connection')).toBe('Insufficient privileges')
})
