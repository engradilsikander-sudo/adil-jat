import { describe, expect, it, vi } from 'vitest'
import type { AdminAreaAccessContext } from './area-permissions'
import type { MemberCardCsvSource } from './admin-member-card-csv'
import {
  buildMemberCardExportAuditMetadata,
  buildMemberCardExportFileName,
  buildMemberCardExportSearchFilter,
  collectMemberCardExportPages,
  getMemberCardExportDateStart,
  sanitizeMemberCardExportSearch,
} from './admin-member-card-export-core'

function makeMember(id: string): MemberCardCsvSource {
  return {
    id,
    member_no: `JAS-2026-${id.padStart(4, '0')}`,
    full_name: `Member ${id}`,
    father_name: 'Father',
    cnic: '44404-1234567-1',
    mobile: '03001234567',
    district: 'Umerkot',
    taluka: 'Kunri',
    profession: null,
    caste_branch: null,
    photo_url: null,
    status: 'approved',
    approved_at: '2026-07-10T00:00:00.000Z',
    address: null,
    date_of_birth: null,
    gender: null,
    education: null,
    blood_group: null,
    emergency_contact_name: null,
    emergency_contact_relation: null,
    emergency_contact_mobile: null,
    declaration_accepted: true,
    created_at: '2026-07-10T00:00:00.000Z',
  }
}

const areaAccess: AdminAreaAccessContext = {
  ok: true,
  message: '',
  userId: 'admin-1',
  moduleKey: 'membership',
  action: 'view',
  roles: ['membership_admin'],
  permissions: [],
  isGlobalAdmin: false,
  isRestricted: true,
  summary: 'Kunri, Umerkot',
}

describe('member card export core', () => {
  it('collects every page including records after the first 1,000 rows', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) =>
      makeMember(String(index + 1)),
    )
    const secondPage = [makeMember('1001')]
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage)

    const result = await collectMemberCardExportPages(fetchPage)

    expect(result).toHaveLength(1001)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999)
  })

  it('sanitizes PostgREST search syntax while retaining useful search text', () => {
    expect(sanitizeMemberCardExportSearch('  Ali%,  Khan  ')).toBe('Ali Khan')
    expect(buildMemberCardExportSearchFilter('Ali%, Khan')).toContain(
      'full_name.ilike.%Ali Khan%',
    )
    expect(buildMemberCardExportSearchFilter('   ')).toBe('')
  })

  it('builds deterministic date boundaries and filenames', () => {
    const now = new Date('2026-07-10T15:30:00.000Z')

    expect(getMemberCardExportDateStart('all', now)).toBeNull()
    expect(getMemberCardExportDateStart('7d', now)).toBe(
      '2026-07-03T15:30:00.000Z',
    )
    expect(buildMemberCardExportFileName(now)).toBe(
      'jas-member-card-data-full-2026-07-10.csv',
    )
  })

  it('does not place CNIC/mobile search text inside audit metadata', () => {
    const metadata = buildMemberCardExportAuditMetadata({
      statusFilter: 'approved',
      districtFilter: 'Umerkot',
      talukaFilter: 'Kunri',
      dateFilter: '30d',
      sortBy: 'newest',
      search: '44404-1234567-1',
      areaAccess,
      recordCount: 233,
      fileName: 'jas-member-card-data-full-2026-07-10.csv',
    })

    expect(metadata.recordCount).toBe(233)
    expect(metadata.areaScope).toBe('Kunri, Umerkot')
    expect(metadata.filters.searchApplied).toBe(true)
    expect(metadata.filters.searchLength).toBe(15)
    expect(JSON.stringify(metadata)).not.toContain('44404-1234567-1')
  })
})
