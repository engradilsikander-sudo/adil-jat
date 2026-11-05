import { describe, expect, it } from 'vitest'
import { adminAccessibilityCopy, fillAdminCopy } from './admin-accessibility-copy'

describe('UX.10 admin accessibility copy', () => {
  it('provides identical Roles, Area Permissions, and Audit Logs keys across all languages', () => {
    for (const section of ['roles', 'area', 'audit'] as const) {
      const keys = Object.keys(adminAccessibilityCopy.en[section]).sort()
      for (const language of ['en', 'ur', 'sd'] as const) {
        const sectionCopy = adminAccessibilityCopy[language][section] as Record<string, string>
        expect(Object.keys(sectionCopy).sort()).toEqual(keys)
        for (const key of keys) {
          const value = sectionCopy[key]
          expect(value.trim()).not.toBe('')
          expect(value).not.toContain('MISSING')
        }
      }
    }
  })

  it('does not leave English action-only instructions in Urdu and Sindhi', () => {
    expect(adminAccessibilityCopy.ur.roles.searchUsers).not.toBe(adminAccessibilityCopy.en.roles.searchUsers)
    expect(adminAccessibilityCopy.sd.roles.assignRole).not.toBe(adminAccessibilityCopy.en.roles.assignRole)
    expect(adminAccessibilityCopy.ur.area.confirmRemove).not.toBe(adminAccessibilityCopy.en.area.confirmRemove)
    expect(adminAccessibilityCopy.sd.audit.show).not.toBe(adminAccessibilityCopy.en.audit.show)
  })

  it('preserves action template placeholders in all languages', () => {
    const templates = [
      ['roles', 'confirmRemove', ['role', 'email']],
      ['roles', 'assigned', ['role', 'email']],
      ['roles', 'removed', ['role', 'email']],
      ['roles', 'chooseRole', ['email']],
      ['area', 'confirmRemove', ['module', 'area']],
      ['area', 'editFor', ['module', 'area']],
      ['area', 'removeFor', ['module', 'area']],
      ['audit', 'showFor', ['id']],
      ['audit', 'hideFor', ['id']],
    ] as const
    for (const language of ['en', 'ur', 'sd'] as const) {
      for (const [section, key, expected] of templates) {
        const template = (adminAccessibilityCopy[language][section] as Record<string, string>)[key]
        expect([...template.matchAll(/\{([A-Za-z]+)\}/g)].map((item) => item[1]).sort()).toEqual([...expected].sort())
      }
    }
  })

  it('interpolates user-specific labels as plain text without changing identifier values', () => {
    const email = 'person+review@example.org'
    const description = '<img src=x onerror=alert(1)>'
    const label = fillAdminCopy(adminAccessibilityCopy.ur.roles.confirmRemove, { role: description, email })
    expect(label).toContain(email)
    expect(label).toContain(description)
    expect(label).not.toContain('{role}')
  })

  it('does not substitute missing placeholders or perform HTML formatting', () => {
    expect(fillAdminCopy('A {value} / {missing}', { value: 0 })).toBe('A 0 / {missing}')
    expect(fillAdminCopy('literal text', {})).toBe('literal text')
  })
})
