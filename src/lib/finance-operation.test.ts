import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearFinanceRequest, financeFingerprint, reserveFinanceRequest } from './finance-operation'

describe('R1.3 finance operation recovery keys', () => {
  const values = new Map<string, string>()
  beforeEach(() => {
    values.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
    })
  })
  it('reuses one key for an unchanged ambiguous submission', async () => {
    const key = await reserveFinanceRequest('create:donation', { amount: 25, status: 'pending' })
    expect(await reserveFinanceRequest('create:donation', { amount: 25, status: 'pending' })).toBe(key)
  })
  it('refuses changed payload and recovers only after explicit clearing', async () => {
    const key = await reserveFinanceRequest('create:donation', { amount: 25 })
    await expect(reserveFinanceRequest('create:donation', { amount: 250 })).rejects.toThrow('Previous Finance request')
    clearFinanceRequest('create:donation')
    expect(await reserveFinanceRequest('create:donation', { amount: 250 })).not.toBe(key)
  })
  it('keeps different decisions separate and stores no financial payload', async () => {
    await reserveFinanceRequest('decide:finance_donations:test:pending:approved', { id: 'test', amount: 42 })
    const content = [...values.values()].join(' ')
    expect(content).not.toContain('amount')
    expect(content).not.toContain('42')
    expect(content).toContain('fingerprint')
  })
  it('fails closed on malformed and expired recovery records', async () => {
    const scope = 'create:expense'
    values.set('jas-finance-operation:' + scope, '{invalid')
    await expect(reserveFinanceRequest(scope, { amount: 1 })).rejects.toThrow('expired or cannot be recovered')
    values.delete('jas-finance-operation:' + scope)
    await reserveFinanceRequest(scope, { amount: 1 })
    const record = JSON.parse(values.get('jas-finance-operation:' + scope)!)
    record.createdAt = Date.now() - 25 * 60 * 60 * 1000
    values.set('jas-finance-operation:' + scope, JSON.stringify(record))
    await expect(reserveFinanceRequest(scope, { amount: 1 })).rejects.toThrow('expired or cannot be recovered')
  })
  it('fingerprints changed payload deterministically', async () => {
    const first = await financeFingerprint({ amount: 100 })
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(await financeFingerprint({ amount: 100 })).toBe(first)
    expect(await financeFingerprint({ amount: 101 })).not.toBe(first)
  })
})
