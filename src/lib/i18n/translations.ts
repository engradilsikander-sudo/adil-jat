import { en } from './en'
import { sd } from './sd'
import { ur } from './ur'
import type { AppLanguage } from './types'

export type TranslationKey = keyof typeof en

export const translations = {
  en,
  ur,
  sd,
} as const satisfies Record<AppLanguage, Record<TranslationKey, string>>
