import { describe, expect, it } from 'vitest'
import {
  adminNavigationGroups,
  getVisibleAdminNavigationGroups,
  isActiveAdminNavigationItem,
} from './admin-navigation'

const protectedRoutes = [
  '/admin/finance',
  '/admin/roles',
  '/admin/area-permissions',
  '/admin/audit-logs',
]

function entries(superAdminAllowed: boolean) {
  return getVisibleAdminNavigationGroups(superAdminAllowed).flatMap((group) => group.items)
}

describe('UX.13 role-aware Admin sidebar policy', () => {
  it('fails closed for ordinary Admin and during an unresolved Super Admin check', () => {
    const items = entries(false)
    const routes = items.map((item) => item.to)
    for (const route of protectedRoutes) expect(routes).not.toContain(route)
    expect(routes).toContain('/admin/reports')
    expect(routes).toContain('/admin/cms')
    expect(routes).toContain('/admin/programs/education')
    expect(items.some((item) => item.label === 'Donations' && item.disabled)).toBe(true)
  })

  it('restores exactly the configured links for a database-verified Super Admin', () => {
    const actual = entries(true)
    const original = adminNavigationGroups.flatMap((group) => group.items)
    expect(actual).toEqual(original)
    for (const route of protectedRoutes) expect(actual.some((item) => item.to === route)).toBe(true)
  })

  it('has exactly one current-page item on /admin, not four duplicate highlights', () => {
    for (const pathname of ['/admin', '/admin/']) {
      const active = entries(true).filter((item) => isActiveAdminNavigationItem(pathname, item))
      expect(active.map((item) => item.label)).toEqual(['Dashboard'])
    }
    expect(entries(false).filter((item) => isActiveAdminNavigationItem('/admin', item))).toHaveLength(1)
  })

  it('matches a nested route once and never marks a disabled item current', () => {
    for (const [path, name] of [
      ['/admin/finance', 'Finance'],
      ['/admin/roles/', 'Roles'],
      ['/admin/audit-logs', 'Audit Logs'],
      ['/admin/programs/education/application', 'Education'],
      ['/admin/profile-update-requests', 'Profile Update Requests'],
      ['/admin/reports', 'Reports'],
    ]) {
      const active = entries(true).filter((item) => isActiveAdminNavigationItem(path, item))
      expect(active.map((item) => item.label)).toEqual([name])
    }
    expect(entries(true).filter((item) => isActiveAdminNavigationItem('/not-admin', item))).toHaveLength(0)
    expect(entries(true).filter((item) => item.disabled && isActiveAdminNavigationItem('/admin', item))).toHaveLength(0)
  })

  it('does not mutate the canonical navigation configuration', () => {
    getVisibleAdminNavigationGroups(false)
    expect(adminNavigationGroups.find((group) => group.title === 'Organization')?.items.map((item) => item.label))
      .toContain('Roles')
  })
})
