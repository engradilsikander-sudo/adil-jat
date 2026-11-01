import { Link } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { Header } from './Header'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf9f4_0%,#f6f2e9_55%,#f8f5ef_100%)] text-slate-950">
      <Header compact />

      <main className="relative z-10 px-3 py-10 sm:px-4 sm:py-16">
        <section className="page-wrap overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
            <ShieldCheck size={30} />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            {t('notFound.eyebrow')}
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {t('notFound.title')}
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            {t('notFound.description')}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/" className="primary-btn no-underline">
              {t('notFound.home')}
            </Link>

            <Link to="/dashboard" className="secondary-btn no-underline">
              {t('notFound.dashboard')}
            </Link>

            <Link to="/contact" className="secondary-btn no-underline">
              {t('notFound.contact')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
