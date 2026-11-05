vi.mock('../lib/use-finance-access', () => ({ useFinanceAccess: () => ({ checking: false, allowed: true, userId: 'test-admin', revision: 0 }) }))
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'
import { I18nProvider } from '../lib/i18n'

const state = vi.hoisted(() => ({
  load: vi.fn(),
  download: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => state.navigate,
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))
vi.mock('../components/admin/AdminShell', () => ({
  AdminShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))
vi.mock('../lib/reports', () => ({
  currentUserCanViewReports: async () => true,
  loadReportsCenterData: (...args: unknown[]) => state.load(...args),
  downloadReportCsv: (...args: unknown[]) => state.download(...args),
  formatCurrency: (value: number) => `Rs ${value}`,
  formatReportDate: (date: string) => date,
}))
import { Route } from './admin/reports'

const report = {
  financeVisible: true,
  generatedAt: '2026-11-03T00:00:00Z',
  metrics: [{ label: 'Members', value: 12, helper: 'Count' }],
  memberStatus: { pending: 1, approved: 11, rejected: 0 },
  programSummaries: [],
  financeByPurpose: [{
    purpose: 'Education and vocational training for families', approvedDonations: 1200,
    donationCount: 2, paidExpenses: 200, expenseCount: 1, balance: 1000,
  }],
  districtSummaries: [{
    district: 'Umerkot', members: 12, approvedMembers: 11, programApplications: 3,
    approvedDonations: 1200, paidExpenses: 200,
  }],
  monthlySummaries: [],
  recentActivity: [],
}

beforeEach(() => {
  localStorage.clear()
  state.load.mockReset().mockResolvedValue(report)
  state.download.mockReset()
  state.navigate.mockReset()
})
afterEach(cleanup)

function mount() {
  const Page = (Route as unknown as { component: ComponentType }).component
  return render(<I18nProvider><Page /></I18nProvider>)
}

it('offers keyboard-accessible named report tables and section shortcuts without altering CSV values', async () => {
  mount()
  const quickNav = await screen.findByRole('navigation', { name: 'Report sections' })
  const links = [...quickNav.querySelectorAll('a')]
  expect(links.map(a => a.getAttribute('href'))).toEqual([
    '#jas-report-programs', '#jas-report-finance', '#jas-report-districts',
    '#jas-report-months', '#jas-report-recent',
  ])
  for (const anchor of links) {
    const target = anchor.getAttribute('href')?.slice(1)
    expect(target && document.getElementById(target)).toBeTruthy()
  }
  for (const label of ['Finance by purpose', 'District activity table']) {
    const region = screen.getByRole('region', { name: label })
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.className).toContain('report-table-scroll')
    expect(screen.getByRole('table', { name: label })).toBeTruthy()
  }
  expect(screen.getByText('Education and vocational training for families')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[1])
  expect(state.download).toHaveBeenCalledWith(
    expect.stringMatching(/^jas-finance-purpose-.*\.csv$/),
    ['Purpose', 'Approved Donations', 'Donation Count', 'Paid Expenses', 'Expense Count', 'Balance'],
    [['Education and vocational training for families', 1200, 2, 200, 1, 1000]],
  )
})

it('provides visible empty states instead of blank report sections', async () => {
  state.load.mockResolvedValueOnce({
    ...report, financeByPurpose: [], districtSummaries: [],
  })
  mount()
  await screen.findByText('No finance activity to display.')
  expect(screen.getByText('No district activity to display.')).toBeTruthy()
  expect(screen.getByText('No monthly activity to display.')).toBeTruthy()
  expect(screen.getByText('No recent activity to display.')).toBeTruthy()
})

it('clears privileged report data when a refresh fails', async () => {
  state.load.mockResolvedValueOnce(report).mockRejectedValueOnce(new Error('Offline'))
  mount()
  await screen.findByText('Education and vocational training for families')
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toContain('Offline')
  expect(screen.queryByText('Education and vocational training for families')).toBeNull()
  expect(screen.queryAllByRole('button', { name: 'Export CSV' })).toHaveLength(0)
  await waitFor(() => expect((screen.getByRole('button', { name: 'Refresh' }) as HTMLButtonElement).disabled).toBe(false))
})

it('localizes navigation and scroll guidance in Urdu', async () => {
  localStorage.setItem('jas_language', 'ur')
  mount()
  const nav = await screen.findByRole('navigation', { name: 'رپورٹ کے حصے' })
  expect(nav.querySelectorAll('a')).toHaveLength(5)
  expect(screen.getByRole('region', { name: 'مقصد کے لحاظ سے مالیات' })).toBeTruthy()
  expect(screen.getAllByText(/تمام کالم دیکھنے/)).toHaveLength(2)
  expect(screen.getAllByRole('button', { name: 'CSV ایکسپورٹ' })).toHaveLength(3)
})


it('selects a bounded period without changing all-time defaults or CSV column values', async () => {
  mount()
  await screen.findByText('Education and vocational training for families')
  expect(state.load).toHaveBeenCalledWith('all')
  fireEvent.change(screen.getByRole('combobox', { name: 'Report period' }), { target: { value: '6m' } })
  await waitFor(() => expect(state.load).toHaveBeenCalledWith('6m'))
  await screen.findByText('Education and vocational training for families')
  fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[1])
  expect(state.download).toHaveBeenCalledWith(
    expect.stringMatching(/^jas-finance-purpose-6m-.*\.csv$/),
    ['Purpose', 'Approved Donations', 'Donation Count', 'Paid Expenses', 'Expense Count', 'Balance'],
    [['Education and vocational training for families', 1200, 2, 200, 1, 1000]],
  )
  expect(screen.getByRole('status').textContent).toContain('Last 6 months')
})

