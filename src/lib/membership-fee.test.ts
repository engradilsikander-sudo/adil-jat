import { describe, expect, it } from 'vitest'
import {
  validateMembershipReceiptFile,
  MEMBERSHIP_BASE_FEE,
  MEMBERSHIP_FEE_CURRENCY,
  assertMembershipPaymentCollectionEnabled,
  formatMembershipMoney,
  getMembershipFeeNotice,
  getMembershipPaymentDisplayStatus,
  getMembershipPaymentStatusClass,
  getMembershipPaymentStatusLabel,
} from './membership-fee'

describe('membership fee helpers', () => {
  it('keeps the configured base fee and currency consistent', () => {
    expect(MEMBERSHIP_BASE_FEE).toBe(500)
    expect(MEMBERSHIP_FEE_CURRENCY).toBe('PKR')
    expect(formatMembershipMoney(MEMBERSHIP_BASE_FEE)).toContain('500')
    expect(getMembershipFeeNotice()).toContain('500')
  })

  it.each([
    ['paid', 'Paid'],
    ['failed', 'Failed'],
    ['cancelled', 'Cancelled'],
    ['refunded', 'Refunded'],
    ['waived', 'Waived'],
    [null, 'Pending'],
  ] as const)('labels payment status %s', (status, expected) => {
    expect(getMembershipPaymentStatusLabel(status)).toBe(expected)
  })

  it('maps payment status classes', () => {
    expect(getMembershipPaymentStatusClass('paid')).toContain('emerald')
    expect(getMembershipPaymentStatusClass('waived')).toContain('sky')
    expect(getMembershipPaymentStatusClass('failed')).toContain('red')
    expect(getMembershipPaymentStatusClass('refunded')).toContain('purple')
    expect(getMembershipPaymentStatusClass('pending')).toContain('amber')
  })

  it('defaults missing payments to pending', () => {
    expect(getMembershipPaymentDisplayStatus(null)).toBe('pending')
    expect(getMembershipPaymentDisplayStatus({ status: 'paid' })).toBe('paid')
  })

  it('enables receipt collection for the configured fee', () => {
    expect(() => assertMembershipPaymentCollectionEnabled()).not.toThrow()
  })
})

it('accepts bounded receipt files and rejects unsafe types and empty/oversized files',()=>{
  expect(validateMembershipReceiptFile({type:'application/pdf',size:5*1024*1024})).toBe('')
  expect(validateMembershipReceiptFile({type:'image/jpeg',size:1024})).toBe('')
  expect(validateMembershipReceiptFile({type:'text/html',size:1024})).not.toBe('')
  expect(validateMembershipReceiptFile({type:'image/png',size:0})).not.toBe('')
  expect(validateMembershipReceiptFile({type:'image/png',size:5*1024*1024+1})).not.toBe('')
})
