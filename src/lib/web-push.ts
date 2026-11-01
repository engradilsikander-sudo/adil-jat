export type NotificationPreferenceRow = {
  user_id: string
  web_push_enabled: boolean
  membership_updates: boolean
  program_updates: boolean
  finance_updates: boolean
  general_updates: boolean
  created_at: string
  updated_at: string
}

export type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  device_label: string | null
  enabled: boolean
  failure_count: number
  last_seen_at: string
  last_success_at: string | null
  last_failure_at: string | null
  disabled_at: string | null
  disabled_reason: string | null
  created_at: string
  updated_at: string
}

export type NotificationPreferenceValues = {
  web_push_enabled: boolean
  membership_updates: boolean
  program_updates: boolean
  finance_updates: boolean
  general_updates: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceValues = {
  web_push_enabled: true,
  membership_updates: true,
  program_updates: true,
  finance_updates: true,
  general_updates: true,
}

export function normalizeNotificationPreferences(
  row?: Partial<NotificationPreferenceRow> | null,
) {
  return {
    web_push_enabled:
      row?.web_push_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.web_push_enabled,
    membership_updates:
      row?.membership_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.membership_updates,
    program_updates:
      row?.program_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.program_updates,
    finance_updates:
      row?.finance_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.finance_updates,
    general_updates:
      row?.general_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.general_updates,
  }
}

export function supportsWebPush() {
  if (typeof window === 'undefined') return false

  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    window.isSecureContext
  )
}

export function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export function getDeviceLabel(userAgent?: string | null) {
  const value = userAgent?.trim() || ''
  if (!value) return 'Unknown browser'

  const browser = /Edg\//.test(value)
    ? 'Microsoft Edge'
    : /OPR\//.test(value)
      ? 'Opera'
      : /CriOS\//.test(value)
        ? 'Chrome on iOS'
        : /Chrome\//.test(value)
          ? 'Google Chrome'
          : /FxiOS\//.test(value)
            ? 'Firefox on iOS'
            : /Firefox\//.test(value)
              ? 'Mozilla Firefox'
              : /Safari\//.test(value)
                ? 'Safari'
                : 'Browser'

  const platform = /Android/i.test(value)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(value)
      ? 'iPhone / iPad'
      : /Windows/i.test(value)
        ? 'Windows'
        : /Macintosh|Mac OS X/i.test(value)
          ? 'macOS'
          : /Linux/i.test(value)
            ? 'Linux'
            : ''

  return platform ? `${browser} · ${platform}` : browser
}

export function maskPushEndpoint(endpoint?: string | null) {
  const value = endpoint?.trim() || ''
  if (!value) return 'Endpoint unavailable'

  try {
    const url = new URL(value)
    const tail = url.pathname.split('/').filter(Boolean).at(-1) || ''
    const maskedTail = tail.length > 10 ? `${tail.slice(0, 5)}…${tail.slice(-4)}` : '••••••'
    return `${url.hostname}/${maskedTail}`
  } catch {
    return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : '••••••'
  }
}

export function getWebPushRetryDelayMinutes(attempt: number) {
  const normalizedAttempt = Math.max(1, Math.floor(attempt || 1))
  return Math.min(60, 2 ** Math.max(0, normalizedAttempt - 1))
}

export function isRetryableWebPushStatus(status?: number | null) {
  if (status == null || status === 0) return true
  return status === 408 || status === 425 || status === 429 || status >= 500
}

export function shouldDisablePushSubscription(status?: number | null) {
  return status === 404 || status === 410
}

export function getPushDeliveryStatusLabel(status?: string | null) {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'sending':
      return 'Sending'
    case 'sent':
      return 'Sent'
    case 'failed':
      return 'Retry Pending'
    case 'skipped':
      return 'Skipped'
    case 'dead':
      return 'Permanently Failed'
    default:
      return 'Unknown'
  }
}

export function cleanPushActionUrl(value?: string | null) {
  const raw = value?.trim() || '/notifications'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/notifications'
  if (raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) {
    return '/notifications'
  }
  return raw.slice(0, 300)
}
