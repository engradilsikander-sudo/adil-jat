import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { APP_LANGUAGES, STORAGE_KEY } from './languages'
import { translations, type TranslationKey } from './translations'
import type { AppLanguage, LanguageDirection } from './types'

export type { AppLanguage, LanguageDirection } from './types'
export { APP_LANGUAGES } from './languages'
export type { TranslationKey } from './translations'

type I18nContextValue = {
  language: AppLanguage
  direction: LanguageDirection
  setLanguage: (language: AppLanguage) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'ur' || value === 'sd'
}

export function getLanguageDirection(language: AppLanguage) {
  return APP_LANGUAGES.find((item) => item.code === language)?.direction ?? 'ltr'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en'

    const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
    return isAppLanguage(storedLanguage) ? storedLanguage : 'en'
  })

  const direction = getLanguageDirection(language)

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.en[key] ?? key,
    [language],
  )

  useEffect(() => {
    if (typeof document === 'undefined') return

    document.documentElement.lang = language
    // Keep the app shell layout stable LTR; individual text blocks can opt into RTL.
    // This avoids reversing dashboards/cards while still exposing the selected direction.
    document.documentElement.dir = 'ltr'
    document.documentElement.dataset.language = language
    document.documentElement.dataset.direction = direction
    document.body.dataset.language = language
    document.body.dataset.direction = direction
  }, [direction, language])

  const value = useMemo(
    () => ({ language, direction, setLanguage, t }),
    [direction, language, setLanguage, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider')
  }

  return context
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n()

  return (
    <div
      dir="ltr"
      className={`inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm ${
        compact ? 'w-full justify-between' : ''
      }`}
      aria-label={t('language.switchTo')}
    >
      {!compact ? (
        <span className="px-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-500">
          {t('language.label')}
        </span>
      ) : null}

      {APP_LANGUAGES.map((item) => {
        const active = item.code === language

        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLanguage(item.code)}
            className={`min-h-9 rounded-xl px-3 text-xs font-black transition ${
              active
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-900'
            } ${compact ? 'flex-1' : ''}`}
            aria-pressed={active}
            aria-label={active ? `${t('language.current')}: ${item.englishLabel}` : `${t('language.switchTo')}: ${item.englishLabel}`}
            title={item.englishLabel}
          >
            {item.shortLabel}
          </button>
        )
      })}
    </div>
  )
}
