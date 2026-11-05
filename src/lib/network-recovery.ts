/**
 * UX.11 transport error classification. Deliberately narrow: a permission, validation,
 * SQL, rate-limit or authorization error must never be treated as a retryable outage.
 */
export function isTransportFailure(error: unknown): boolean {
  if (!error) return false
  if (error instanceof DOMException && error.name === 'AbortError') return false

  if (typeof error === 'string') {
    return /(?:failed to fetch|fetch failed|network(?:\s+request)?\s+failed|networkerror|err_network|load failed|offline|connection (?:lost|refused))/i.test(error)
  }
  if (typeof error !== 'object') return false

  const item = error as { name?: unknown; message?: unknown; status?: unknown; cause?: unknown; code?: unknown }
  if (item.name === 'AbortError' || item.code === 'ABORT_ERR') return false
  if (item.status === 401 || item.status === 403 || item.status === 400 || item.status === 404 || item.status === 429) return false
  if (item.code === '42501' || item.code === 'PGRST202') return false
  if (item.status === 0 || item.status === '0') return true
  if (typeof item.message === 'string' && isTransportFailure(item.message)) return true
  return item.cause !== error && Boolean(item.cause) && isTransportFailure(item.cause)
}

export class NetworkReadCancelled extends Error {
  constructor() { super('Read cancelled'); this.name = 'AbortError' }
}

/**
 * Only for read-only operations. Never pass an insert, update, upsert, storage upload,
 * email, SMS or payment action, even if the user believes it is idempotent.
 */
export async function retryTransportRead<T>(
  read: () => Promise<T>,
  options: { signal?: AbortSignal; delayMs?: number; isOnline?: () => boolean } = {},
): Promise<T> {
  const { signal, delayMs = 200, isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false } = options
  if (signal?.aborted) throw new NetworkReadCancelled()
  try {
    return await read()
  } catch (error) {
    if (!isTransportFailure(error) || !isOnline() || signal?.aborted) throw error
  }

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new NetworkReadCancelled()); return }
    const timeout = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve() }, delayMs)
    const cancel = () => { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); reject(new NetworkReadCancelled()) }
    signal?.addEventListener('abort', cancel, { once: true })
  })
  if (signal?.aborted) throw new NetworkReadCancelled()
  return read()
}

export function networkFailureMessage(error: unknown, fallback: string): string {
  if (isTransportFailure(error)) return fallback
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}
