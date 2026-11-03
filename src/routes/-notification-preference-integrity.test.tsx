// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'
import { I18nProvider } from '../lib/i18n'
import * as webPush from '../lib/web-push'

const state = vi.hoisted(() => ({
  blocker: null as null | {
    enableBeforeUnload: boolean
    shouldBlockFn: () => boolean
  },
  preferenceUpsertError: false,
  preferenceRow: {
    user_id: 'user',
    web_push_enabled: true,
    membership_updates: true,
    program_updates: true,
    finance_updates: true,
    general_updates: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  preferenceUpserts: [] as Array<Record<string, unknown>>,
  preferenceLoads: 0,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  useBlocker: (options: typeof state.blocker) => {
    state.blocker = options
  },
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))

const subscription = {
  id: 'subscription-1',
  user_id: 'user',
  endpoint: 'https://push.example.test/device-token-123456789',
  p256dh: 'p256dh',
  auth: 'auth',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
  device_label: 'Browser · Windows',
  enabled: true,
  failure_count: 0,
  last_seen_at: '2026-11-02T10:00:00Z',
  last_success_at: null,
  last_failure_at: null,
  disabled_at: null,
  disabled_reason: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

vi.mock('../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user' } }, error: null }),
    },
    from: (table: string) => {
      if (table === 'notification_preferences') {
        const query: any = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => {
            state.preferenceLoads += 1
            return { data: { ...state.preferenceRow }, error: null }
          },
          upsert: async (payload: Record<string, unknown>) => {
            state.preferenceUpserts.push(payload)
            if (state.preferenceUpsertError) {
              return { error: { message: 'Preference save failed.' } }
            }
            state.preferenceRow = {
              ...state.preferenceRow,
              ...payload,
            } as typeof state.preferenceRow
            return { error: null }
          },
        }
        return query
      }

      if (table === 'push_subscriptions') {
        let mode: 'select' | 'update' | null = null
        const query: any = {
          select: () => {
            mode = 'select'
            return query
          },
          update: () => {
            mode = 'update'
            return query
          },
          eq: () =>
            mode === 'update' ? Promise.resolve({ error: null }) : query,
          order: async () => ({ data: [subscription], error: null }),
          upsert: async () => ({ error: null }),
        }
        return query
      }

      throw new Error(`Unexpected table ${table}`)
    },
  },
}))

import { Route } from './notification-preferences'

async function mount() {
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)
  await screen.findByText('Push Preferences')
}

function membershipToggle() {
  return screen.getByRole('checkbox', { name: /Membership updates/i }) as HTMLInputElement
}

beforeEach(() => {
  localStorage.clear()
  state.blocker = null
  state.preferenceUpsertError = false
  state.preferenceUpserts = []
  state.preferenceLoads = 0
  state.preferenceRow = {
    user_id: 'user',
    web_push_enabled: true,
    membership_updates: true,
    program_updates: true,
    finance_updates: true,
    general_updates: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
  vi.spyOn(window, 'confirm').mockReturnValue(false)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('protects unsaved preference edits and guards refresh before discarding them', async () => {
  await mount()
  expect(state.blocker?.enableBeforeUnload).toBe(false)

  fireEvent.click(membershipToggle())
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  expect(state.blocker?.shouldBlockFn()).toBe(true)

  const loadsBeforeRefresh = state.preferenceLoads
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(window.confirm).toHaveBeenCalled()
  expect(state.preferenceLoads).toBe(loadsBeforeRefresh)
  expect(membershipToggle().checked).toBe(false)

  vi.mocked(window.confirm).mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  await waitFor(() => expect(state.preferenceLoads).toBe(loadsBeforeRefresh + 1))
  await waitFor(() => expect(membershipToggle().checked).toBe(true))
  expect(state.blocker?.enableBeforeUnload).toBe(false)
})

it('keeps failed saves dirty and clears protection only after a successful save', async () => {
  state.preferenceUpsertError = true
  await mount()

  fireEvent.click(membershipToggle())
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
  await screen.findByText('Preference save failed.')
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  expect(membershipToggle().checked).toBe(false)

  state.preferenceUpsertError = false
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
  await screen.findByText('Notification preferences saved.')
  await waitFor(() => expect(state.blocker?.enableBeforeUnload).toBe(false))
  expect(state.preferenceRow.membership_updates).toBe(false)
})

it('does not silently persist unrelated dirty toggles during device-wide disable', async () => {
  await mount()

  fireEvent.click(membershipToggle())
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)

  fireEvent.click(screen.getByRole('button', { name: 'Disable all devices' }))
  await screen.findByText('Web push paused and all saved browser devices disabled.')

  const devicePreferenceWrite = state.preferenceUpserts.at(-1)
  expect(devicePreferenceWrite).toMatchObject({
    user_id: 'user',
    web_push_enabled: false,
    membership_updates: true,
    program_updates: true,
    finance_updates: true,
    general_updates: true,
  })
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
})


it('switches preference controls to Sindhi and keeps the page RTL', async () => {
  localStorage.setItem('jas_language', 'sd')
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)

  const heading = await screen.findByRole('heading', { name: 'پش ترجيحات' })
  expect(heading.closest('main')?.getAttribute('dir')).toBe('rtl')
  expect(screen.getByRole('button', { name: 'ترجيحات محفوظ ڪريو' })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: /ميمبرشپ اپڊيٽس/i })).toBeTruthy()
})

