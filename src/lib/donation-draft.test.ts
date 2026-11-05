import { beforeEach, describe, expect, it } from 'vitest'
import { clearDonationDraft, describeDonationReceipt, donationRecoveryProblem, DONATION_DRAFT_KEY, DONATION_DRAFT_TTL, restoreDonationDraft, saveDonationDraft, type DonationDraft } from './donation-draft'

const fields = { donorName: 'Draft Donor', contact: 'donor@example.test', amount: '123.45', purpose: 'general_fund' as const, paymentMethod: 'bank' as const, transactionReference: 'TX-DRAFT', notes: '' }
const now = 1800000000000
const owner = crypto.randomUUID()
const makeDraft = (): DonationDraft => ({ version: 1, createdAt: now - 1000, ownerId: owner, idempotencyKey: crypto.randomUUID(), fields, receipt: null, unresolved: true })
const map = new Map<string, string>()
const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value) }, removeItem: (key: string) => { map.delete(key) } }
beforeEach(() => { map.clear(); map.set('unrelated-profile-draft', 'keep') })

describe('donation draft privacy and recovery', () => {
  it('restores validated fields and the same unresolved key without replay', () => {
    const draft = makeDraft(); saveDonationDraft(storage, draft)
    expect(restoreDonationDraft(storage, owner, now)).toEqual({ draft, discarded: false })
    expect(map.get('unrelated-profile-draft')).toBe('keep')
  })
  it.each([now - DONATION_DRAFT_TTL, now - DONATION_DRAFT_TTL - 1, now + 1])('discards expired/future timestamps %i', createdAt => {
    saveDonationDraft(storage, { ...makeDraft(), createdAt })
    expect(restoreDonationDraft(storage, owner, now)).toEqual({ draft: null, discarded: true })
    expect(storage.getItem(DONATION_DRAFT_KEY)).toBeNull()
  })
  it.each(['{', 'null', '[]', JSON.stringify(fields), JSON.stringify({ ...makeDraft(), idempotencyKey: 'bad' }), JSON.stringify({ ...makeDraft(), accessToken: 'must-not-restore' }), JSON.stringify({ ...makeDraft(), fields: { ...fields, paymentMethod: 'cash' } })])('discards malformed or legacy data %#', raw => {
    storage.setItem(DONATION_DRAFT_KEY, raw)
    expect(restoreDonationDraft(storage, owner, now).draft).toBeNull()
    expect(storage.getItem(DONATION_DRAFT_KEY)).toBeNull()
    expect(storage.getItem('unrelated-profile-draft')).toBe('keep')
  })
  it('does not adopt an old key with no owner, timestamp or receipt binding', () => {
    storage.setItem('jas-donation-key', crypto.randomUUID())
    expect(restoreDonationDraft(storage, null, now).discarded).toBe(true)
    expect(storage.getItem('jas-donation-key')).toBeNull()
  })
  it.each([[owner, crypto.randomUUID()], [owner, null], [null, owner]] as const)('discards a draft crossing identity boundaries %s → %s', (from, to) => {
    saveDonationDraft(storage, { ...makeDraft(), ownerId: from })
    expect(restoreDonationDraft(storage, to, now)).toEqual({ draft: null, discarded: true })
    expect(storage.getItem(DONATION_DRAFT_KEY)).toBeNull()
  })
  it('restores anonymous-to-anonymous and clears donation keys only', () => {
    const draft = { ...makeDraft(), ownerId: null }
    saveDonationDraft(storage, draft)
    expect(restoreDonationDraft(storage, null, now).draft?.idempotencyKey).toBe(draft.idempotencyKey)
    clearDonationDraft(storage)
    expect([...map.keys()]).toEqual(['unrelated-profile-draft'])
  })
  it('stores receipt hashes, never bytes or tokens, and verifies re-selected contents', async () => {
    const file = new File(['%PDF-1.4 original'], 'private-name.pdf', { type: 'application/pdf' })
    const receipt = await describeDonationReceipt(file)
    const draft = { ...makeDraft(), receipt }
    saveDonationDraft(storage, draft)
    const saved = storage.getItem(DONATION_DRAFT_KEY)!
    expect(saved).not.toMatch(/private-name|%PDF|accessToken|captchaToken|service_role/)
    expect(donationRecoveryProblem(draft, fields, null)).toMatch(/Reselect/)
    expect(donationRecoveryProblem(draft, fields, await describeDonationReceipt(new File(['%PDF-1.4 original'], 'renamed.pdf', { type: 'application/pdf' })))).toBe('')
    expect(donationRecoveryProblem(draft, fields, await describeDonationReceipt(new File(['%PDF-1.4 replaced'], 'private-name.pdf', { type: 'application/pdf' })))).toMatch(/differs/)
  })
  it('rejects changed fields under an unresolved key, but permits fixing a definite rejection', () => {
    const draft = makeDraft()
    expect(donationRecoveryProblem(draft, { ...fields, amount: '999' }, null)).toMatch(/differ/)
    expect(donationRecoveryProblem({ ...draft, unresolved: false }, { ...fields, amount: '999' }, null)).toBe('')
    expect(donationRecoveryProblem(draft, { ...fields, donorName: ' Draft Donor ' }, null)).toBe('')
  })
})
