import { expect, it } from 'vitest'
import { normalizeVerificationNumber, verificationErrorText } from './validation'
it('normalizes an existing JAS member number without changing its sequence', () => {
  expect(normalizeVerificationNumber(' jas-2026-0001 ')).toBe('JAS-2026-0001')
  expect(normalizeVerificationNumber('JAS-2026-10000')).toBe('JAS-2026-10000')
})
it.each(['', 'JAS-2026-1', 'JAS-2026-0001/../', 'JAS-2026-0001\nEXTRA', 'X'.repeat(1000)])('rejects malformed input: %s', (value) => {
  expect(() => normalizeVerificationNumber(value)).toThrow('VERIFY_INVALID_NUMBER')
})
it('never puts arbitrary backend errors into translated messages', () => {
  for (const language of ['en', 'ur', 'sd'] as const) {
    expect(verificationErrorText(language, 'secret database details')).not.toContain('secret')
    expect(verificationErrorText(language, 'VERIFY_RATE_LIMITED')).not.toBe(verificationErrorText(language, 'unknown'))
  }
})
