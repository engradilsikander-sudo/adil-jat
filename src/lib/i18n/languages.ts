import type { LanguageOption } from './types'

export const APP_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    shortLabel: 'EN',
    nativeLabel: 'English',
    englishLabel: 'English',
    direction: 'ltr',
  },
  {
    code: 'ur',
    shortLabel: 'اردو',
    nativeLabel: 'اردو',
    englishLabel: 'Urdu',
    direction: 'rtl',
  },
  {
    code: 'sd',
    shortLabel: 'سنڌي',
    nativeLabel: 'سنڌي',
    englishLabel: 'Sindhi',
    direction: 'rtl',
  },
]

export const STORAGE_KEY = 'jas_language'
