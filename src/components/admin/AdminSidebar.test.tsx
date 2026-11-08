// @vitest-environment jsdom
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { useState, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  allowed: false,
  pathname: '/admin',
  language: 'en' as 'en' | 'ur' | 'sd',
}))

vi.mock('../../lib/use-finance-access', () => ({
  useFinanceAccess: () => ({
    allowed: state.allowed,
    checking: !state.allowed,
    userId: state.allowed ? 'super-admin' : 'ordinary-admin',
    revision: 0,
  }),
}))
vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({ language: state.language }),
}))
vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: state.pathname } }),
  Link: ({ to, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children?: ReactNode }) =>
    <a href={to} {...rest}>{children}</a>,
}))

import { AdminSidebar } from './AdminSidebar'
import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

beforeEach(() => {
  state.allowed = false
  state.pathname = '/admin'
  state.language = 'en'
})
afterEach(() => cleanup())

function openGroup(name: string) {
  const toggle = screen.getByRole('button', { name })
  if (toggle.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle)
  return toggle
}

function currentLinks() {
  return screen.queryAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')
}

it('ordinary Admin retains Reports and Programs but never gets Super Admin-only links', () => {
  render(<AdminSidebar />)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
  openGroup('Finance & Reports')
  expect(screen.getByRole('link', { name: 'Reports' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Finance' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Audit Logs' })).toBeNull()
  openGroup('Organization')
  expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Area Permissions' })).toBeNull()
  openGroup('Programs')
  expect(screen.getByRole('link', { name: 'Education' })).toBeTruthy()
  openGroup('Public CMS')
  expect(screen.getByRole('link', { name: 'CMS' })).toBeTruthy()
})

