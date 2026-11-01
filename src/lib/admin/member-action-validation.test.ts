import { describe, expect, it } from 'vitest'
import { MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES } from '../membership-fee'
import {
  normalizeIsoDateTime,
  normalizeLimitedText,
  normalizeOptionalDate,
  normalizeOptionalLimitedText,
  normalizeRejectionReason,
  requireUuid,
  validateApproveInput,
  validateMemberEditInput,
  validatePaymentStatusInput,
  validateReceiptInput,
  validateRejectInput,
} from './member-action-validation'

const memberId = '11111111-1111-4111-8111-111111111111'
const paymentId = '22222222-2222-4222-8222-222222222222'
const accessToken = 'valid-access-token'

describe('admin member action validation', () => {
  it('validates UUIDs and approval input', () => {
    expect(requireUuid(memberId, 'Member ID')).toBe(memberId)
    expect(validateApproveInput({ memberId, accessToken })).toEqual({
      memberId,
      accessToken,
    })
    expect(() => requireUuid('bad-id', 'Member ID')).toThrow('not valid')
    expect(() => validateApproveInput(null)).toThrow('Invalid approval request')
  })

  it('normalizes and validates rejection reasons', () => {
    expect(normalizeRejectionReason('  Missing   required document. ')).toBe(
      'Missing required document.',
    )
    expect(
      validateRejectInput({
        memberId,
        accessToken,
        rejectionReason: '  CNIC image is not readable. ',
      }).rejectionReason,
    ).toBe('CNIC image is not readable.')
    expect(() => normalizeRejectionReason('short')).toThrow('at least 10')
    expect(() => normalizeRejectionReason('x'.repeat(501))).toThrow('less than 500')
  })

  it('normalizes required and optional text', () => {
    expect(normalizeLimitedText('  Noman   Khan ', 'Name', 50)).toBe('Noman Khan')
    expect(normalizeOptionalLimitedText('   ', 'Taluka', 50)).toBeNull()
    expect(normalizeOptionalLimitedText(null, 'Taluka', 50)).toBeNull()
    expect(() => normalizeLimitedText('', 'Name', 50)).toThrow('required')
    expect(() => normalizeLimitedText('x'.repeat(51), 'Name', 50)).toThrow(
      '50 characters or less',
    )
  })

  it('validates real calendar dates and ISO timestamps', () => {
    expect(normalizeOptionalDate('2026-07-10', 'Date')).toBe('2026-07-10')
    expect(normalizeOptionalDate('', 'Date')).toBeNull()
    expect(() => normalizeOptionalDate('2026-02-30', 'Date')).toThrow('valid date')
    expect(normalizeIsoDateTime('2026-07-10T10:00:00Z', 'Time')).toBe(
      '2026-07-10T10:00:00.000Z',
    )
    expect(() => normalizeIsoDateTime('invalid', 'Time')).toThrow('valid date/time')
  })

  it('validates payment status and optional admin notes', () => {
    expect(
      validatePaymentStatusInput({
        memberId,
        paymentId,
        accessToken,
        status: 'paid',
        adminNote: '  Verified by finance team. ',
      }),
    ).toMatchObject({
      memberId,
      paymentId,
      status: 'paid',
      adminNote: 'Verified by finance team.',
    })

    expect(() =>
      validatePaymentStatusInput({
        memberId,
        paymentId,
        accessToken,
        status: 'unknown',
      }),
    ).toThrow('not valid')
  })

  it('validates receipt type, size, identifiers and uploaded time', () => {
    const input = {
      memberId,
      paymentId,
      accessToken,
      receipt: {
        receipt_path: 'user/member/receipt.pdf',
        receipt_file_name: 'receipt.pdf',
        receipt_mime_type: 'application/pdf',
        receipt_size_bytes: 1024,
        receipt_uploaded_at: '2026-07-10T10:00:00Z',
      },
    }

    expect(validateReceiptInput(input)).toMatchObject({
      memberId,
      paymentId,
      receipt: {
        receipt_mime_type: 'application/pdf',
        receipt_size_bytes: 1024,
        receipt_uploaded_at: '2026-07-10T10:00:00.000Z',
      },
    })

    expect(() =>
      validateReceiptInput({
        ...input,
        receipt: { ...input.receipt, receipt_mime_type: 'application/x-msdownload' },
      }),
    ).toThrow('not allowed')

    expect(() =>
      validateReceiptInput({
        ...input,
        receipt: {
          ...input.receipt,
          receipt_size_bytes: MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES + 1,
        },
      }),
    ).toThrow('too large')
  })

  it('validates and normalizes the complete member edit payload', () => {
    const result = validateMemberEditInput({
      memberId,
      accessToken,
      payload: {
        full_name: '  Noman   Khan ',
        father_name: 'Abdul Razzaque',
        cnic: '44404-6886551-3',
        mobile: '03001234567',
        district: 'Umerkot',
        taluka: '  Kunri ',
        address: 'Nabisar Road, Kunri',
        date_of_birth: '1990-01-01',
        gender: 'Male',
        education: 'MBA',
        blood_group: 'B+',
        profession: 'Business',
        caste_branch: '',
        emergency_contact_name: 'Muhammad Ali',
        emergency_contact_relation: 'Brother',
        emergency_contact_mobile: '03111234567',
        declaration_accepted: true,
        photo_url: 'member/photo.jpg',
      },
    })

    expect(result.payload).toMatchObject({
      full_name: 'Noman Khan',
      taluka: 'Kunri',
      caste_branch: null,
      declaration_accepted: true,
      photo_url: 'member/photo.jpg',
    })
  })

  it('rejects missing payloads and non-boolean declaration values', () => {
    expect(() => validateMemberEditInput({ memberId, accessToken })).toThrow(
      'Application data is required',
    )
    expect(() =>
      validateMemberEditInput({
        memberId,
        accessToken,
        payload: {
          full_name: 'Noman Khan',
          father_name: 'Abdul Razzaque',
          cnic: '44404-6886551-3',
          mobile: '03001234567',
          district: 'Umerkot',
          taluka: null,
          address: 'Nabisar Road, Kunri',
          date_of_birth: null,
          gender: null,
          education: null,
          blood_group: null,
          profession: null,
          caste_branch: null,
          emergency_contact_name: null,
          emergency_contact_relation: null,
          emergency_contact_mobile: null,
          declaration_accepted: 'yes',
          photo_url: '',
        },
      }),
    ).toThrow('true or false')
  })
})
