// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('../../lib/i18n', () => ({
  useI18n: () => ({ language: 'en', direction: 'ltr' }),
}))
vi.mock('./AdminSidebar', () => ({
  AdminSidebar: ({ mobile, collapsed, onToggleCollapsed }: {
    mobile?: boolean; collapsed?: boolean; onToggleCollapsed?: () => void
  }) => mobile
    ? <span>Mobile group accordion</span>
    : <button type="button" onClick={onToggleCollapsed} aria-label="Test desktop toggle">
      {collapsed ? 'Icon rail' : 'Expanded sidebar'}
    </button>,
}))

import { AdminShell } from './AdminShell'
const preferenceKey = 'jas_admin_sidebar_collapsed_v1'

function mount() {
  return render(<AdminShell title="Admin">Content</AdminShell>)
}

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

it('persists the compact desktop state and restores it after remount', async () => {
  const page = mount()
  expect(document.querySelector('.is-sidebar-collapsed')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Test desktop toggle' }))
  expect(document.querySelector('.admin-shell-wrap.is-sidebar-collapsed')).toBeTruthy()
  expect(localStorage.getItem(preferenceKey)).toBe('1')
  page.unmount()
  mount()
  await waitFor(() => expect(document.querySelector('.admin-shell-wrap.is-sidebar-collapsed')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: 'Test desktop toggle' }))
  expect(document.querySelector('.is-sidebar-collapsed')).toBeNull()
  expect(localStorage.getItem(preferenceKey)).toBe('0')
})

it('keeps the toggle usable if browser storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked') })
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Test desktop toggle' }))
  expect(document.querySelector('.admin-shell-wrap.is-sidebar-collapsed')).toBeTruthy()
})