it('Super Admin has privileged links inside their groups and one current-page link', () => {
  state.allowed = true
  state.pathname = '/admin/finance'
  render(<AdminSidebar />)
  expect(screen.getByRole('link', { name: 'Finance' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Audit Logs' })).toBeTruthy()
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Finance')
  openGroup('Organization')
  expect(screen.getByRole('link', { name: 'Roles' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Area Permissions' })).toBeTruthy()
  expect(currentLinks()).toHaveLength(0)
  openGroup('Finance & Reports')
  expect(currentLinks()).toHaveLength(1)
  expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('aria-current')).toBeNull()
})

it('role revocation hides all privileged links even if their group was open', () => {
  state.allowed = true
  state.pathname = '/admin/finance'
  const page = render(<AdminSidebar />)
  expect(screen.getByRole('link', { name: 'Finance' })).toBeTruthy()
  state.allowed = false
  page.rerender(<AdminSidebar />)
  expect(screen.queryByRole('link', { name: 'Finance' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Audit Logs' })).toBeNull()
  openGroup('Organization')
  expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Area Permissions' })).toBeNull()
  openGroup('Finance & Reports')
  expect(screen.getByRole('link', { name: 'Reports' })).toBeTruthy()
})

it('mobile sidebar uses the same accordion and leaves desktop collapsing unavailable', () => {
  const onNavigate = vi.fn()
  const page = render(<AdminSidebar mobile onNavigate={onNavigate} />)
  expect(document.querySelector('aside.admin-sidebar-mobile')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).toBeNull()
  openGroup('Finance & Reports')
  fireEvent.click(screen.getByRole('link', { name: 'Reports' }))
  expect(onNavigate).toHaveBeenCalledOnce()
  state.allowed = true
  page.rerender(<AdminSidebar mobile onNavigate={onNavigate} />)
  openGroup('Organization')
  expect(screen.getByRole('link', { name: 'Roles' })).toBeTruthy()
})

it('only Dashboard is current among legacy /admin aliases', () => {
  state.allowed = true
  render(<AdminSidebar />)
  expect(currentLinks().map((link) => link.textContent?.includes('Dashboard'))).toEqual([true])
  openGroup('Membership')
  for (const name of ['Members', 'Pending Applications', 'Digital Cards']) {
    const link = screen.getByRole('link', { name })
    expect(link.getAttribute('href')).toBe('/admin')
    expect(link.getAttribute('aria-current')).toBeNull()
    expect(link.classList.contains('is-active')).toBe(false)
  }
  openGroup('Overview')
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Dashboard')
})

it('each group is a disclosure button with aria-expanded and hidden child links', () => {
  render(<AdminSidebar />)
  const groupNames = ['Overview', 'Membership', 'Programs', 'Organization', 'Finance & Reports', 'Public CMS']
  for (const name of groupNames) {
    const toggle = screen.getByRole('button', { name })
    expect(toggle.getAttribute('aria-controls')).toBeTruthy()
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeTruthy()
  }
  expect(screen.getByRole('button', { name: 'Overview' }).getAttribute('aria-expanded')).toBe('true')
  expect(screen.queryByRole('link', { name: 'Education' })).toBeNull()
  openGroup('Programs')
  expect(screen.getByRole('button', { name: 'Overview' }).getAttribute('aria-expanded')).toBe('false')
  expect(screen.getByRole('link', { name: 'Education' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Programs' }))
  expect(screen.queryByRole('link', { name: 'Education' })).toBeNull()
})

it('desktop collapse shows only six labelled group icons; clicking an icon expands that group', () => {
  function Harness() {
    const [collapsed, setCollapsed] = useState(false)
    return <AdminSidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
  }
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
  expect(document.querySelector('.admin-sidebar.is-collapsed')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeTruthy()
  expect(screen.getAllByRole('button').filter((button) =>
    ['Overview', 'Membership', 'Programs', 'Organization', 'Finance & Reports', 'Public CMS']
      .includes(button.getAttribute('aria-label') ?? ''),
  )).toHaveLength(6)
  fireEvent.click(screen.getByRole('button', { name: 'Membership' }))
  expect(document.querySelector('.admin-sidebar.is-collapsed')).toBeNull()
  expect(screen.getByRole('button', { name: 'Membership' }).getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByRole('link', { name: 'Members' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
})

it('route changes reopen its correct group without duplicate active links', () => {
  const page = render(<AdminSidebar />)
  openGroup('Membership')
  state.pathname = '/admin/programs/education/new'
  page.rerender(<AdminSidebar />)
  expect(screen.getByRole('button', { name: 'Programs' }).getAttribute('aria-expanded')).toBe('true')
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Education')
})

it('group icons and collapse labels are localized without bypassing permissions', () => {
  for (const [language, groupLabel, collapseLabel, financeBadge] of [
    ['en', 'Finance & Reports', 'Collapse sidebar', 'Super Admin Finance'],
    ['ur', 'مالیات اور رپورٹس', 'سائیڈ بار سمیٹیں', 'سپر ایڈمن فنانس'],
    ['sd', 'ماليات ۽ رپورٽون', 'سائڊ بار بند ڪريو', 'سپر ايڊمن فنانس'],
  ] as const) {
    state.language = language
    const { result, unmount } = renderHook(() => useAdminManagementCopy('finance'))
    expect(result.current.copy.page.badge).toBe(financeBadge)
    unmount()
    const page = render(<AdminSidebar />)
    expect(screen.getByRole('button', { name: groupLabel })).toBeTruthy()
    expect(screen.getByRole('button', { name: collapseLabel })).toBeTruthy()
    // The role policy applies independently of the UI translation.
    fireEvent.click(screen.getByRole('button', { name: groupLabel }))
    expect(screen.queryByRole('link', { name: language === 'en' ? 'Finance' : language === 'ur' ? 'مالیات' : 'ماليات' })).toBeNull()
    page.unmount()
  }
})


it('brands the UX.14 expanded sidebar without changing its collapse control', () => {
  render(<AdminSidebar />)
  expect(screen.getByText('JWAS Admin Panel')).toBeTruthy()
  expect(screen.getByText('JWAS Management Console')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeTruthy()
})
