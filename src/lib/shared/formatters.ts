export function formatDisplayDate(value?: string | null) {
  if (!value) return 'N/A'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function maskCnic(value: string | null | undefined) {
  if (!value) return 'N/A'

  const digits = value.replace(/\D/g, '')
  if (digits.length !== 13) return '*****-*******-*'

  return `${digits.slice(0, 5)}-*****${digits.slice(10, 12)}-${digits.slice(12)}`
}

export function maskMobile(value: string | null | undefined) {
  if (!value) return 'N/A'

  const clean = value.replace(/[^\d+]/g, '')

  if (clean.startsWith('+92') && clean.length >= 13) {
    return `${clean.slice(0, 6)}*****${clean.slice(-2)}`
  }

  if (clean.startsWith('03') && clean.length >= 11) {
    return `${clean.slice(0, 4)}*****${clean.slice(-2)}`
  }

  return '***********'
}

export function csvCell(value: string | number | null | undefined) {
  const safe = String(value ?? '').replace(/"/g, '""')
  return `"${safe}"`
}

export function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export function normalizeMobile(value: string) {
  let normalized = value.trim().replace(/[^\d+]/g, '')

  if (normalized.startsWith('0092')) {
    normalized = `+92${normalized.slice(4)}`
  }

  if (normalized.startsWith('92')) {
    normalized = `+${normalized}`
  }

  return normalized
}

export function formatMobileInput(value: string) {
  const cleaned = value.replace(/[^\d+]/g, '')

  if (cleaned.startsWith('+92')) {
    return cleaned.slice(0, 13)
  }

  if (cleaned.startsWith('92')) {
    return `+${cleaned.slice(0, 12)}`
  }

  if (cleaned.startsWith('0092')) {
    return `+92${cleaned.slice(4, 14)}`
  }

  return cleaned.slice(0, 11)
}

export function formatCnicInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)

  if (digits.length <= 5) return digits
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`

  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
}

export function optionalText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function isPakistaniMobile(value: string) {
  const normalized = normalizeMobile(value)
  return /^(\+92|0)3[0-9]{9}$/.test(normalized)
}

export function todayDate() {
  return new Date().toISOString().slice(0, 10)
}
