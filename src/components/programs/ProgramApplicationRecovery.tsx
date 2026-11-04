import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

type ApplicationListPath =
  | '/programs/education/my-applications'
  | '/programs/health/my-applications'
  | '/programs/welfare/my-applications'
  | '/programs/employment/my-applications'

export function ProgramApplicationRecovery({
  title, description, retryLabel, viewLabel, inProgressLabel, message,
  busy, onRetry, to, dir,
}: {
  title: string
  description: string
  retryLabel: string
  viewLabel: string
  inProgressLabel: string
  message: string
  busy: boolean
  onRetry: () => void
  to: ApplicationListPath
  dir: 'ltr' | 'rtl'
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12" dir={dir}>
      <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-4 inline-flex rounded-2xl bg-amber-50 p-3 text-amber-700"><AlertTriangle aria-hidden="true" /></div>
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">{description}</p>
        {message ? <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{message}</p> : null}
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={onRetry} disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {busy ? inProgressLabel : retryLabel}
          </button>
          <Link to={to} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-800 no-underline">{viewLabel}</Link>
        </div>
      </section>
    </main>
  )
}
