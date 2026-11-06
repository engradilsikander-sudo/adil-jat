// @vitest-environment jsdom
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

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

function currentLinks() {
  return screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')
}

it('ordinary Admin sees Reports and Programs but no Super Admin-only links', () => {
  render(<AdminSidebar />)
  for (const name of ['Finance', 'Roles', 'Area Permissions', 'Audit Logs']) {
    expect(screen.queryByRole('link', { name })).toBeNull()
  }
  for (const name of ['Reports', 'Members', 'Education', 'CMS']) {
    expect(screen.getByRole('link', { name })).toBeTruthy()
  }
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Dashboard')
})

it('Super Admin gets all privileged links and only the matching current page', () => {
  state.allowed = true
  state.pathname = '/admin/finance'
  render(<AdminSidebar />)
  for (const name of ['Finance', 'Roles', 'Area Permissions', 'Audit Logs']) {
    expect(screen.getByRole('link', { name })).toBeTruthy()
  }
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Finance')
  expect(screen.getByRole('link', { name: 'Reports' }).getAttribute('aria-current')).toBeNull()
})

it('role revocation removes privileged links on the next access refresh without remount', () => {
  state.allowed = true
  const page = render(<AdminSidebar />)
  expect(screen.getByRole('link', { name: 'Finance' })).toBeTruthy()
  state.allowed = false
  page.rerender(<AdminSidebar />)
  expect(screen.queryByRole('link', { name: 'Finance' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Audit Logs' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Reports' })).toBeTruthy()
})

it('mobile sidebar shares the same permissions and preserves drawer navigation callback', () => {
  const onNavigate = vi.fn()
  const page = render(<AdminSidebar mobile onNavigate={onNavigate} />)
  expect(document.querySelector('aside.admin-sidebar-mobile')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Roles' })).toBeNull()
  fireEvent.click(screen.getByRole('link', { name: 'Reports' }))
  expect(onNavigate).toHaveBeenCalledOnce()
  state.allowed = true
  page.rerender(<AdminSidebar mobile onNavigate={onNavigate} />)
  expect(screen.getByRole('link', { name: 'Roles' })).toBeTruthy()
})

it('only Dashboard is active among four legacy /admin aliases', () => {
  state.allowed = true
  render(<AdminSidebar />)
  for (const name of ['Members', 'Pending Applications', 'Digital Cards']) {
    const link = screen.getByRole('link', { name })
    expect(link.getAttribute('href')).toBe('/admin')
    expect(link.getAttribute('aria-current')).toBeNull()
    expect(link.classList.contains('is-active')).toBe(false)
  }
  expect(currentLinks()).toHaveLength(1)
  expect(currentLinks()[0].textContent).toContain('Dashboard')
})

it('role policy is language-independent and Finance badge names Super Admin (EN/UR/SD)', () => {
  for (const [language, expected] of [
    ['en', 'Super Admin Finance'],
    ['ur', 'سپر ایڈمن فنانس'],
    ['sd', 'سپر ايڊمن فنانس'],
  ] as const) {
    state.language = language
    const { result, unmount } = renderHook(() => useAdminManagementCopy('finance'))
    expect(result.current.copy.page.badge).toBe(expected)
    unmount()
    const page = render(<AdminSidebar />)
    expect(screen.queryByRole('link', { name: language === 'en' ? 'Finance' : language === 'ur' ? 'مالیات' : 'ماليات' })).toBeNull()
    page.unmount()
  }
})
