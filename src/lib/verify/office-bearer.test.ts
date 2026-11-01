import { expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: (fn: unknown) => fn }),
  }),
}))

vi.mock('./budget', () => ({ enforceVerificationBudget: vi.fn() }))
import { sanitizePublicOfficeBearerRecord } from './office-bearer'

it('allowlists office-bearer verification fields and strips raw internal UUIDs', () => {
  const result = sanitizePublicOfficeBearerRecord(
    {
      id: '11111111-1111-4111-8111-111111111111',
      committee_id: '22222222-2222-4222-8222-222222222222',
      member_id: '33333333-3333-4333-8333-333333333333',
      office_bearer_id: 'JAS-OB-2026-ABCDEF12',
      designation_title: 'General Secretary',
      status: 'active',
      sort_order: 2,
      tenure_start: '2026-01-01',
      tenure_end: '2026-12-31',
      member_no_snapshot: 'JAS-2026-0001',
      full_name_snapshot: 'Member A',
      father_name_snapshot: 'Father A',
      district_snapshot: 'Umerkot',
      taluka_snapshot: 'Kunri',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      committee: {
        id: '44444444-4444-4444-8444-444444444444',
        committee_type: 'district',
        name: 'District Umerkot Committee',
        division: 'Mirpur Khas',
        district: 'Umerkot',
        taluka: null,
        tenure_start: '2026-01-01',
        tenure_end: '2026-12-31',
        status: 'active',
        public_display: true,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      member: {
        id: '55555555-5555-4555-8555-555555555555',
        user_id: '66666666-6666-4666-8666-666666666666',
        full_name: 'Member A',
        father_name: 'Father A',
        member_no: 'JAS-2026-0001',
        district: 'Umerkot',
        taluka: 'Kunri',
        status: 'approved',
      },
      photoSignedUrl: null,
    },
    'JAS-OB-2026-ABCDEF12',
  )

  expect(result).not.toBeNull()
  expect(result).not.toHaveProperty('id')
  expect(result).not.toHaveProperty('member_id')
  expect(result).not.toHaveProperty('committee_id')
  expect(result?.committee).not.toHaveProperty('id')
  expect(result?.member).not.toHaveProperty('id')
  expect(result?.member).not.toHaveProperty('user_id')
  expect(result?.office_bearer_id).toBe('JAS-OB-2026-ABCDEF12')
})
