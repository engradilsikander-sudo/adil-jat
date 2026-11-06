/** R1.3: tab-local recovery tokens only. No donor fields or financial records stored. */
type StoredRequest = { version: 1; createdAt: number; fingerprint: string; key: string }
const PREFIX = 'jas-finance-operation:'
const TTL = 24 * 60 * 60 * 1000

async function sha256(input: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', input))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function financeFingerprint(value: unknown): Promise<string> {
  return sha256(new TextEncoder().encode(JSON.stringify(value)).buffer)
}

export async function financeFileDigest(file: File | Blob): Promise<string> {
  return sha256(await file.arrayBuffer())
}

/** Refuses a changed request under a previously unresolved key. */
export async function reserveFinanceRequest(scope: string, payload: unknown): Promise<string> {
  if (!/^[a-z0-9:._-]{1,180}$/i.test(scope)) throw new Error('Invalid Finance operation scope')
  if (typeof sessionStorage === 'undefined') throw new Error('Finance recovery storage unavailable')
  const fingerprint = await financeFingerprint(payload)
  const storageKey = PREFIX + scope
  const raw = sessionStorage.getItem(storageKey)
  if (raw) {
    let stored: StoredRequest | undefined
    try { stored = JSON.parse(raw) as StoredRequest } catch { /* fail closed below */ }
    if (stored?.version !== 1 || !stored.key || !Number.isFinite(stored.createdAt) ||
        Date.now() < stored.createdAt || Date.now() - stored.createdAt > TTL) {
      throw new Error('Previous Finance attempt expired or cannot be recovered. Review the ledger before resetting it.')
    }
    if (stored.fingerprint !== fingerprint) {
      throw new Error('Previous Finance request may have completed. Review the ledger before changing the form or resetting the attempt.')
    }
    return stored.key
  }
  const key = crypto.randomUUID()
  const entry: StoredRequest = { version: 1, createdAt: Date.now(), fingerprint, key }
  sessionStorage.setItem(storageKey, JSON.stringify(entry))
  if (sessionStorage.getItem(storageKey) !== JSON.stringify(entry)) throw new Error('Finance recovery storage unavailable')
  return key
}

export function clearFinanceRequest(scope: string): void {
  sessionStorage.removeItem(PREFIX + scope)
}
