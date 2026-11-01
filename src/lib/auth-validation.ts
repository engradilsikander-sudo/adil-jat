import type { TranslationKey } from './i18n'

export const PASSWORD_MIN_LENGTH = 8

export type PasswordCriterion = {
  key: 'length' | 'uppercase' | 'number' | 'symbol'
  labelKey: TranslationKey
  met: boolean
}

export type PasswordStrength = {
  score: number
  labelKey: TranslationKey
  helperKey: TranslationKey
  barClass: string
  textClass: string
  criteria: PasswordCriterion[]
  isValid: boolean
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function normalizePakistanPhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('0092')) return `+92${digits.slice(4, 14)}`
  if (digits.startsWith('92')) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('0')) return `+92${digits.slice(1, 11)}`
  if (digits.startsWith('3')) return `+92${digits.slice(0, 10)}`

  return digits ? `+${digits}` : ''
}

export function isValidPakistanMobile(value: string) {
  return /^\+923\d{9}$/.test(normalizePakistanPhone(value))
}

export function getPasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const varietyCount = [hasLowercase, hasUppercase, hasNumber, hasSymbol].filter(Boolean).length
  const rawScore = (hasMinLength ? 1 : 0) + Math.min(varietyCount, 3)
  const score = password.length === 0 ? 0 : Math.min(rawScore, 4)
  const isValid = hasMinLength && varietyCount >= 3

  const criteria: PasswordCriterion[] = [
    {
      key: 'length',
      labelKey: 'reset.criteria.length',
      met: hasMinLength,
    },
    {
      key: 'uppercase',
      labelKey: 'reset.criteria.uppercase',
      met: hasUppercase,
    },
    {
      key: 'number',
      labelKey: 'reset.criteria.number',
      met: hasNumber,
    },
    {
      key: 'symbol',
      labelKey: 'reset.criteria.symbol',
      met: hasSymbol,
    },
  ]

  if (score <= 1) {
    return {
      score,
      labelKey: 'reset.strength.weak',
      helperKey: 'reset.strength.helperWeak',
      barClass: 'bg-red-500',
      textClass: 'text-red-700',
      criteria,
      isValid,
    }
  }

  if (score <= 3 || !isValid) {
    return {
      score,
      labelKey: 'reset.strength.medium',
      helperKey: 'reset.strength.helperMedium',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-700',
      criteria,
      isValid,
    }
  }

  return {
    score,
    labelKey: 'reset.strength.strong',
    helperKey: 'reset.strength.helperStrong',
    barClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    criteria,
    isValid,
  }
}
