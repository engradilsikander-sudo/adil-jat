// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ComponentType, ReactNode } from 'react'
import { DONATION_DRAFT_KEY, saveDonationDraft, type DonationDraft } from '../lib/donation-draft'
import { donationFailure, DonationSubmissionError } from '../lib/donation-result'

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string }; access_token: string },
  listener: null as null | ((event: string, session: unknown) => void),
  submit: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))
vi.mock('../lib/donation-action', () => ({ submitDonationAction: (args: unknown) => state.submit(args) }))
vi.mock('../components/DonationSecurityCheck', () => ({ DonationSecurityCheck: () => <div>Security check</div> }))
vi.mock('../lib/supabase/client', () => ({ supabase: {
  auth: {
    getSession: async () => ({ data: { session: state.session }, error: null }),
    onAuthStateChange: (callback: typeof state.listener) => { state.listener = callback; return { data: { subscription: { unsubscribe: () => { state.listener = null } } } } },
  },
  from: () => { const query = { select: () => query, eq: () => query, maybeSingle: () => query, returns: async () => ({ data: null, error: null }) }; return query },
} }))
import { Route } from './donate'

const first = '00000000-0000-4000-8000-000000000001'
const second = '00000000-0000-4000-8000-000000000002'
const fields = { donorName: 'Private Draft Donor', contact: 'private@example.test', amount: '123.45', purpose: 'general_fund' as const, paymentMethod: 'bank' as const, transactionReference: 'TX-RECOVERY', notes: 'Private message' }
function seed(ownerId: string | null = null) {
  const draft: DonationDraft = { version: 1, createdAt: Date.now(), ownerId, idempotencyKey: crypto.randomUUID(), fields, receipt: null, unresolved: true }
  saveDonationDraft(sessionStorage, draft)
  return draft
}
function mount() { const Page = (Route as unknown as { component: ComponentType }).component; return render(<Page />) }
function submit() { fireEvent.click(screen.getByRole('button', { name: 'Submit Donation for Verification' })) }
beforeEach(() => {
  sessionStorage.clear(); sessionStorage.setItem('unrelated', 'keep')
  state.session = null; state.listener = null
  state.submit.mockReset().mockResolvedValue({ ok: true, donationNo: 'DON-TEST-1', status: 'pending' })
})
afterEach(cleanup)

it('restores without replay, excludes cash, and clears only donation storage after confirmation', async () => {
  const draft = seed()
  mount()
  await waitFor(() => expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe(fields.donorName))
  expect(state.submit).not.toHaveBeenCalled()
  expect(screen.getByLabelText('Payment Method').querySelector('option[value="cash"]')).toBeNull()
  expect(JSON.parse(sessionStorage.getItem(DONATION_DRAFT_KEY)!).idempotencyKey).toBe(draft.idempotencyKey)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  fireEvent.click(screen.getByRole('button', { name: 'Clear Draft' }))
  expect(sessionStorage.getItem(DONATION_DRAFT_KEY)).toBeNull()
  expect(sessionStorage.getItem('unrelated')).toBe('keep')
  expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe('')
  expect(state.submit).not.toHaveBeenCalled()
})

it.each([[first, second], [null, first], [first, null]] as const)('clears restored details on account transition %s → %s', async (from, to) => {
  state.session = from ? { user: { id: from }, access_token: 'test-token' } : null
  seed(from); mount()
  await waitFor(() => expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe(fields.donorName))
  state.session = to ? { user: { id: to }, access_token: 'new-token' } : null
  act(() => state.listener?.('SIGNED_IN', state.session))
  expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Email or phone') as HTMLInputElement).value).toBe('')
  expect(sessionStorage.getItem(DONATION_DRAFT_KEY)).toBeNull()
  expect(sessionStorage.getItem('unrelated')).toBe('keep')
  expect(state.submit).not.toHaveBeenCalled()
})

it('never renders a previous account draft on initial restore', async () => {
  seed(first)
  state.session = { user: { id: second }, access_token: 'other-token' }
  mount()
  await screen.findByText(/previous donation draft was cleared/)
  expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe('')
  expect(sessionStorage.getItem(DONATION_DRAFT_KEY)).toBeNull()
})

it('keeps the key after a lost response, restores on reload and acknowledges only after a successful retry', async () => {
  const draft = seed()
  state.submit.mockRejectedValueOnce(new Error('internal stack and secret must not be rendered'))
  const view = mount()
  await screen.findByText(/unresolved submission was restored/)
  submit()
  await screen.findByText(/Submission could not be confirmed/)
  expect(screen.queryByText(/internal stack/)).toBeNull()
  expect(screen.queryByText(/Donation reference:/)).toBeNull()
  expect(JSON.parse(sessionStorage.getItem(DONATION_DRAFT_KEY)!).idempotencyKey).toBe(draft.idempotencyKey)
  view.unmount(); mount()
  await screen.findByText(/unresolved submission was restored/)
  expect(state.submit).toHaveBeenCalledTimes(1)
  submit()
  await screen.findByText(/Donation reference: DON-TEST-1/)
  expect(state.submit).toHaveBeenCalledTimes(2)
  expect(state.submit.mock.calls.map(([arg]) => arg.data.get('idempotencyKey'))).toEqual([draft.idempotencyKey, draft.idempotencyKey])
  expect(sessionStorage.getItem(DONATION_DRAFT_KEY)).toBeNull()
})

it('does not send changed fields under an unresolved key', async () => {
  seed(); mount(); await screen.findByText(/unresolved submission was restored/)
  fireEvent.change(screen.getByLabelText('Donation Amount'), { target: { value: '999' } })
  submit()
  await screen.findByText(/details differ from the unresolved/)
  expect(state.submit).not.toHaveBeenCalled()
})

it('requires the original receipt after reload before any write', async () => {
  const draft = seed()
  saveDonationDraft(sessionStorage, { ...draft, receipt: { sha256: 'a'.repeat(64), size: 100, type: 'application/pdf' } })
  mount(); await screen.findByText(/unresolved submission was restored/)
  submit()
  await screen.findByText(/Reselect the original receipt before retrying/)
  expect(state.submit).not.toHaveBeenCalled()
})

it('does not unlock a prior ambiguous attempt after a definite CAPTCHA rejection', async () => {
  seed()
  state.submit.mockResolvedValue(donationFailure(new DonationSubmissionError('captcha')))
  mount(); await screen.findByText(/unresolved submission was restored/)
  submit()
  await screen.findByText(/earlier attempt is still unresolved/)
  expect(JSON.parse(sessionStorage.getItem(DONATION_DRAFT_KEY)!).unresolved).toBe(true)
})

it('ignores a stale successful response when the account changes while a request is pending', async () => {
  seed()
  let resolve!: (value: unknown) => void
  state.submit.mockReturnValue(new Promise(value => { resolve = value }))
  mount(); await screen.findByText(/unresolved submission was restored/)
  submit()
  await waitFor(() => expect(state.submit).toHaveBeenCalledTimes(1))
  state.session = { user: { id: second }, access_token: 'other-token' }
  act(() => state.listener?.('SIGNED_IN', state.session))
  await act(async () => { resolve({ ok: true, donationNo: 'DON-PRIVATE', status: 'pending' }) })
  expect(screen.queryByText(/DON-PRIVATE/)).toBeNull()
  expect((screen.getByLabelText('Donor name') as HTMLInputElement).value).toBe('')
  expect(sessionStorage.getItem(DONATION_DRAFT_KEY)).toBeNull()
})
