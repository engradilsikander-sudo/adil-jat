import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase/client', () => ({
  supabase: {},
}))

import {
  canAccessArea,
  describeAreaPermission,
  filterRowsByAreaAccess,
  getAreaAccessBadgeTone,
  getAreaAccessSummaryText,
  getPermissionActionText,
  hasGlobalAdminRole,
  hasModuleAdminRole,
  type AdminAreaAccessContext,
  type AdminAreaPermission,
} from './area-permissions'

function permission(overrides: Partial<AdminAreaPermission> = {}): AdminAreaPermission {
  return {
    id: 'permission-1',
    user_id: 'user-1',
    module_key: 'membership',
    scope: 'taluka',
    district: 'Umerkot',
    taluka: 'Kunri',
    can_view: true,
    can_review: true,
    can_approve: false,
    is_active: true,
    notes: null,
    created_by: null,
    updated_by: null,
    created_at: '2026-07-10T00:00:00Z',
    updated_at: '2026-07-10T00:00:00Z',
    ...overrides,
  }
}

function access(overrides: Partial<AdminAreaAccessContext> = {}): AdminAreaAccessContext {
  return {
    ok: true,
    message: '',
    userId: 'user-1',
    moduleKey: 'membership',
    action: 'view',
    roles: ['membership_admin'],
    permissions: [permission()],
    isGlobalAdmin: false,
    isRestricted: true,
    summary: 'Membership area access active: Kunri, Umerkot',
    ...overrides,
  }
}

describe('area permissions', () => {
  it('recognizes global and module admin roles', () => {
    expect(hasGlobalAdminRole(['super_admin'])).toBe(true)
    expect(hasGlobalAdminRole(['membership_admin'])).toBe(false)
    expect(hasModuleAdminRole(['membership_admin'], 'membership')).toBe(true)
    expect(hasModuleAdminRole(['education_admin'], 'membership')).toBe(false)
  })

  it('describes all, district and taluka scopes', () => {
    expect(describeAreaPermission(permission({ scope: 'all' }))).toBe('All Sindh')
    expect(describeAreaPermission(permission({ scope: 'district' }))).toBe(
      'Umerkot',
    )
    expect(describeAreaPermission(permission())).toBe('Kunri, Umerkot')
  })

  it('builds readable action labels', () => {
    expect(getPermissionActionText(permission())).toBe('View / Review')
    expect(
      getPermissionActionText(
        permission({ can_view: false, can_review: false, can_approve: false }),
      ),
    ).toBe('No actions')
  })

  it('matches module, action and area case-insensitively', () => {
    const permissions = [permission()]
    expect(canAccessArea(permissions, 'membership', ' umerkot ', 'KUNRI')).toBe(
      true,
    )
    expect(canAccessArea(permissions, 'membership', 'Umerkot', 'Pithoro')).toBe(
      false,
    )
    expect(canAccessArea(permissions, 'membership', 'Umerkot', 'Kunri', 'approve')).toBe(
      false,
    )
    expect(canAccessArea(permissions, 'education', 'Umerkot', 'Kunri')).toBe(false)
  })

  it('honors all-module and district permissions', () => {
    expect(
      canAccessArea(
        [permission({ module_key: 'all', scope: 'district', taluka: null })],
        'health',
        'Umerkot',
        'Samaro',
      ),
    ).toBe(true)
    expect(
      canAccessArea([permission({ scope: 'all' })], 'membership', 'Karachi East', null),
    ).toBe(true)
  })

  it('ignores inactive permissions', () => {
    expect(
      canAccessArea([permission({ is_active: false })], 'membership', 'Umerkot', 'Kunri'),
    ).toBe(false)
  })

  it('filters rows for restricted access and preserves global rows', () => {
    const rows = [
      { id: 1, district: 'Umerkot', taluka: 'Kunri' },
      { id: 2, district: 'Umerkot', taluka: 'Pithoro' },
      { id: 3, district: 'Karachi East', taluka: 'Gulshan-e-Iqbal' },
    ]

    expect(filterRowsByAreaAccess(rows, access()).map((row) => row.id)).toEqual([1])
    expect(
      filterRowsByAreaAccess(rows, access({ isGlobalAdmin: true, isRestricted: false })),
    ).toEqual(rows)
    expect(filterRowsByAreaAccess(rows, access({ ok: false }))).toEqual([])
  })

  it('returns appropriate summary and badge states', () => {
    expect(getAreaAccessSummaryText(access())).toContain('Kunri')
    expect(getAreaAccessSummaryText(access({ isGlobalAdmin: true }))).toBe('')
    expect(getAreaAccessBadgeTone(access())).toContain('amber')
    expect(getAreaAccessBadgeTone(access({ ok: false }))).toContain('red')
  })
})
