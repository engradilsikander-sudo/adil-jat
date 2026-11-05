import { useEffect, useState } from 'react'
import { Wifi, WifiOff, X } from 'lucide-react'
import { useI18n } from '../../lib/i18n'
import { networkRecoveryCopy } from '../../lib/i18n/network-recovery-copy'

type ConnectionHint = 'normal' | 'offline' | 'reconnected'

/** Navigator online/offline events are hints, not a successful server health check. */
export function ConnectionNotice() {
  const { language, direction } = useI18n()
  const copy = networkRecoveryCopy[language]
  // Keep the SSR and first hydration markup identical.
  const [hint, setHint] = useState<ConnectionHint>('normal')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (navigator.onLine === false) setHint('offline')
    const offline = () => setHint('offline')
    const online = () => setHint((previous) => previous === 'offline' ? 'reconnected' : previous)
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  if (hint === 'normal') return null
  const disconnected = hint === 'offline'
  return (
    <div
      dir={direction}
      role="status"
      aria-live="polite"
      data-testid="jas-connection-notice"
      className={`relative z-30 w-full print:hidden border-b px-4 py-3 text-sm ${disconnected
        ? 'border-amber-200 bg-amber-50 text-amber-950'
        : 'border-emerald-200 bg-emerald-50 text-emerald-950'}`}
    >
      <div className="page-wrap flex min-w-0 items-start gap-3">
        {disconnected ? <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <Wifi className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="font-bold">{disconnected ? copy.offline : copy.reconnected}</p>
          <p className="mt-1 leading-relaxed">{disconnected ? copy.offlineDetail : copy.reconnectedDetail}</p>
        </div>
        {!disconnected ? (
          <button
            type="button"
            onClick={() => setHint('normal')}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            aria-label={copy.dismiss}
            title={copy.dismiss}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
