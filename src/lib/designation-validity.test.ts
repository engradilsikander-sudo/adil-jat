import { describe, expect, it } from 'vitest'
import {
  addYearsMinusOneDayToIsoDate,
  addYearsToIsoDate,
  formatDesignationDate,
  formatDesignationExpiry,
  formatDesignationValidity,
  getDefaultDesignationValidity,
  getDesignationExpiryDate,
  getDesignationValidityStart,
  isDesignationCurrentlyValid,
  toIsoDateString,
} from './designation-validity'

describe('designation validity', () => {
  it('normalizes ISO dates, timestamps and Date values', () => {
    expect(toIsoDateString('2026-07-10T15:00:00Z')).toBe('2026-07-10')
    expect(toIsoDateString(new Date('2026-07-10T15:00:00Z'))).toBe('2026-07-10')
    expect(toIsoDateString('invalid')).toBeNull()
    expect(toIsoDateString(null)).toBeNull()
  })

  it('calculates one-year validity inclusively', () => {
    expect(addYearsToIsoDate('2026-07-10')).toBe('2027-07-10')
    expect(addYearsMinusOneDayToIsoDate('2026-07-10')).toBe('2027-07-09')
    expect(getDefaultDesignationValidity('2026-07-10')).toEqual({
      validFrom: '2026-07-10',
      expiresOn: '2027-07-09',
    })
  })

  it('uses the first available assignment/start date', () => {
    expect(
      getDesignationValidityStart({
        tenure_start: null,
        assignedAt: '2026-07-10T12:00:00Z',
        created_at: '2026-01-01',
      }),
    ).toBe('2026-07-10')
  })

  it('calculates expiry from the start before using stored tenure end', () => {
    expect(
      getDesignationExpiryDate({
        tenure_start: '2026-07-10',
        tenure_end: '2030-01-01',
      }),
    ).toBe('2027-07-09')
    expect(getDesignationExpiryDate({ tenure_end: '2026-12-31' })).toBe(
      '2026-12-31',
    )
  })

  it('checks future, current and expired designations', () => {
    expect(
      isDesignationCurrentlyValid({ tenure_start: '2026-07-11' }, '2026-07-10'),
    ).toBe(false)
    expect(
      isDesignationCurrentlyValid({ tenure_start: '2026-01-01' }, '2026-07-10'),
    ).toBe(true)
    expect(
      isDesignationCurrentlyValid({ tenure_start: '2025-01-01' }, '2026-07-10'),
    ).toBe(false)
  })

  it('formats validity labels safely', () => {
    expect(formatDesignationDate('2026-07-10')).toBe('10 Jul 2026')
    expect(formatDesignationDate('invalid')).toBe('N/A')
    expect(formatDesignationValidity({ tenure_start: '2026-07-10' })).toBe(
      '10 Jul 2026 – 9 Jul 2027',
    )
    expect(formatDesignationExpiry({})).toBe('Expiry not set')
  })
})
