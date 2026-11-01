import { describe, expect, it } from 'vitest'
import {
  cleanPushActionUrl,
  getDeviceLabel,
  getPushDeliveryStatusLabel,
  getWebPushRetryDelayMinutes,
  isRetryableWebPushStatus,
  maskPushEndpoint,
  normalizeNotificationPreferences,
  shouldDisablePushSubscription,
} from './web-push'

describe('web push helpers', () => {
  it('applies safe default preferences when no row exists', () => {
    expect(normalizeNotificationPreferences(null)).toEqual({
      web_push_enabled: true,
      membership_updates: true,
      program_updates: true,
      finance_updates: true,
      general_updates: true,
    })
  })

  it('preserves explicit preference choices', () => {
    expect(
      normalizeNotificationPreferences({
        web_push_enabled: false,
        membership_updates: false,
      }),
    ).toMatchObject({
      web_push_enabled: false,
      membership_updates: false,
      program_updates: true,
    })
  })

  it('uses bounded exponential retry delays', () => {
    expect([1, 2, 3, 4, 7].map(getWebPushRetryDelayMinutes)).toEqual([
      1, 2, 4, 8, 60,
    ])
  })

  it('classifies transient and expired subscription statuses', () => {
    expect(isRetryableWebPushStatus(429)).toBe(true)
    expect(isRetryableWebPushStatus(503)).toBe(true)
    expect(isRetryableWebPushStatus(400)).toBe(false)
    expect(shouldDisablePushSubscription(404)).toBe(true)
    expect(shouldDisablePushSubscription(410)).toBe(true)
    expect(shouldDisablePushSubscription(500)).toBe(false)
  })

  it('keeps action URLs inside the app', () => {
    expect(cleanPushActionUrl('/notifications?tab=membership')).toBe(
      '/notifications?tab=membership',
    )
    expect(cleanPushActionUrl('https://evil.example')).toBe('/notifications')
    expect(cleanPushActionUrl('//evil.example')).toBe('/notifications')
    expect(cleanPushActionUrl('/safe\\evil')).toBe('/notifications')
  })

  it('creates readable device labels and masked endpoints', () => {
    expect(
      getDeviceLabel(
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36',
      ),
    ).toBe('Google Chrome · Windows')

    const masked = maskPushEndpoint(
      'https://fcm.googleapis.com/fcm/send/abcdefghijklmnopqrstuvwxyz',
    )
    expect(masked).toContain('fcm.googleapis.com')
    expect(masked).not.toContain('abcdefghijklmnopqrstuvwxyz')
  })

  it('formats delivery statuses', () => {
    expect(getPushDeliveryStatusLabel('failed')).toBe('Retry Pending')
    expect(getPushDeliveryStatusLabel('dead')).toBe('Permanently Failed')
  })
})
