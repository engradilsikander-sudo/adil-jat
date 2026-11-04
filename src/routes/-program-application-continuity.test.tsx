// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'

const state = vi.hoisted(() => ({
  blocker: null as null | { enableBeforeUnload: boolean; shouldBlockFn: () => boolean },
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: unknown) => config,
  Link: ({ children }: { children: ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => vi.fn(),
  useBlocker: (args: typeof state.blocker) => { state.blocker = args },
}))
vi.mock('../lib/supabase/client', () => ({
  supabase: { auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn(), storage: { from: vi.fn() } },
}))
import { Route as Education } from './programs/education/apply'
import { Route as Health } from './programs/health/apply'
import { Route as Welfare } from './programs/welfare/apply'
import { Route as Employment } from './programs/employment/apply'
import { I18nProvider } from '../lib/i18n'

const routes = { Education, Health, Welfare, Employment }
beforeEach(() => { state.blocker = null; localStorage.clear(); vi.spyOn(window, 'confirm').mockReturnValue(false) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

for (const [name, route] of Object.entries(routes)) {
  it(`${name}: guards text edits and a selected document without persisting a private draft`, () => {
    const Page = (route as unknown as { component: ComponentType }).component
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = render(<I18nProvider><Page /></I18nProvider>)
    expect(state.blocker?.enableBeforeUnload).toBe(false)
    const input = container.querySelector('form input:not([type="file"])') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'JAS-2026-10001' } })
    expect(state.blocker?.enableBeforeUnload).toBe(true)
    expect(state.blocker?.shouldBlockFn()).toBe(true)
    fireEvent.change(input, { target: { value: '' } })
    expect(state.blocker?.enableBeforeUnload).toBe(false)
    const fileInput = container.querySelector('form input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeTruthy()
    fireEvent.change(fileInput, { target: { files: [new File(['file'], 'file.pdf', { type: 'application/pdf' })] } })
    expect(state.blocker?.enableBeforeUnload).toBe(true)
    expect(state.blocker?.shouldBlockFn()).toBe(true)
    expect(storageSpy).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockReturnValue(true)
    expect(state.blocker?.shouldBlockFn()).toBe(false)
  })
}
