// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'
import { I18nProvider } from '../lib/i18n'

const mock = vi.hoisted(() => ({
  readResults: [] as Array<{ data: unknown[] | null; count: number; error: unknown }>,
  getUserError: null as unknown,
  readCalls: 0,
  writeCalls: 0,
  navigate: vi.fn(),
}))

const oneNotification = {
  id: 'n1', user_id: 'u1', title: 'Stored update', message: 'Review update',
  category: 'general', related_type: null, related_id: null, action_url: null,
  is_read: true, read_at: '2026-11-02T10:00:00Z', created_at: '2026-11-02T10:00:00Z',
}

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mock.navigate,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('../lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: mock.getUserError ? null : { id: 'u1' } }, error: mock.getUserError }) },
    from: () => {
      let updating = false
      const chain: any = {
        select: () => chain,
        update: () => { updating = true; mock.writeCalls++; return chain },
        eq: () => chain,
        order: () => chain,
        range: async () => {
          mock.readCalls++
          return mock.readResults.shift() || { data: [oneNotification], count: 1, error: null }
        },
        in: async () => ({ error: null }),
        then: (resolve: (arg: unknown) => unknown) => Promise.resolve({ error: updating ? null : null }).then(resolve),
      }
      return chain
    },
  },
}))

import { Route } from './notifications'

function mount() {
  const Page = (Route as unknown as { component: ComponentType }).component
  return render(<I18nProvider><Page /></I18nProvider>)
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  mock.getUserError = null
  mock.readCalls = 0
  mock.writeCalls = 0
  mock.readResults = []
  mock.navigate.mockClear()
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('retries a failed GET once, but does not repeat any mutation', async () => {
  mock.readResults = [
    { data: null, count: 0, error: { message: 'Failed to fetch', status: 0 } },
    { data: [oneNotification], count: 1, error: null },
  ]
  mount()
  await screen.findByText('Stored update')
  expect(mock.readCalls).toBe(2)
  expect(mock.writeCalls).toBe(0)
})

it('keeps already loaded notifications after a failed refresh', async () => {
  mount()
  await screen.findByText('Stored update')
  mock.readResults = [
    { data: null, count: 0, error: { message: 'Failed to fetch', status: 0 } },
    { data: null, count: 0, error: { message: 'Failed to fetch', status: 0 } },
  ]
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  await screen.findByRole('alert')
  expect(screen.getByText('Stored update')).toBeTruthy()
  expect(mock.readCalls).toBe(3)
})

it('does not sign out for a transient session network failure', async () => {
  mock.getUserError = new TypeError('Failed to fetch')
  mount()
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(mock.navigate).not.toHaveBeenCalled()
  expect(mock.readCalls).toBe(0)
  expect(screen.getByRole('button', { name: 'Try loading again' })).toBeTruthy()
})

it('allows manual recovery after an offline first load', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  mock.readResults = [{ data: null, count: 0, error: { message: 'Failed to fetch', status: 0 } }]
  mount()
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(mock.readCalls).toBe(1)
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  fireEvent.click(screen.getByRole('button', { name: 'Try loading again' }))
  await screen.findByText('Stored update')
  await waitFor(() => expect(mock.readCalls).toBe(2))
  expect(mock.writeCalls).toBe(0)
})
