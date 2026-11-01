// src/lib/program-status-i18n.ts
export type ProgramLabelLanguage = 'en' | 'ur' | 'sd'

export type ProgramLabelMap = Partial<Record<ProgramLabelLanguage, string>>

// Effective document language, not a browser preference that may differ from SSR.
// React callers can pass their context language explicitly.
export function getStoredProgramLanguage(): ProgramLabelLanguage {
  if (typeof document === 'undefined') return 'en'
  const value=document.documentElement.lang
  return value==='ur' || value==='sd' ? value : 'en'
}

export function localizedProgramLabel(
  labels: ProgramLabelMap | undefined,
  fallback: string,
  language: ProgramLabelLanguage = getStoredProgramLanguage(),
) {
  return labels?.[language] ?? labels?.en ?? fallback
}