it('never exposes a stale period export after the new-period request fails', async () => {
  state.load.mockResolvedValueOnce(report).mockRejectedValueOnce(new Error('Offline'))
  mount()
  await screen.findByText('Education and vocational training for families')
  fireEvent.change(screen.getByRole('combobox', { name: 'Report period' }), { target: { value: '12m' } })
  await screen.findByRole('alert')
  expect(screen.queryAllByRole('button', { name: 'Export CSV' })).toHaveLength(0)
  expect(screen.queryByText('Education and vocational training for families')).toBeNull()
})

it('omits finance-only columns, monthly chips and CSV fields for non-super reports viewers', async () => {
  state.load.mockResolvedValueOnce({
    ...report,
    financeVisible: false,
    financeByPurpose: [],
    districtSummaries: [{ ...report.districtSummaries[0], approvedDonations: 0, paidExpenses: 0 }],
    monthlySummaries: [{ month: '2026-11', members: 4, applications: 2, donations: 0, expenses: 0 }],
  })
  mount()
  const region = await screen.findByRole('region', { name: 'District activity table' })
  expect([...region.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
    'District', 'Members', 'Approved', 'Applications',
  ])
  expect(screen.queryByText('Finance by purpose')).toBeNull()
  expect(screen.queryByText('Donations: Rs 0')).toBeNull()
  expect(screen.queryByText('Expenses: Rs 0')).toBeNull()
  fireEvent.click(screen.getAllByRole('button', { name: 'Export CSV' })[1])
  expect(state.download).toHaveBeenCalledWith(
    expect.stringMatching(/^jas-district-summary-.*\.csv$/),
    ['District', 'Members', 'Approved Members', 'Program Applications'],
    [['Umerkot', 12, 11, 3]],
  )
})

it('offers Urdu period labels in the existing report interface', async () => {
  localStorage.setItem('jas_language', 'ur')
  mount()
  await screen.findByRole('combobox', { name: 'رپورٹ کی مدت' })
  expect(screen.getByRole('option', { name: 'گزشتہ 6 ماہ' })).toBeTruthy()
})