// Exercise the production branch: Vitest normally sets import.meta.env.DEV=true.
function productionPush(serviceWorker: object | undefined, supported = true) {
  vi.stubEnv('DEV', false)
  vi.spyOn(webPush, 'supportsWebPush').mockReturnValue(supported)
  vi.stubGlobal('Notification', { permission: 'granted' })
  vi.stubGlobal('navigator', Object.create(navigator, {
    serviceWorker: { configurable: true, value: serviceWorker },
  }))
}

it('loads usable ordinary preferences when service workers are unavailable', async () => {
  productionPush(undefined, false)
  await mount()
  expect(screen.queryByText('Loading notification preferences...')).toBeNull()
  fireEvent.click(membershipToggle())
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  expect((screen.getByRole('button', { name: 'Enable this browser' }) as HTMLButtonElement).disabled).toBe(true)
})

it('loads and saves preferences even when a blocked worker never becomes ready', async () => {
  const getSubscription = vi.fn()
  productionPush({ ready: new Promise(() => {}), pushManager: { getSubscription } })
  await mount()
  expect(membershipToggle().checked).toBe(true)
  fireEvent.click(membershipToggle())
  fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }))
  await screen.findByText('Notification preferences saved.')
  expect(state.preferenceRow.membership_updates).toBe(false)
  expect(getSubscription).not.toHaveBeenCalled()
})

it('keeps ordinary preferences usable when worker readiness rejects', async () => {
  productionPush({ get ready() { return Promise.reject(new Error('Worker registration failed')) } })
  await mount()
  fireEvent.click(membershipToggle())
  await waitFor(() => expect(state.blocker?.enableBeforeUnload).toBe(true))
  expect(membershipToggle().checked).toBe(false)
  expect((screen.getByRole('button', { name: 'Remove this browser' }) as HTMLButtonElement).disabled).toBe(true)
})

it('loads ordinary preferences even when push subscription discovery never settles', async () => {
  const getSubscription = vi.fn(() => new Promise(() => {}))
  productionPush({ ready: Promise.resolve({ pushManager: { getSubscription } }) })
  await mount()
  await waitFor(() => expect(getSubscription).toHaveBeenCalled())
  fireEvent.click(membershipToggle())
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
})

it('handles rejected subscription discovery without blocking the page', async () => {
  const getSubscription = vi.fn(async () => { throw new Error('Push discovery failed') })
  productionPush({ ready: Promise.resolve({ pushManager: { getSubscription } }) })
  await mount()
  await waitFor(() => expect(getSubscription).toHaveBeenCalled())
  expect(membershipToggle().checked).toBe(true)
  expect((screen.getByRole('button', { name: 'Remove this browser' }) as HTMLButtonElement).disabled).toBe(true)
})

it('discovers an available browser subscription without overwriting a dirty draft', async () => {
  let resolveSubscription!: (value: { endpoint: string }) => void
  const getSubscription = vi.fn(() => new Promise<{ endpoint: string }>(resolve => { resolveSubscription = resolve }))
  productionPush({ ready: Promise.resolve({ pushManager: { getSubscription } }) })
  await mount()
  await waitFor(() => expect(getSubscription).toHaveBeenCalled())
  fireEvent.click(membershipToggle())
  resolveSubscription({ endpoint: subscription.endpoint })
  await screen.findByText('Subscribed', { exact: true })
  expect((screen.getByRole('button', { name: 'Remove this browser' }) as HTMLButtonElement).disabled).toBe(false)
  expect(membershipToggle().checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
})
