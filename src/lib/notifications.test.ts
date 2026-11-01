import { describe, expect, it } from 'vitest'
import {
  formatNotificationDate,
  getNotificationCategoryLabel,
  getNotificationTone,
  getProgramApplyPath,
  getProgramLabel,
  getProgramPath,
  getProgramStatusClass,
  getProgramStatusLabel,
  getSafeNotificationActionUrl,
} from './notifications'

describe('notification helpers', () => {
  it('maps programs to labels and routes', () => {
    expect(getProgramLabel('education')).toBe('Education')
    expect(getProgramLabel('special_support')).toBe('Special Support')
    expect(getProgramPath('health')).toBe('/programs/health')
    expect(getProgramApplyPath('health')).toBe('/programs/health/apply')
    expect(getProgramApplyPath('unknown')).toBe('/dashboard')
  })

  it('maps statuses and visual tones', () => {
    expect(getProgramStatusLabel('under_review')).toBe('Under Review')
    expect(getProgramStatusLabel('paid_completed')).toBe('Paid / Completed')
    expect(getProgramStatusClass('approved')).toContain('emerald')
    expect(getProgramStatusClass('rejected')).toContain('red')
    expect(getProgramStatusClass('need_more_info')).toContain('orange')
  })

  it('maps notification categories and tones', () => {
    expect(getNotificationCategoryLabel('membership')).toBe('Membership')
    expect(getNotificationCategoryLabel('unknown')).toBe('General')
    expect(getNotificationTone('finance')).toContain('emerald')
    expect(getNotificationTone('health')).toContain('red')
  })

  it('formats notification dates safely', () => {
    expect(formatNotificationDate('2026-07-10T10:00:00Z')).toContain('2026')
    expect(formatNotificationDate('invalid')).toBe('N/A')
    expect(formatNotificationDate(null)).toBe('N/A')
  })

  it.each([
    ['/dashboard', '/dashboard'],
    ['/verify/JAS-2026-0001?source=notification#card', '/verify/JAS-2026-0001?source=notification#card'],
    ['https://jasofficial.org/dashboard', '/dashboard'],
    [' https://jasofficial.org/programs/education ', '/programs/education'],
  ])('allows safe same-origin action URL %s', (input, expected) => {
    expect(getSafeNotificationActionUrl(input)).toBe(expected)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,bad',
    '//evil.example/path',
    'https://evil.example/path',
    'https:\\evil.example\\path',
    '/dashboard\njavascript:alert(1)',
  ])('blocks unsafe action URL %s', (input) => {
    expect(getSafeNotificationActionUrl(input)).toBeNull()
  })

  it('supports an explicitly configured local origin', () => {
    expect(
      getSafeNotificationActionUrl(
        'http://localhost:3000/dashboard',
        'http://localhost:3000',
      ),
    ).toBe('/dashboard')
    expect(
      getSafeNotificationActionUrl(
        'https://jasofficial.org/dashboard',
        'http://localhost:3000',
      ),
    ).toBeNull()
  })
})
