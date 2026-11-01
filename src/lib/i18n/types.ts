export type AppLanguage = 'en' | 'ur' | 'sd'

export type LanguageDirection = 'ltr' | 'rtl'

export type LanguageOption = {
  code: AppLanguage
  shortLabel: string
  nativeLabel: string
  englishLabel: string
  direction: LanguageDirection
}
