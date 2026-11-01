import { adminErrorMessage } from '../../lib/admin/data-access'

export function LoadFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
    <h2 className="font-bold">Records unavailable</h2>
    <p className="mt-2">{adminErrorMessage(error)}</p>
    <button type="button" onClick={onRetry} className="secondary-btn mt-4">Try again</button>
  </div>
}
