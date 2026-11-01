import { describe, expect, it, vi } from 'vitest'
import {
  FINANCE_MAX_DOCUMENT_SIZE_BYTES,
  buildDonationReceiptText,
  createFinanceDocumentStoragePath,
  formatFinanceFileSize,
  formatFinanceMoney,
  getExpenseCategoryLabel,
  getExpenseStatusLabel,
  getFinancePurposeLabel,
  getFinanceStatusClass,
  getFinanceStatusLabel,
  getPaymentMethodLabel,
  validateFinanceDocumentFile,
  type FinanceDonation,
} from './finance'

describe('finance helpers', () => {
  it('maps statuses, methods, purposes and categories to labels', () => {
    expect(getFinanceStatusLabel('approved')).toBe('Approved')
    expect(getExpenseStatusLabel('paid')).toBe('Paid')
    expect(getPaymentMethodLabel('jazzcash')).toBe('JazzCash')
    expect(getFinancePurposeLabel('education')).toBe('Education')
    expect(getExpenseCategoryLabel('medical')).toBe('Medical')
    expect(getFinanceStatusLabel('manual_review')).toBe('Manual Review')
  })

  it('returns stable status color families', () => {
    expect(getFinanceStatusClass('approved')).toContain('emerald')
    expect(getFinanceStatusClass('paid')).toContain('emerald')
    expect(getFinanceStatusClass('rejected')).toContain('red')
    expect(getFinanceStatusClass('pending')).toContain('amber')
  })

  it('formats PKR amounts and invalid values safely', () => {
    expect(formatFinanceMoney(1250)).toContain('1,250')
    expect(formatFinanceMoney('600')).toContain('600')
    expect(formatFinanceMoney('invalid')).toContain('0')
  })

  it('creates sanitized storage paths', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456789)
    expect(
      createFinanceDocumentStoragePath({
        userId: 'user-1',
        folder: 'donations',
        fileName: ' My Receipt (Final).PDF ',
      }),
    ).toBe('user-1/donations/123456789-my-receipt-final-.pdf')
    vi.restoreAllMocks()
  })

  it('accepts supported files and rejects invalid type/size', () => {
    expect(
      validateFinanceDocumentFile(
        new File(['ok'], 'receipt.pdf', { type: 'application/pdf' }),
      ),
    ).toBe('')
    expect(
      validateFinanceDocumentFile(
        new File(['bad'], 'receipt.exe', { type: 'application/octet-stream' }),
      ),
    ).toContain('Only PDF')

    const oversized = new File(['x'], 'large.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversized, 'size', {
      value: FINANCE_MAX_DOCUMENT_SIZE_BYTES + 1,
    })
    expect(validateFinanceDocumentFile(oversized)).toContain('8MB')
  })

  it('formats file sizes', () => {
    expect(formatFinanceFileSize(null)).toBe('-')
    expect(formatFinanceFileSize(500)).toBe('500 B')
    expect(formatFinanceFileSize(1536)).toBe('1.5 KB')
    expect(formatFinanceFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })

  it('builds donation receipts with normalized labels', () => {
    const donation = {
      id: 'donation-1',
      donation_no: 'DON-0001',
      donor_name: 'Noman Khan',
      donor_name_snapshot: null,
      donor_father_name_snapshot: 'Abdul Razzaque',
      donor_member_no_snapshot: 'JAS-2026-0001',
      donor_phone: '03001234567',
      amount: 600,
      payment_method: 'easypaisa',
      transaction_reference: 'TX-1',
      purpose: 'general_fund',
      district: 'Umerkot',
      taluka: 'Kunri',
      status: 'approved',
      receipt_no: 'RCPT-1',
      created_at: '2026-07-10T10:00:00Z',
    } as FinanceDonation

    const receipt = buildDonationReceiptText(donation)
    expect(receipt).toContain('Jatt Alliance Sindh (JAS)')
    expect(receipt).toContain('Easypaisa')
    expect(receipt).toContain('General Fund')
    expect(receipt).toContain('Approved')
  })
})
