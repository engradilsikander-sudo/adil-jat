import { beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  access: vi.fn(),
}))
vi.mock('./supabase/client', () => ({ supabase: { rpc: (...args: unknown[]) => state.rpc(...args) } }))
vi.mock('./area-permissions', () => ({
  loadCurrentAdminAreaAccess: (...args: unknown[]) => state.access(...args),
}))

import { loadReportsCenterData, parseReportsCenterSummary } from './reports'

const summary = {
  generatedAt: '2026-11-04T10:00:00Z',
  period: 'all',
  totals: {
    members_total: 126, members_pending: 26, members_approved: 90, members_rejected: 10,
    applications_total: 42, fees_paid: 7500, fees_pending: 4,
    donations_amount: 40000, donations_count: 3, expenses_amount: 15000, expenses_count: 2,
  },
  programSummaries: [
    { programKey: 'education', total: 42, pending: 2, underReview: 3, approved: 5, rejected: 1, completed: 0, approvedAmount: 2000 },
  ],
  districtSummaries: [{ district: 'Umerkot', members: 75, approvedMembers: 60, programApplications: 23, approvedDonations: 30000, paidExpenses: 10000 }],
  financeByPurpose: [{ purpose: 'Education', approvedDonations: 40000, donationCount: 3, paidExpenses: 15000, expenseCount: 2, balance: 25000 }],
  monthlySummaries: [{ month: '2026-11', members: 5, applications: 2, donations: 3000, expenses: 1000 }],
  recentActivity: [
    { id: 'member-a', type: 'member', memberNo: 'JAS-2026-123', status: 'approved', date: '2026-11-04T09:00:00Z', amount: null, purpose: null, programKey: null },
    { id: 'donation-b', type: 'donation', memberNo: null, status: 'approved', date: '2026-11-04T08:00:00Z', amount: 500, purpose: 'Education', programKey: null },
  ],
}

beforeEach(() => {
  state.access.mockReset().mockResolvedValue({ ok: true })
  state.rpc.mockReset().mockResolvedValue({ data: summary, error: null })
})

it('preserves full authorized totals, finance balance and separate membership fees', () => {
  const data = parseReportsCenterSummary(summary)
  expect(data.metrics.map((m) => m.value)).toEqual([
    'Rs. 7,500', 4, 126, 26, 42, 'Rs. 40,000', 'Rs. 15,000', 'Rs. 25,000',
  ])
  expect(data.financeByPurpose[0].balance).toBe(25000)
  expect(data.districtSummaries[0].district).toBe('Umerkot')
  expect(data.recentActivity[0].title).toBe('Member JAS-2026-123')
  expect(data.recentActivity[1].title).toBe('Rs. 500 donation for Education')
})

it('rejects missing financial fields instead of silently showing zero', () => {
  expect(() => parseReportsCenterSummary({ ...summary, totals: { ...summary.totals, expenses_amount: null } })).toThrow(/unavailable/)
  expect(() => parseReportsCenterSummary({ ...summary, financeByPurpose: null })).toThrow(/incomplete/)
})

it('rejects invalid program and recent-activity types', () => {
  expect(() => parseReportsCenterSummary({ ...summary, programSummaries: [{ ...summary.programSummaries[0], programKey: 'other' }] })).toThrow(/unknown program/)
  expect(() => parseReportsCenterSummary({ ...summary, recentActivity: [{ ...summary.recentActivity[0], type: 'secret' }] })).toThrow(/activity type/)
})

it('requests a single compact RPC result for the selected period', async () => {
  const data = await loadReportsCenterData('6m')
  expect(data.metrics[2].value).toBe(126)
  expect(state.rpc).toHaveBeenCalledTimes(1)
  expect(state.rpc).toHaveBeenCalledWith('jas_reports_center_summary', { _period: '6m' })
  expect(state.access).toHaveBeenCalledWith('reports', 'view', { requiredRoles: ['admin', 'super_admin'] })
})

it('does not query when reports area access is unavailable', async () => {
  state.access.mockResolvedValue({ ok: false, message: 'Access denied' })
  await expect(loadReportsCenterData()).rejects.toThrow('Access denied')
  expect(state.rpc).not.toHaveBeenCalled()
})

it('fails visibly on missing migration or malformed server data', async () => {
  state.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'function missing' } })
  await expect(loadReportsCenterData()).rejects.toMatchObject({ code: 'PGRST202' })
  state.rpc.mockResolvedValueOnce({ data: { totals: {} }, error: null })
  await expect(loadReportsCenterData()).rejects.toThrow(/unavailable/)
})

it('rejects unsupported periods before authorizing or querying', async () => {
  await expect(loadReportsCenterData('weekly' as never)).rejects.toThrow(/Invalid reports period/)
  expect(state.rpc).not.toHaveBeenCalled()
})
