import { DEFAULT_PUBLIC_SITE_ORIGIN, normalizePublicSiteOrigin } from './member-card-config'

export type NotificationCategory =
  | 'general'
  | 'membership'
  | 'education'
  | 'health'
  | 'welfare'
  | 'employment'
  | 'donation'
  | 'finance'

export type UserNotification = {
  id: string
  user_id: string
  title: string
  message: string
  category: NotificationCategory | string
  related_type: string | null
  related_id: string | null
  action_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export type DashboardProgramKey =
  | 'education'
  | 'health'
  | 'welfare'
  | 'employment'

export type DashboardProgramStatus =
  | 'submitted'
  | 'under_review'
  | 'need_more_info'
  | 'approved'
  | 'rejected'
  | 'paid_completed'
  | 'completed'
  | string

export function getProgramLabel(programKey?: string | null) {
  switch (programKey) {
    case 'education':
      return 'Education'
    case 'health':
      return 'Health'
    case 'welfare':
      return 'Welfare'
    case 'employment':
      return 'Employment'
    default:
      return titleCase(programKey || 'Program')
  }
}

export function getProgramSingularLabel(programKey?: string | null) {
  switch (programKey) {
    case 'education':
      return 'Education Application'
    case 'health':
      return 'Health Case'
    case 'welfare':
      return 'Welfare Case'
    case 'employment':
      return 'Employment Profile'
    default:
      return `${getProgramLabel(programKey)} Application`
  }
}

export function getProgramPath(programKey?: string | null) {
  switch (programKey) {
    case 'education':
      return '/programs/education'
    case 'health':
      return '/programs/health'
    case 'welfare':
      return '/programs/welfare'
    case 'employment':
      return '/programs/employment'
    default:
      return '/dashboard'
  }
}

export function getProgramApplyPath(programKey?: string | null) {
  const path = getProgramPath(programKey)
  return path === '/dashboard' ? path : `${path}/apply`
}

export function getProgramStatusLabel(status?: DashboardProgramStatus | null) {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'under_review':
      return 'Under Review'
    case 'need_more_info':
      return 'Need More Info'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'paid_completed':
      return 'Paid / Completed'
    case 'completed':
      return 'Completed'
    default:
      return titleCase(status || 'Pending')
  }
}

export function getProgramStatusClass(status?: DashboardProgramStatus | null) {
  switch (status) {
    case 'approved':
    case 'completed':
    case 'paid_completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'need_more_info':
      return 'border-orange-200 bg-orange-50 text-orange-800'
    case 'under_review':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800'
  }
}

export function getNotificationCategoryLabel(category?: string | null) {
  switch (category) {
    case 'education':
      return 'Education'
    case 'health':
      return 'Health'
    case 'welfare':
      return 'Welfare'
    case 'employment':
      return 'Employment'
    case 'donation':
      return 'Donation'
    case 'membership':
      return 'Membership'
    case 'finance':
      return 'Finance'
    default:
      return 'General'
  }
}

export function getNotificationTone(category?: string | null) {
  switch (category) {
    case 'education':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'health':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'welfare':
      return 'border-orange-200 bg-orange-50 text-orange-800'
    case 'employment':
      return 'border-blue-200 bg-blue-50 text-blue-800'
    case 'donation':
    case 'finance':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

export function formatNotificationDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getSafeNotificationActionUrl(
  value: string | null | undefined,
  allowedOrigin = DEFAULT_PUBLIC_SITE_ORIGIN,
) {
  const raw = value?.trim()
  if (!raw || raw.includes('\\') || /[\u0000-\u001f\u007f]/.test(raw)) return null
  if (raw.startsWith('//')) return null

  try {
    const normalizedOrigin = normalizePublicSiteOrigin(allowedOrigin)
    const allowed = new URL(normalizedOrigin)
    const parsed = new URL(raw, `${allowed.origin}/`)

    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.origin !== allowed.origin) return null

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}
