import { expect, it, vi } from 'vitest'
const budget = vi.hoisted(() => ({ allowed: true, error: null as null | { message: string } }))
const calls = vi.hoisted(() => [] as Array<[string, ...unknown[]]>)
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => ({ inputValidator: () => ({ handler: (fn: unknown) => fn }) }) }))
vi.mock('../supabase/admin', () => ({ createSupabaseAdminClient: () => ({
  rpc: async () => ({ data: budget.allowed, error: budget.error }),
  from: (table: string) => {
    const q = {
      select: (value: string) => { if (table !== 'members') calls.push(['select', value]); return q },
      eq: (field: string, value: unknown) => { if (table !== 'members') calls.push(['eq', field, value]); return q },
      lte: (field: string, value: unknown) => { calls.push(['lte', field, value]); return q },
      gte: (field: string, value: unknown) => { calls.push(['gte', field, value]); return q },
      order: () => q,
      limit: () => { if (table !== 'members') calls.push(['limit']); return q },
      maybeSingle: async () => ({ data: { id: 'member-a', member_no: 'JAS-2026-0001', status: 'approved', photo_url: null, full_name: 'Member A', district: 'Umerkot' }, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    }; return q
  },
}) }))
import { verifyMemberAction } from './actions'
it('filters both validity boundaries and public active committees before limiting results', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-09T12:00:00Z'))
  try {
    const handler = verifyMemberAction as unknown as (args: { data: { memberNo: string } }) => Promise<{ activeDesignation: unknown; verified: boolean }>
    const result = await handler({ data: { memberNo: 'JAS-2026-0001' } })
    expect(result.verified).toBe(true)
    expect(result.activeDesignation).toBeNull()
    expect(calls).toContainEqual(['lte', 'tenure_start', '2026-09-09'])
    expect(calls).toContainEqual(['gte', 'tenure_end', '2026-09-09'])
    expect(calls).toContainEqual(['eq', 'committee.status', 'active'])
    expect(calls).toContainEqual(['eq', 'committee.public_display', true])
    expect(String(calls[0][1])).toContain('organization_committees!inner')
    expect(calls.findIndex(([method]) => method === 'limit')).toBeGreaterThan(calls.findIndex(([method]) => method === 'gte'))
  } finally { vi.useRealTimers() }
})

it('rejects over-budget requests before reading a member', async () => {
  budget.allowed = false
  calls.length = 0
  try {
    const handler = verifyMemberAction as unknown as (args: { data: { memberNo: string } }) => Promise<unknown>
    await expect(handler({ data: { memberNo: 'JAS-2026-0001' } })).rejects.toThrow('VERIFY_RATE_LIMITED')
    expect(calls).toEqual([])
  } finally { budget.allowed = true }
})
it('fails closed with a safe message when the budget database is unavailable', async () => {
  budget.error = { message: 'private database implementation details' }
  try {
    const handler = verifyMemberAction as unknown as (args: { data: { memberNo: string } }) => Promise<unknown>
    await expect(handler({ data: { memberNo: 'JAS-2026-0001' } })).rejects.toThrow('VERIFY_UNAVAILABLE')
  } finally { budget.error = null }
})
it('does not expose the internal member UUID in the public verification payload', async () => {
  calls.length = 0
  const handler = verifyMemberAction as unknown as (args: { data: { memberNo: string } }) => Promise<{ member: Record<string, unknown> | null; verified: boolean }>
  const result = await handler({ data: { memberNo: 'JAS-2026-0001' } })
  expect(result.verified).toBe(true)
  expect(result.member).not.toBeNull()
  expect(result.member).not.toHaveProperty('id')
  expect(result.member).toMatchObject({ member_no: 'JAS-2026-0001', full_name: 'Member A' })
})

