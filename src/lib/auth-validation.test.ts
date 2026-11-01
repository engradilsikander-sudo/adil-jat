import { describe, expect, it } from 'vitest'
import {
  getPasswordStrength,
  isValidEmail,
  isValidPakistanMobile,
  normalizePakistanPhone,
  PASSWORD_MIN_LENGTH,
} from './auth-validation'

describe('auth validation', () => {
  it.each([
    ['noman@example.com', true],
    [' USER+tag@jasofficial.org ', true],
    ['missing-at.example.com', false],
    ['user@localhost', false],
    ['user @example.com', false],
  ])('validates email %s', (value, expected) => {
    expect(isValidEmail(value)).toBe(expected)
  })

  it.each([
    ['03001234567', '+923001234567'],
    ['+923001234567', '+923001234567'],
    ['923001234567', '+923001234567'],
    ['00923001234567', '+923001234567'],
    ['3001234567', '+923001234567'],
    ['0300 123-4567', '+923001234567'],
  ])('normalizes Pakistan phone %s', (value, expected) => {
    expect(normalizePakistanPhone(value)).toBe(expected)
  })

  it('rejects empty and invalid mobile numbers', () => {
    expect(normalizePakistanPhone('')).toBe('')
    expect(isValidPakistanMobile('03001234567')).toBe(true)
    expect(isValidPakistanMobile('+923001234567')).toBe(true)
    expect(isValidPakistanMobile('02001234567')).toBe(false)
    expect(isValidPakistanMobile('0300123456')).toBe(false)
  })

  it('requires eight characters and at least three character groups', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(getPasswordStrength('Abcdef1!').isValid).toBe(true)
    expect(getPasswordStrength('abcdefgh').isValid).toBe(false)
    expect(getPasswordStrength('ABCDEF12').isValid).toBe(false)
    expect(getPasswordStrength('Ab1!').isValid).toBe(false)
  })

  it('returns stable weak, medium and strong UI states', () => {
    expect(getPasswordStrength('')).toMatchObject({ score: 0, isValid: false })
    expect(getPasswordStrength('abc').labelKey).toBe('reset.strength.weak')
    expect(getPasswordStrength('abcdefghA').labelKey).toBe('reset.strength.medium')
    expect(getPasswordStrength('Abcdef1!')).toMatchObject({
      score: 4,
      labelKey: 'reset.strength.strong',
      isValid: true,
    })
  })

  it('reports each password criterion independently', () => {
    const criteria = Object.fromEntries(
      getPasswordStrength('Abcdef1!').criteria.map((item) => [item.key, item.met]),
    )

    expect(criteria).toEqual({
      length: true,
      uppercase: true,
      number: true,
      symbol: true,
    })
  })
})
