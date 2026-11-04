// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { I18nProvider } from '../lib/i18n'

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
  permittedDistrict: 'all',
  rejectSummary: false,
  navigate: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) => select({ location: { pathname: '/admin' } }),
  useNavigate: () => state.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  Outlet: () => null,
}))
vi.mock('../components/admin/AdminShell', () => ({ AdminShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }))
vi.mock('../lib/audit-logs', () => ({ fetchAuditLogs: async () => [], formatAuditDate: (v: string) => v, getAuditActionClass: () => '', getAuditModuleLabel: () => '' }))
vi.mock('../lib/area-permissions', () => ({
  loadCurrentAdminAreaAccess: async () => ({ ok: true, isRestricted: state.permittedDistrict !== 'all', isGlobalAdmin: state.permittedDistrict === 'all', summary: 'Membership area', permissions: [] }),
  filterRowsByAreaAccess: (rows: Array<{ district: string }>) => rows.filter(row => state.permittedDistrict === 'all' || row.district === state.permittedDistrict),
  getAreaAccessSummaryText: () => '',
}))
vi.mock('../lib/supabase/client', () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) },
  from: () => {
    const query = { select: () => query, eq: () => query, in: () => Promise.resolve({ data: [{ role: 'super_admin' }], error: null }) }
    return query
  },
  rpc: (...args: unknown[]) => state.rpc(...args),
} }))
import { Route } from './admin'

const data = Array.from({ length: 126 }, (_, index) => ({
  id: `member-${String(index + 1).padStart(3, '0')}`,
  full_name: `Member ${String(index + 1).padStart(3, '0')}`,
  cnic: '1234567890123', mobile: '03000000000',
  district: index < 60 ? 'Mirpurkhas' : 'Umerkot',
  taluka: index < 60 ? 'Digri' : 'Kunri',
  photo_url: null, status: index < 60 ? 'pending' : 'approved',
  member_no: index < 60 ? null : `JAS-2026-${index}`,
  created_at: new Date(2026, 9, index + 1).toISOString(),
}))

beforeEach(() => {
  localStorage.clear()
  state.navigate.mockReset()
  state.permittedDistrict = 'all'
  state.rejectSummary = false
  state.rpc.mockReset().mockImplementation(async (name: string, params: Record<string, unknown> = {}) => {
    if (name === 'membership_admin_directory_summary') {
      if (state.rejectSummary) return { data: null, error: { code: '42501', message: 'permission denied for function membership_admin_directory_summary' } }
      const allowed = data.filter(row => state.permittedDistrict === 'all' || row.district === state.permittedDistrict)
      return { error: null, data: {
        stats: { total: allowed.length, pending: allowed.filter(row => row.status === 'pending').length,
          approved: allowed.filter(row => row.status === 'approved').length, rejected: 0,
          cards: allowed.filter(row => row.member_no).length },
        locations: Array.from(new Map(allowed.map(row => [row.district, { district: row.district, taluka: row.taluka }])).values()),
      } }
    }
    if (name === 'membership_admin_directory_page') {
      const allowed = data.filter(row =>
        (state.permittedDistrict === 'all' || row.district === state.permittedDistrict) &&
        (params._district === 'all' || row.district === params._district) &&
        (params._taluka === 'all' || row.taluka === params._taluka) &&
        (params._status === 'all' || row.status === params._status),
      )
      const sorted = [...allowed].sort((a, b) => b.created_at.localeCompare(a.created_at))
      const from = Number(params._page) * Number(params._page_size)
      return { error: null, data: { total: sorted.length, rows: sorted.slice(from, from + Number(params._page_size)) } }
    }
    throw new Error(`Unexpected RPC: ${name}`)
  })
})
afterEach(cleanup)

function mount() {
  const Page = (Route as unknown as { component: ComponentType }).component
  return render(<I18nProvider><Page /></I18nProvider>)
}

it('shows 126 authorized records while rendering only 50, and offers district options beyond the first page', async () => {
  mount()
  await screen.findAllByText('Member 126')
  const totalLabel = screen.getByText('Total Members')
  expect(totalLabel.closest('button')?.textContent).toContain('126')
  expect(screen.getByRole('combobox', { name: 'Filter members by district' }).querySelector('option[value="Mirpurkhas"]')).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Filter members by district' }).querySelector('option[value="Umerkot"]')).toBeTruthy()
  expect(screen.getAllByText(/Member 1(?:26|25)/).length).toBeGreaterThan(0)
  expect(screen.queryByText('Member 001')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Next 50' }))
  await screen.findAllByText('Member 076')
  expect(state.rpc).toHaveBeenCalledWith('membership_admin_directory_page', expect.objectContaining({ _page: 1, _page_size: 50 }))
}, 15_000)

it('keeps restricted counts/pages inside the permitted district', async () => {
  state.permittedDistrict = 'Umerkot' // 66 authorized records, two pages
  mount()
  await screen.findAllByText('Member 126')
  expect(screen.getByText('Total Members').closest('button')?.textContent).toContain('66')
  expect(screen.getByRole('combobox', { name: 'Filter members by district' }).querySelector('option[value="Mirpurkhas"]')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Next 50' }))
  await screen.findAllByText('Member 066')
  expect(screen.getByText('Total Members').closest('button')?.textContent).toContain('66')
})

it('applies a district filter without changing the all-area summary totals', async () => {
  mount()
  await screen.findAllByText('Member 126')
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter members by district' }), { target: { value: 'Mirpurkhas' } })
  await waitFor(() => expect(state.rpc).toHaveBeenCalledWith('membership_admin_directory_page', expect.objectContaining({ _district: 'Mirpurkhas', _page: 0 })))
  expect(screen.getByText('Total Members').closest('button')?.textContent).toContain('126')
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Filter members by taluka' }).querySelector('option[value="Digri"]')).toBeTruthy())
  expect(screen.getByRole('combobox', { name: 'Filter members by taluka' }).querySelector('option[value="Kunri"]')).toBeNull()
})

it('does not show zero as a valid total when the authoritative summary fails', async () => {
  state.rejectSummary = true
  mount()
  await screen.findByText('Access to these records is unavailable. Ask an administrator to check database permissions.')
  expect(screen.queryByText(/permission denied for function/)).toBeNull()
  expect(screen.getByText('Total Members').closest('button')?.textContent).toContain('—')
  expect(screen.getByText('Total Members').closest('button')?.textContent).not.toContain('0')
})
