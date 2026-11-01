// src/lib/program-page-i18n.ts
import { useI18n, type AppLanguage } from './i18n'

type TextDirection = 'ltr' | 'rtl'

export function useLocalizedProgramCopy<T extends Record<AppLanguage, unknown>>(
  translations: T,
) {
  const { language } = useI18n()
  const selectedLanguage: AppLanguage =
    language in translations ? language : 'en'

  const textDir: TextDirection = selectedLanguage === 'en' ? 'ltr' : 'rtl'
  const isRtl = textDir === 'rtl'
  const textAlignClass = isRtl ? 'text-right' : 'text-left'
  const arrowClass = isRtl ? 'mr-2 rotate-180' : 'ml-2'

  return {
    copy: translations[selectedLanguage] as T[AppLanguage],
    language: selectedLanguage,
    isRtl,
    textDir,
    textAlignClass,
    arrowClass,
  }
}
