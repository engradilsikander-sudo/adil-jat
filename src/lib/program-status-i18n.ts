// src/lib/program-status-i18n.ts
export type ProgramLabelLanguage = 'en' | 'ur' | 'sd'

export type ProgramLabelMap = Partial<Record<ProgramLabelLanguage, string>>

const STORAGE_KEY = 'jas_language'

export function getStoredProgramLanguage(): ProgramLabelLanguage {
  if (typeof window === 'undefined') return 'en'

  const value = window.localStorage.getItem(STORAGE_KEY)

  if (value === 'ur' || value === 'sd' || value === 'en') {
    return value
  }

  return 'en'
}

export function localizedProgramLabel(
  labels: ProgramLabelMap | undefined,
  fallback: string,
  language: ProgramLabelLanguage = getStoredProgramLanguage(),
) {
  return labels?.[language] ?? labels?.en ?? fallback
}
