import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase/client', () => ({ supabase: { rpc } }))
import {
  ADMIN_DIRECTORY_PAGE_SIZE,
  fetchAdminDirectoryPage,
  fetchAdminDirectorySummary,
  parseAdminDirectoryPage,
  parseAdminDirectorySummary,
} from './admin-member-directory'

const summary = {
  stats: { total: 126, pending: 60, approved: 60, rejected: 6, cards: 55 },
  locations: [
    { district: 'Mirpurkhas', taluka: 'Digri' },
    { district: 'Umerkot', taluka: 'Kunri' },
    { district: 'Tharparkar', taluka: null },
  ],
}
const member = {
  id: 'a1', full_name: 'A Member', cnic: '1234567890123', mobile: '03000000000',
  district: 'Umerkot', taluka: 'Kunri', photo_url: null,
  status: 'pending', member_no: null, created_at: '2026-11-01T12:00:00Z',
}

beforeEach(() => rpc.mockReset())

describe('UX.6 authoritative membership directory responses', () => {
  it('accepts all-scope counts beyond the first 50 and facets from multiple districts', async () => {
    rpc.mockResolvedValue({ data: summary, error: null })
    await expect(fetchAdminDirectorySummary()).resolves.toEqual(summary)
    expect(rpc).toHaveBeenCalledWith('membership_admin_directory_summary')
    expect(parseAdminDirectorySummary(summary).stats.total).toBe(126)
  })

  it('uses the database page index and exact scoped count instead of the number of returned rows', async () => {
    rpc.mockResolvedValue({ data: { total: 126, rows: [member] }, error: null })
    await expect(fetchAdminDirectoryPage({
      status: 'pending', district: 'Umerkot', taluka: 'Kunri', date: 'all',
      search: '  A Member  ', sort: 'name', page: 2,
    })).resolves.toEqual({ rows: [member], total: 126 })
    expect(rpc).toHaveBeenCalledWith('membership_admin_directory_page', expect.objectContaining({
      _page: 2, _page_size: ADMIN_DIRECTORY_PAGE_SIZE, _status: 'pending',
      _district: 'Umerkot', _taluka: 'Kunri', _search: 'A Member',
      _created_from: null, _sort: 'name',
    }))
  })

  it('never substitutes a local page length for a count that is exactly zero', () => {
    expect(parseAdminDirectoryPage({ rows: [], total: 0 }).total).toBe(0)
    expect(() => parseAdminDirectoryPage({ rows: [member], total: 0 })).toThrow(/Inconsistent/)
  })

  it('fails closed on missing counts, malformed locations, or the old RPC being absent', async () => {
    expect(() => parseAdminDirectorySummary({ stats: { ...summary.stats, pending: null }, locations: [] })).toThrow(/Invalid membership count/)
    expect(() => parseAdminDirectorySummary({ stats: summary.stats, locations: [{ district: null, taluka: '' }] })).toThrow(/Invalid membership location/)
    expect(() => parseAdminDirectoryPage({ total: null, rows: [] })).toThrow(/Invalid membership count/)
    rpc.mockResolvedValue({ data: null, error: { message: 'Could not find function public.membership_admin_directory_page' } })
    await expect(fetchAdminDirectoryPage({ status: 'all', district: 'all', taluka: 'all', date: 'all', search: '', sort: 'newest', page: 0 })).rejects.toMatchObject({ message: expect.stringContaining('Could not find function') })
  })

  it('refuses invalid client page numbers before making a database call', async () => {
    await expect(fetchAdminDirectoryPage({ status: 'all', district: 'all', taluka: 'all', date: 'all', search: '', sort: 'newest', page: -1 })).rejects.toThrow(/Invalid membership directory page/)
    expect(rpc).not.toHaveBeenCalled()
  })
})
