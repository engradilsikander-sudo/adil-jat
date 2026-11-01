export const DESIGNATION_VALIDITY_YEARS = 1

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/

export type DesignationValiditySource = {
  tenure_start?: string | null
  tenureStart?: string | null
  tenure_end?: string | null
  tenureEnd?: string | null
  assigned_at?: string | null
  assignedAt?: string | null
  created_at?: string | null
  createdAt?: string | null
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function toIsoDateString(value: string | Date | null | undefined): string | null {
  if (!value) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }

  const raw = String(value).trim()
  if (!raw) return null

  const isoMatch = raw.match(ISO_DATE_PATTERN)
  if (isoMatch) return isoMatch[0]

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}

export function addYearsToIsoDate(value: string | Date | null | undefined, years = DESIGNATION_VALIDITY_YEARS): string | null {
  const isoDate = toIsoDateString(value)
  if (!isoDate) return null

  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCFullYear(date.getUTCFullYear() + years)

  return date.toISOString().slice(0, 10)
}

export function addYearsMinusOneDayToIsoDate(
  value: string | Date | null | undefined,
  years = DESIGNATION_VALIDITY_YEARS,
): string | null {
  const isoDate = toIsoDateString(value)
  if (!isoDate) return null

  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCFullYear(date.getUTCFullYear() + years)
  date.setUTCDate(date.getUTCDate() - 1)

  return date.toISOString().slice(0, 10)
}

export function getDefaultDesignationValidity(assignDate: string | Date | null | undefined = new Date()): { validFrom: string; expiresOn: string } {
  const validFrom = toIsoDateString(assignDate) ?? getTodayIsoDate()

  return {
    validFrom,
    expiresOn: addYearsMinusOneDayToIsoDate(validFrom) ?? validFrom,
  }
}

export function getDesignationValidityStart(source: DesignationValiditySource): string | null {
  return (
    toIsoDateString(source.tenure_start) ||
    toIsoDateString(source.tenureStart) ||
    toIsoDateString(source.assigned_at) ||
    toIsoDateString(source.assignedAt) ||
    toIsoDateString(source.created_at) ||
    toIsoDateString(source.createdAt)
  )
}

export function getDesignationExpiryDate(source: DesignationValiditySource): string | null {
  const validFrom = getDesignationValidityStart(source)
  const calculatedExpiry = addYearsMinusOneDayToIsoDate(validFrom)
  if (calculatedExpiry) return calculatedExpiry

  return toIsoDateString(source.tenure_end) || toIsoDateString(source.tenureEnd)
}

export function isDesignationCurrentlyValid(source: DesignationValiditySource, today = getTodayIsoDate()) {
  const validFrom = getDesignationValidityStart(source)
  const expiresOn = getDesignationExpiryDate(source)

  if (validFrom && validFrom > today) return false
  if (expiresOn && expiresOn < today) return false

  return true
}

export function formatDesignationDate(value: string | Date | null | undefined) {
  const isoDate = toIsoDateString(value)
  if (!isoDate) return 'N/A'

  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDesignationValidity(source: DesignationValiditySource) {
  const validFrom = getDesignationValidityStart(source)
  const expiresOn = getDesignationExpiryDate(source)

  if (validFrom && expiresOn) {
    return `${formatDesignationDate(validFrom)} – ${formatDesignationDate(expiresOn)}`
  }

  if (validFrom) return `From ${formatDesignationDate(validFrom)}`
  if (expiresOn) return `Until ${formatDesignationDate(expiresOn)}`

  return 'Validity not set'
}

export function formatDesignationExpiry(source: DesignationValiditySource) {
  const expiresOn = getDesignationExpiryDate(source)
  return expiresOn ? formatDesignationDate(expiresOn) : 'Expiry not set'
}
