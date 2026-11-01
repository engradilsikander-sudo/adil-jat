import { expect, it } from 'vitest'
import { verificationClientKey } from './budget'
it('ignores spoofable IP headers outside Vercel', () => {
  expect(verificationClientKey(false, '192.0.2.1', 'secret', '2026-09-09')).toBe('shared-nonvercel')
  expect(verificationClientKey(true, '192.0.2.1, 192.0.2.2', 'secret', '2026-09-09')).toBe('shared-nonvercel')
})
it('hashes client IPs consistently and rotates keys daily', () => {
  const key = verificationClientKey(true, '192.0.2.1', 'secret', '2026-09-09')
  expect(key).toMatch(/^[a-f0-9]{64}$/)
  expect(key).toBe(verificationClientKey(true, '192.0.2.1', 'secret', '2026-09-09'))
  expect(key).not.toBe(verificationClientKey(true, '192.0.2.1', 'secret', '2026-09-10'))
  expect(key).not.toBe(verificationClientKey(true, '192.0.2.2', 'secret', '2026-09-09'))
})
