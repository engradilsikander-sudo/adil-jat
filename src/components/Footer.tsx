import { BRAND } from '../lib/branding'
import { useI18n } from '../lib/i18n'

export default function Footer() {
  const { language, direction } = useI18n()
  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]" dir={direction}>
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">© {new Date().getFullYear()} {BRAND.localizedName[language]} ({BRAND.shortName})</p>
        <p className="island-kicker m-0" lang="en" dir="ltr">{BRAND.tagline}</p>
      </div>
    </footer>
  )
}
