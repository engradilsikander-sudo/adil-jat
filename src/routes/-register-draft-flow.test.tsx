// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StrictMode, type ComponentType } from 'react'
const state = vi.hoisted(() => ({
  blocker: null as null | { enableBeforeUnload: boolean; shouldBlockFn: () => boolean },
  auth: vi.fn(), member: vi.fn(), payment: vi.fn(), photo: vi.fn(), navigate: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => state.navigate,
  useBlocker: (options: typeof state.blocker) => { state.blocker = options },
}))
vi.mock('../lib/supabase/client', () => ({ supabase: {
  auth: { getUser: () => state.auth() },
  from: (table: string) => {
    const q = { select: () => q, eq: () => q, maybeSingle: () => {
      if (table === 'members') return state.member()
      if (table === 'membership_payments') return state.payment()
      throw new Error(`Unexpected table ${table}`)
    } }
    return q
  },
  storage: { from: () => ({ createSignedUrl: () => state.photo() }) },
} }))
import { Route } from './register'
import { I18nProvider } from '../lib/i18n'
import { initialRegisterForm, registerDraftKey, type ExistingMember } from '../lib/register.validation'
import { journeyCopy } from '../lib/member-journey'
beforeEach(() => {
  localStorage.clear()
  state.blocker = null
  state.auth.mockReset().mockResolvedValue({ data: { user: { id: 'draft-user' } }, error: null })
  state.member.mockReset().mockResolvedValue({ data: null, error: null })
  state.payment.mockReset().mockResolvedValue({ data: null, error: null })
  state.photo.mockReset().mockResolvedValue({ data: { signedUrl: 'https://example.invalid/photo.png' }, error: null })
  state.navigate.mockReset().mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('saves only after opt-in and turns off auto-save when the draft is cleared', async () => {
  localStorage.clear()
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)
  const input = await screen.findByPlaceholderText('Enter full name')
  fireEvent.change(input, { target: { value: 'Member Draft' } })
  expect(localStorage.getItem(registerDraftKey('draft-user'))).toBeNull()
  expect(state.blocker?.enableBeforeUnload).toBe(true)
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  expect(state.blocker?.shouldBlockFn()).toBe(true)
  const optIn = screen.getByRole('checkbox', { name: 'Automatically save my draft on this device' })
  fireEvent.click(optIn)
  await waitFor(() => expect(localStorage.getItem(registerDraftKey('draft-user'))).toContain('Member Draft'), { timeout: 2500 })
  expect(state.blocker?.enableBeforeUnload).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /Clear draft/i }))
  expect(localStorage.getItem(registerDraftKey('draft-user'))).toBeNull()
  expect((optIn as HTMLInputElement).checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(true)
})


it('moves focus on valid step transitions, retains field focus while typing, and preserves validation', async () => {
  localStorage.clear()
  const scroll = vi.fn()
  HTMLElement.prototype.scrollIntoView = scroll
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)
  await screen.findByPlaceholderText('Enter full name')
  fireEvent.click(screen.getByRole('button', { name: /Next Step/ }))
  await waitFor(() => expect(document.activeElement?.id).toBe('fullName'))
  expect(scroll).not.toHaveBeenCalled()
  for (const [id, value] of Object.entries({ fullName: 'Example Member', fatherName: 'Example Parent', cnic: '44104-1234567-1', mobile: '03001234567' })) {
    fireEvent.change(document.getElementById(id)!, { target: { value } })
  }
  fireEvent.click(screen.getByRole('button', { name: /Next Step/ }))
  expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Location & Address' }))
  const address = document.getElementById('address')!
  address.focus()
  fireEvent.change(address, { target: { value: 'Example address' } })
  expect(document.activeElement).toBe(address)
  fireEvent.click(screen.getByRole('button', { name: /Previous/ }))
  expect(document.activeElement?.tagName).toBe('H2')
  expect(document.getElementById('fullName')).toBeTruthy()
})


it('focuses permitted step-button navigation and sends cross-step submit validation directly to the invalid field', async () => {
  localStorage.clear()
  HTMLElement.prototype.scrollIntoView = vi.fn()
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<I18nProvider><Page /></I18nProvider>)
  await screen.findByPlaceholderText('Enter full name')

  for (const [id, value] of Object.entries({ fullName: 'Example Member', fatherName: 'Example Parent', cnic: '44104-1234567-1', mobile: '03001234567' })) {
    fireEvent.change(document.getElementById(id)!, { target: { value } })
  }

  fireEvent.click(screen.getByRole('button', { name: /Submit/ }))
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Photo, Payment & Declaration' })).toBe(document.activeElement))

  fireEvent.click(screen.getByRole('button', { name: 'Submit Application' }))
  await waitFor(() => expect(document.activeElement?.id).toBe('district'))
  expect(screen.getByRole('heading', { name: 'Location & Address' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /Identity/ }))
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Personal Identity' })))
})


async function mountRegistration() {
  const Page = (Route as unknown as { component: ComponentType }).component
  return render(<I18nProvider><Page /></I18nProvider>)
}

async function expectRecovery(message = journeyCopy.en.loadFailed) {
  await screen.findByRole('button', { name: journeyCopy.en.retry })
  expect(screen.getByRole('alert').textContent).toBe(message)
  expect(screen.queryByText('Loading form\u2026')).toBeNull()
  expect(document.getElementById('fullName')).toBeNull()
  expect(state.blocker?.enableBeforeUnload).toBe(false)
}

