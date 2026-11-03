// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'

const state = vi.hoisted(() => ({
  loadedUpdateError: false,
  updates: [] as Array<{
    payload: Record<string, unknown>
    eq: Array<[string, unknown]>
    in?: [string, unknown[]]
  }>,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

const notifications = [
  {
    id: 'loaded-1',
    user_id: 'user',
    title: 'First update',
    message: 'First message',
    category: 'membership',
    related_type: null,
    related_id: null,
    action_url: null,
    is_read: false,
    read_at: null,
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'loaded-2',
    user_id: 'user',
    title: 'Second update',
    message: 'Second message',
    category: 'general',
    related_type: null,
    related_id: null,
    action_url: null,
    is_read: false,
    read_at: null,
    created_at: '2026-11-02T09:00:00Z',
  },
]

vi.mock('../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user' } }, error: null }),
    },
    from: () => {
      let mode: 'select' | 'update' | null = null
      let updateRecord: (typeof state.updates)[number] | null = null
      const query: any = {
        select: () => {
          mode = 'select'
          return query
        },
        update: (payload: Record<string, unknown>) => {
          mode = 'update'
          updateRecord = { payload, eq: [] }
          state.updates.push(updateRecord)
          return query
        },
        eq: (column: string, value: unknown) => {
          if (mode === 'update' && updateRecord) {
            updateRecord.eq.push([column, value])
          }
          return query
        },
        order: () => query,
        range: async () => ({ data: notifications, error: null, count: 80 }),
        in: async (column: string, values: unknown[]) => {
          if (updateRecord) updateRecord.in = [column, values]
          return {
            error: state.loadedUpdateError
              ? { message: 'Unable to mark loaded notifications read.' }
              : null,
          }
        },
        then: (
          resolve: (value: { error: { message: string } | null }) => unknown,
          reject: (reason?: unknown) => unknown,
        ) => Promise.resolve({ error: null }).then(resolve, reject),
      }
      return query
    },
  },
}))

import { Route } from './notifications'

async function mount() {
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<Page />)
  await screen.findByText('First update')
}

beforeEach(() => {
  state.loadedUpdateError = false
  state.updates = []
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('marks only fetched unread IDs read, then keeps Mark all read account-wide', async () => {
  let updateEvents = 0
  window.addEventListener('jas-notifications-updated', () => {
    updateEvents += 1
  })

  await mount()

  await waitFor(() => expect(screen.queryByText('New')).toBeNull())
  expect(state.updates).toHaveLength(1)
  expect(state.updates[0].eq).toEqual([
    ['user_id', 'user'],
    ['is_read', false],
  ])
  expect(state.updates[0].in).toEqual([
    'id',
    ['loaded-1', 'loaded-2'],
  ])
  expect(updateEvents).toBe(1)

  fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))

  await waitFor(() => expect(state.updates).toHaveLength(2))
  expect(state.updates[1].eq).toEqual([
    ['user_id', 'user'],
    ['is_read', false],
  ])
  expect(state.updates[1].in).toBeUndefined()
  await waitFor(() => expect(updateEvents).toBe(2))
})

it('keeps loaded notifications visibly unread when the read mutation fails', async () => {
  state.loadedUpdateError = true
  let updateEvents = 0
  window.addEventListener('jas-notifications-updated', () => {
    updateEvents += 1
  })

  await mount()

  await screen.findByText('Unable to mark loaded notifications read.')
  expect(screen.getAllByText('New')).toHaveLength(2)
  expect(state.updates).toHaveLength(1)
  expect(state.updates[0].in).toEqual([
    'id',
    ['loaded-1', 'loaded-2'],
  ])
  expect(updateEvents).toBe(0)
})
