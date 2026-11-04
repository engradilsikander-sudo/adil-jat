// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { useState } from 'react'

const state = vi.hoisted(() => ({ blocker: null as null | { shouldBlockFn: () => boolean; enableBeforeUnload: boolean } }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: (args: typeof state.blocker) => { state.blocker = args } }))
import { useProgramApplicationContinuity } from './useProgramApplicationContinuity'

function Harness() {
  const [form, setForm] = useState({ name: '' })
  const [file, setFile] = useState<File | null>(null)
  const [secondStart, setSecondStart] = useState('')
  const flow = useProgramApplicationContinuity({ form, initialForm: { name: '' }, files: { identity: file }, leaveConfirm: 'Leave edits?' })
  return <>
    <input aria-label="Name" value={form.name} onChange={(event) => setForm({ name: event.target.value })} />
    <input aria-label="Identity file" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
    <button onClick={() => { flow.start(); setSecondStart(String(flow.start())) }}>Start</button>
    <button onClick={() => flow.stop()}>Stop</button>
    <button onClick={() => flow.markSaved('app-1', 'user-1')}>Save</button>
    <button onClick={() => flow.complete()}>Complete</button>
    <span data-testid="submitting">{String(flow.submitting)}</span>
    <span data-testid="saved">{flow.savedApplication?.id || ''}</span>
    <span data-testid="second-start">{secondStart}</span>
  </>
}
beforeEach(() => { vi.spyOn(window, 'confirm').mockReturnValue(false); state.blocker = null })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('blocks dirty text edits and unblocks after reverting', () => {
  render(<Harness />)
  expect(state.blocker?.enableBeforeUnload).toBe(false)
  const name = screen.getByRole('textbox', { name: 'Name' })
  fireEvent.change(name, { target: { value: 'Applicant' } })
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  expect(state.blocker?.shouldBlockFn()).toBe(true)
  vi.mocked(window.confirm).mockReturnValue(true)
  expect(state.blocker?.shouldBlockFn()).toBe(false)
  fireEvent.change(name, { target: { value: '' } })
  expect(state.blocker?.enableBeforeUnload).toBe(false)
})

it('guards file-only edits and never uses browser storage', () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  render(<Harness />)
  fireEvent.change(screen.getByLabelText('Identity file'), { target: { files: [new File(['x'], 'id.pdf')] } })
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  expect(state.blocker?.shouldBlockFn()).toBe(true)
  expect(storage).not.toHaveBeenCalled()
})

it('protects an in-progress submission and a saved application; clears guard only after completion', () => {
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  expect(screen.getByTestId('submitting').textContent).toBe('true')
  expect(screen.getByTestId('second-start').textContent).toBe('false')
  expect(state.blocker?.shouldBlockFn()).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByTestId('saved').textContent).toBe('app-1')
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }))
  expect(state.blocker?.shouldBlockFn()).toBe(false)
})
