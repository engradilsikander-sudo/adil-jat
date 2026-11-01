import { describe, expect, it } from 'vitest'
import {
  csvCell,
  formatCnicInput,
  formatDisplayDate,
  formatMobileInput,
  isPakistaniMobile,
  maskCnic,
  maskMobile,
  normalizeMobile,
  optionalText,
  uniqueSorted,
} from './formatters'

describe('shared formatters', () => {
  it('formats valid dates and handles empty/invalid values', () => {
    expect(formatDisplayDate('2026-07-07T10:00:00.000Z')).toContain('2026')
    expect(formatDisplayDate(null)).toBe('N/A')
    expect(formatDisplayDate('not-a-date')).toBe('N/A')
  })

  it('masks CNIC without exposing the middle digits', () => {
    expect(maskCnic('44404-6886551-3')).toBe('44404-*****51-3')
    expect(maskCnic('invalid')).toBe('*****-*******-*')
    expect(maskCnic(null)).toBe('N/A')
  })

  it('masks local and international mobile formats', () => {
    expect(maskMobile('03081234573')).toBe('0308*****73')
    expect(maskMobile('+923081234575')).toBe('+92308*****75')
    expect(maskMobile('invalid')).toBe('***********')
    expect(maskMobile(undefined)).toBe('N/A')
  })

  it.each([
    ['00923001234567', '+923001234567'],
    ['923001234567', '+923001234567'],
    ['+92 300 1234567', '+923001234567'],
    ['0300-1234567', '03001234567'],
  ])('normalizes mobile %s', (input, expected) => {
    expect(normalizeMobile(input)).toBe(expected)
  })

  it('formats mobile input while enforcing supported maximum lengths', () => {
    expect(formatMobileInput('0300123456789')).toBe('03001234567')
    expect(formatMobileInput('9230012345678')).toBe('+923001234567')
    expect(formatMobileInput('009230012345678')).toBe('+923001234567')
  })

  it('formats CNIC input incrementally', () => {
    expect(formatCnicInput('444')).toBe('444')
    expect(formatCnicInput('444046')).toBe('44404-6')
    expect(formatCnicInput('4440468865513')).toBe('44404-6886551-3')
    expect(formatCnicInput('44404-6886551-399')).toBe('44404-6886551-3')
  })

  it('validates Pakistani mobile numbers in both accepted forms', () => {
    expect(isPakistaniMobile('03001234567')).toBe(true)
    expect(isPakistaniMobile('+923001234567')).toBe(true)
    expect(isPakistaniMobile('00923001234567')).toBe(true)
    expect(isPakistaniMobile('04001234567')).toBe(false)
  })

  it('normalizes optional text and unique sorted values', () => {
    expect(optionalText('  Kunri  ')).toBe('Kunri')
    expect(optionalText('   ')).toBeNull()
    expect(uniqueSorted(['Umerkot', 'Karachi', 'Umerkot'])).toEqual([
      'Karachi',
      'Umerkot',
    ])
  })

  it('escapes quotes in generic CSV cells', () => {
    expect(csvCell('Muhammad "Ali"')).toBe('"Muhammad ""Ali"""')
    expect(csvCell(null)).toBe('""')
  })
})