const existing: ExistingMember = {
  id: 'existing-member', membership_fee_required: false, status: 'pending',
  full_name: 'Existing Member', father_name: 'Existing Parent', cnic: '44104-1234567-1',
  mobile: '03001234567', district: 'Umerkot', taluka: 'Kunri', address: 'Example address',
  date_of_birth: '1990-01-01', gender: 'Male', education: 'Graduate', blood_group: 'O+',
  profession: 'Teacher', caste_branch: 'Example', emergency_contact_name: 'Contact',
  emergency_contact_relation: 'Brother', emergency_contact_mobile: '03111234567',
  declaration_accepted: true, photo_url: 'draft-user/photo.png',
}

it('recovers safely from a rejected auth lookup and retries without reloading', async () => {
  state.auth.mockRejectedValueOnce(new Error('Private auth diagnostic'))
  await mountRegistration()
  await expectRecovery()
  expect(screen.queryByText('Private auth diagnostic')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByPlaceholderText('Enter full name')
  expect(state.auth).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('alert')).toBeNull()
})

it.each(['returned', 'thrown'])('does not expose an unloaded form after a %s member lookup failure', async mode => {
  const error = { message: 'Member lookup unavailable' }
  if (mode === 'returned') state.member.mockResolvedValueOnce({ data: null, error })
  else state.member.mockRejectedValueOnce(error)
  await mountRegistration()
  await expectRecovery()
  expect(state.payment).not.toHaveBeenCalled()
})

it('surfaces payment initialization failure before exposing an existing application', async () => {
  state.member.mockResolvedValue({ data: existing, error: null })
  state.payment.mockResolvedValueOnce({ data: null, error: { message: 'Payment lookup failed' } })
  await mountRegistration()
  await expectRecovery()
  expect(state.photo).not.toHaveBeenCalled()
})

it.each(['returned', 'thrown'])('recovers from a %s signed-photo failure and reloads the existing member on retry', async mode => {
  state.member.mockResolvedValue({ data: existing, error: null })
  if (mode === 'returned') state.photo.mockResolvedValueOnce({ data: null, error: { message: 'Photo unavailable' } })
  else state.photo.mockRejectedValueOnce(new Error('Photo initialization threw'))
  await mountRegistration()
  await expectRecovery()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByDisplayValue('Existing Member')
  expect(state.payment).toHaveBeenCalledTimes(2)
  expect(state.photo).toHaveBeenCalledTimes(2)
  expect(state.blocker?.enableBeforeUnload).toBe(false)
})

it('ends loading while an unauthenticated redirect remains pending and ignores its late failure after retry', async () => {
  let rejectNavigation!: (error: Error) => void
  state.auth.mockResolvedValueOnce({ data: { user: null }, error: null })
  state.navigate.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectNavigation = reject }))
  await mountRegistration()
  await expectRecovery('You must be logged in.')
  expect(state.navigate).toHaveBeenCalledWith({ to: '/login' })
  expect(state.member).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByPlaceholderText('Enter full name')
  await act(async () => rejectNavigation(new Error('Old redirect failed')))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(document.getElementById('fullName')).not.toBeNull()
})

it('provides recovery when unauthenticated navigation rejects', async () => {
  state.auth.mockResolvedValue({ data: { user: null }, error: { message: 'Session missing' } })
  state.navigate.mockRejectedValueOnce(new Error('Navigation failed'))
  await mountRegistration()
  await expectRecovery()
  expect(state.navigate).toHaveBeenCalledWith({ to: '/login' })
})

it('restores a saved draft without opting into auto-save or marking it dirty', async () => {
  localStorage.setItem(registerDraftKey('draft-user'), JSON.stringify({
    version: 1, savedAt: new Date().toISOString(), form: { ...initialRegisterForm, fullName: 'Restored Draft' },
  }))
  await mountRegistration()
  await screen.findByDisplayValue('Restored Draft')
  expect((screen.getByRole('checkbox', { name: 'Automatically save my draft on this device' }) as HTMLInputElement).checked).toBe(false)
  expect(state.blocker?.enableBeforeUnload).toBe(false)
})

it('ignores an obsolete bootstrap result after Strict Mode restarts the effect', async () => {
  let rejectOldAuth!: (error: Error) => void
  state.auth.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectOldAuth = reject }))
  const Page = (Route as unknown as { component: ComponentType }).component
  render(<StrictMode><I18nProvider><Page /></I18nProvider></StrictMode>)
  await screen.findByPlaceholderText('Enter full name')
  await act(async () => rejectOldAuth(new Error('Obsolete bootstrap failure')))
  expect(screen.queryByRole('alert')).toBeNull()
  expect(document.getElementById('fullName')).not.toBeNull()
})

it.each(['ur', 'sd'] as const)('localizes bootstrap recovery in %s and preserves RTL', async language => {
  localStorage.setItem('jas_language', language)
  state.auth.mockRejectedValueOnce(new Error('Auth unavailable'))
  await mountRegistration()
  const retry = await screen.findByRole('button', { name: journeyCopy[language].retry })
  expect(screen.getByRole('alert').textContent).toBe(journeyCopy[language].loadFailed)
  expect(retry.closest('main')?.getAttribute('dir')).toBe('rtl')
})
