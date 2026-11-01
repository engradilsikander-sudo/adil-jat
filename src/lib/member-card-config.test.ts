import { describe, expect, it } from 'vitest'
import {
  buildMemberCardIssueLabel,
  buildMemberVerificationUrl,
  DEFAULT_PUBLIC_SITE_ORIGIN,
  MEMBER_CARD_VERSION,
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
    expect(normalizePublicSiteOrigin('https://jasofficial.org///')).toBe(
      'https://jasofficial.org',
    )
    expect(normalizePublicSiteOrigin('')).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
    expect(normalizePublicSiteOrigin(undefined)).toBe(DEFAULT_PUBLIC_SITE_ORIGIN)
  })

  it('encodes member numbers in verification URLs', () => {
    expect(
      buildMemberVerificationUrl('JAS 2026/0001', 'https://jasofficial.org/'),
    ).toBe('https://jasofficial.org/verify/JAS%202026%2F0001')
  })
})
