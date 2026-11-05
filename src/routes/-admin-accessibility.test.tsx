// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'

const state = vi.hoisted(() => ({
  removeRole: vi.fn(),
  removeArea: vi.fn(),
  auditRows: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
}))
vi.mock('../components/admin/AdminShell', () => ({
  AdminShell: ({ children, title }: { children: ReactNode; title: string }) => <main aria-label={title}>{children}</main>,
}))
vi.mock('../lib/roles', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  currentUserIsSuperAdmin: async () => true,
  searchRoleUsers: async () => [{
    userId: 'user-1', email: 'person@example.org', memberFullName: 'Example Member',
    memberNo: 'JAS-100', memberStatus: 'approved', roles: ['health_admin'],
  }],
  assignUserRole: vi.fn(),
  removeUserRole: (...args: unknown[]) => state.removeRole(...args),
}))
vi.mock('../lib/area-permissions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  currentUserCanManageAreaPermissions: async () => true,
  searchUsersForAreaPermissions: async () => [{
    user_id: 'user-1', email: 'person@example.org', full_name: 'Example Member',
    member_no: 'JAS-100', roles: ['health_admin'], district: 'Umerkot', taluka: 'Kunri',
  }],
  fetchAreaPermissionsForUser: async () => [{
    id: 'perm-1', user_id: 'user-1', module_key: 'health', scope: 'district',
    district: 'Umerkot', taluka: null, can_view: true, can_review: true,
    can_approve: false, is_active: true, notes: '',
  }],
  saveAreaPermission: vi.fn(),
  removeAreaPermission: (...args: unknown[]) => state.removeArea(...args),
}))
vi.mock('../lib/audit-logs', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchAuditLogs: (...args: unknown[]) => state.auditRows(...args),
  downloadAuditCsv: vi.fn(),
}))
vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) } },
}))

import { I18nProvider } from '../lib/i18n'
import { Route as Roles } from './admin/roles'
import { Route as Area } from './admin/area-permissions'
import { Route as Audit } from './admin/audit-logs'

function mount(route: unknown, language: 'en' | 'ur' | 'sd') {
  localStorage.setItem('jas_language', language)
  const Page = (route as { component: ComponentType }).component
  return render(<I18nProvider><Page /></I18nProvider>)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  state.removeRole.mockReset()
  state.removeArea.mockReset()
  state.auditRows.mockReset()
})

it('Roles: Urdu search, role selection and destructive action have accessible names', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  mount(Roles, 'ur')
  const search = await screen.findByRole('searchbox', { name: 'صارفین تلاش کریں' })
  expect(search).toBeTruthy()
  expect(screen.getByRole('combobox', { name: /person@example.org/ })).toBeTruthy()
  const remove = screen.getByRole('button', { name: /person@example.org.*رول ہٹائیں/ })
  fireEvent.click(remove)
  expect(confirm).toHaveBeenCalledOnce()
  expect(confirm.mock.calls[0][0]).toContain('person@example.org')
  expect(state.removeRole).not.toHaveBeenCalled()
})

it('Area Permissions: Sindhi icon-only search and delete are labeled; selection is announced', async () => {
  mount(Area, 'sd')
  expect(await screen.findByRole('searchbox', { name: 'يوزر ڳوليو' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'يوزر ڳوليو' })).toBeTruthy()
  const user = screen.getByRole('button', { name: /person@example.org/ })
  expect(user.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(user)
  await waitFor(() => expect(user.getAttribute('aria-pressed')).toBe('true'))
  const remove = await screen.findByRole('button', { name: /اجازت هٽايو/ })
  expect(remove).toBeTruthy()
  expect(state.removeArea).not.toHaveBeenCalled()
})

it('Audit Logs: Urdu filter labels, expanded detail state and keyboard controls remain accessible', async () => {
  state.auditRows.mockResolvedValue([{
    id: 'audit-1', created_at: '2026-11-04T11:00:00Z', actor_user_id: 'admin-1',
    actor_email: 'auditor@example.org', action: 'update', action_label: 'Changed member role',
    module_key: 'roles', entity_table: 'user_roles', entity_id: 'record-1',
    record_label: 'Sample Record', changed_data: { role: 'admin' },
    new_data: { role: 'health_admin' }, old_data: null, ip_address: null, user_agent: null,
  }])
  mount(Audit, 'ur')
  expect(await screen.findByRole('searchbox', { name: 'آڈٹ لاگز تلاش کریں' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'ماڈیول کے لحاظ سے فلٹر' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'ٹیبل کے لحاظ سے فلٹر' })).toBeTruthy()
  const toggle = await screen.findByRole('button', { name: /Sample Record/ })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(document.getElementById('jas-audit-details-audit-1')).toBeTruthy()
  expect(screen.getByText('تبدیل شدہ فیلڈز')).toBeTruthy()
})
