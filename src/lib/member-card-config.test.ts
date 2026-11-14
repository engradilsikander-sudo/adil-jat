import { describe, expect, it } from 'vitest'
import {
  buildMemberCardIssueLabel,
  buildMemberVerificationUrl,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  MEMBER_CARD_VERSION,
  PUBLIC_SITE_ORIGIN,
  normalizePublicSiteOrigin,
} from './member-card-config'

describe('member card config', () => {
  it('uses the shared card version', () => {
    expect(MEMBER_CARD_VERSION).toBe('v1')
    expect(buildMemberCardIssueLabel('JAS-2026-0001')).toBe(
      'JAS-2026-0001 / v1',
    )
    expect(buildMemberCardIssueLabel(null)).toBe('Pending / v1')
  })

  it('normalizes configured origins', () => {
    expect(normalizePublicSiteOrigin('https://jwas.app///')).toBe(
      'https://jwas.app',
    )
    expect(DEFAULT_PUBLIC_SITE_ORIGIN).toBe('https://jwas.app')
    expect(normalizePublicSiteOrigin('')).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
    expect(normalizePublicSiteOrigin(undefined)).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
  })

  it('uses the official JWAS fallback without renaming historical JAS IDs', () => {
    // Explicit fallback is independent of local VITE_* overrides (which may be localhost).
    expect(buildMemberVerificationUrl('JAS-2026-0301', DEFAULT_PUBLIC_SITE_ORIGIN)).toBe(
      'https://jwas.app/verify/JAS-2026-0301',
    )
  })

  it('honors the configured origin when building a verification URL', () => {
    expect(buildMemberVerificationUrl('JAS-2026-0301')).toBe(
      `${PUBLIC_SITE_ORIGIN}/verify/JAS-2026-0301`,
    )
    expect(buildMemberVerificationUrl('JAS-2026-0301', 'http://localhost:3000/')).toBe(
      'http://localhost:3000/verify/JAS-2026-0301',
    )
  })

  it('encodes member numbers in verification URLs', () => {
    expect(
      buildMemberVerificationUrl('JAS 2026/0001', 'https://jwas.app/'),
    ).toBe('https://jwas.app/verify/JAS%202026%2F0001')
  })
})
