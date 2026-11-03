import { describe, expect, it } from 'vitest'
import { mobileUxCopy } from './mobile-ux-copy'

function keys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' ? keys(child, path) : [path]
  })
}

describe('mobile UX localized copy', () => {
  it('keeps English, Urdu, and Sindhi copy structurally aligned', () => {
    expect(keys(mobileUxCopy.ur).sort()).toEqual(keys(mobileUxCopy.en).sort())
    expect(keys(mobileUxCopy.sd).sort()).toEqual(keys(mobileUxCopy.en).sort())
  })

  it('provides localized core notification, preference, and PWA actions', () => {
    expect(mobileUxCopy.ur.notifications.markAllRead).not.toBe(mobileUxCopy.en.notifications.markAllRead)
    expect(mobileUxCopy.sd.preferences.savePreferences).not.toBe(mobileUxCopy.en.preferences.savePreferences)
    expect(mobileUxCopy.ur.preferences.refresh).not.toBe(mobileUxCopy.en.preferences.refresh)
    expect(mobileUxCopy.sd.preferences.refresh).not.toBe(mobileUxCopy.en.preferences.refresh)
    expect(mobileUxCopy.ur.pwa.updateNow).not.toBe(mobileUxCopy.en.pwa.updateNow)
    expect(mobileUxCopy.sd.pwa.enableNotifications).not.toBe(mobileUxCopy.en.pwa.enableNotifications)
  })
})
