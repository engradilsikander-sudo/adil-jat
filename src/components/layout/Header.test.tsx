// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes } from 'react'
import { Header } from './Header'
import { I18nProvider } from '../../lib/i18n'

const state = vi.hoisted(() => ({ loggedIn: false, admin: false, userId: 'user-1', status: 'approved', navigate: vi.fn(), logout: vi.fn(async () => true) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => <a href={to} {...props} />,
  useNavigate: () => state.navigate,
  useRouterState: () => '/dashboard',
}))
vi.mock('../../hooks/useAuthRole', () => ({ useAuthRole: () => ({ authLoading: false, logoutLoading: false, isLoggedIn: state.loggedIn, isAdmin: state.admin, accountInitial: 'N', accountEmail: 'noman@example.com', accountUserId: state.userId, logout: state.logout }) }))
vi.mock('../../lib/supabase/client', () => ({ supabase: { from: () => {
  const query = { abortSignal: () => query, select: () => query, eq: () => query, maybeSingle: async () => ({ data: { full_name: 'Noman Khan', status: state.status, member_no: 'JAS-2026-0001' }, error: null }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ count: 3, error: null }).then(resolve) }
  return query
} } }))
function mount() { return render(<I18nProvider><Header compact={false} /></I18nProvider>) }
beforeEach(() => {
  state.loggedIn = false; state.admin = false; state.status = 'approved'
  localStorage.clear()
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }) })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(cleanup)
describe('institutional header', () => {
  it('shows the full brand and logged-out account actions', () => {
    mount()
    expect(screen.getByText('Jatt Alliance Sindh')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Join JAS' }).getAttribute('href')).toBe('/signup')
  })
  it('groups organization links and restores focus on Escape', () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Organization' })
    fireEvent.click(trigger)
    expect(screen.getByText('Governance')).toBeTruthy()
    expect(screen.getByText('Community')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Designation Holders/ }).getAttribute('href')).toBe('/designation-holders')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })
  it('switches language and applies RTL to the header', () => {
    mount()
    fireEvent.click(document.querySelector('.jas-language-trigger')!)
    fireEvent.click(screen.getByRole('button', { name: 'اردو' }))
    expect(localStorage.getItem('jas_language')).toBe('ur')
    expect(document.querySelector('header')?.getAttribute('dir')).toBe('rtl')
    expect(document.querySelector('#jas-nav-languages')).toBeNull()
  })
  it('opens and closes the mobile drawer with scroll cleanup', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = screen.getByRole('dialog')
    expect(document.body.style.overflow).toBe('hidden')
    expect(within(drawer).getByRole('link', { name: 'Join JAS' })).toBeTruthy()
    fireEvent.click(within(drawer).getAllByRole('button', { name: 'Close navigation' })[1])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
  })
  it('shows the authenticated profile and logs out through the existing flow', async () => {
    state.loggedIn = true
    mount()
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy())
    fireEvent.click(document.querySelector('.jas-avatar')!)
    expect(await screen.findByText('Noman Khan')).toBeTruthy()
    expect(screen.getByText('JAS-2026-0001')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith({ to: '/login', replace: true }))
  })
  it.each(['pending', 'rejected', 'approved'])('shows the correct action for %s members', async (status) => {
    state.loggedIn = true; state.status = status
    mount()
    fireEvent.click(document.querySelector('.jas-avatar')!)
    await screen.findByText('Noman Khan')
    if (status === 'approved') {
      expect(screen.getByRole('link', { name: 'Digital Card' }).getAttribute('href')).toBe('/card')
      expect(document.querySelector('#jas-nav-account a[href="/register"]')).toBeNull()
    } else {
      expect(screen.getByRole('link', { name: status === 'pending' ? 'View application' : 'Revise application' }).getAttribute('href')).toBe('/register')
      expect(document.querySelector('#jas-nav-account a[href="/card"]')).toBeNull()
    }
  })

})
