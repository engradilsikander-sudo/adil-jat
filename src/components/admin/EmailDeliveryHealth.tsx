import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
type Row = { id: string; status: string; attempts: number; next_attempt_at: string; created_at: string }
type Health = { counts: Record<string, number>; recent: Row[] }
export function EmailDeliveryHealth() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const result = await supabase.rpc('admin_email_delivery_health')
      if (result.error) throw result.error
      setHealth(result.data as unknown as Health)
    } catch { setError('Email delivery status could not be loaded. Check the migration and retry.') }
    finally { setBusy(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function retry(id: string) {
    if (!window.confirm('Queue this failed email for another delivery attempt?')) return
    setBusy(true); setError('')
    try {
      const result = await supabase.rpc('retry_notification_email_delivery', { _delivery_id: id })
      if (result.error || result.data !== true) throw new Error('Retry rejected')
      await load()
    } catch { setError('Retry was not accepted. Refresh to check its current status.'); setBusy(false) }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Email delivery health</h2><button type="button" className="secondary-btn" onClick={() => void load()} disabled={busy}>Refresh emails</button></div>
    <p className="mt-2 text-sm text-slate-600">Counts cover all queued email records. Recent activity shows the latest 50. Retry queues a message; the configured email worker sends it.</p>
    {error ? <p role="alert" className="mt-3 text-red-700">{error}</p> : null}
    {health ? <><div className="my-4 flex flex-wrap gap-3">{['queued','sending','sent','failed','dead','skipped'].map((status) => <span key={status} className="rounded-lg bg-slate-100 p-3">{status}: <strong>{health.counts[status] ?? 0}</strong></span>)}</div>
      <ul className="divide-y divide-slate-100">{health.recent.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span>{row.status} · {row.attempts} attempts · {new Date(row.created_at).toLocaleString()}</span>{['failed','dead'].includes(row.status) ? <button type="button" className="secondary-btn" disabled={busy} onClick={() => void retry(row.id)}>Retry email</button> : null}</li>)}</ul>{!health.recent.length ? <p>No email deliveries recorded.</p> : null}</> : busy ? <p role="status">Loading emails…</p> : null}
  </section>
}
