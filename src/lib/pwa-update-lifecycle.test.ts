import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'
it('waits for explicit consent before activating a downloaded worker', async () => {
  const events: Record<string, (event: { data?: unknown; waitUntil: (promise: Promise<unknown>) => void }) => void> = {}
  const skipWaiting = vi.fn(async () => {})
  const cache = { addAll: vi.fn(async () => {}) }
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { addEventListener: (name: string, fn: typeof events[string]) => { events[name] = fn }, skipWaiting },
    caches: { open: async () => cache, keys: async () => [] },
    Request: class { constructor(public url: string) {} },
  })
  let pending!: Promise<unknown>
  const waitUntil = (value: Promise<unknown>) => { pending = value }
  events.install({ waitUntil }); await pending
  expect(cache.addAll).toHaveBeenCalled()
  expect(skipWaiting).not.toHaveBeenCalled()
  events.message({ data: { type: 'SKIP_WAITING' }, waitUntil }); await pending
  expect(skipWaiting).toHaveBeenCalledOnce()
})
