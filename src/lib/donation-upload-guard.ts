/**
 * R1.3-r4: The only donation POST is bounded before Start's server-function
 * dispatcher calls Request.formData(). Do not install a global upload limit:
 * other application workflows legitimately upload larger files.
 */
export const MAX_DONATION_REQUEST_BYTES = 3 * 1024 * 1024

export type DonationUploadGate =
  | { kind: 'forward'; request: Request }
  | { kind: 'reject'; response: Response }

function reject(status: number, reason: string): DonationUploadGate {
  return {
    kind: 'reject',
    response: new Response(reason, {
      status,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    }),
  }
}

/** Exact function-path scope, regardless of origin or harmless query parameters. */
export function isDonationUploadRequest(request: Request, actionUrl: string): boolean {
  if (request.method !== 'POST') return false
  if (!actionUrl || typeof actionUrl !== 'string') {
    // A missing compiled action URL is a deployment incompatibility, not a
    // reason to silently allow unbounded donation processing.
    throw new Error('Donation server-function URL not available')
  }
  const actionPath = new URL(actionUrl, request.url).pathname
  return new URL(request.url).pathname === actionPath
}

/**
 * Runs in src/server.ts (the fetch entry), BEFORE Start's body parser.
 * Works with Content-Length and with absent/untrusted length (chunked bodies).
 * Rejects after at most MAX+one incoming stream chunk; never calls formData()
 * on a rejected request. Allowed requests are replayed as bounded byte bodies.
 */
export async function guardDonationUploadRequest(
  request: Request,
  actionUrl: string,
): Promise<DonationUploadGate> {
  if (!isDonationUploadRequest(request, actionUrl)) return { kind: 'forward', request }

  const type = request.headers.get('content-type') ?? ''
  if (!/^multipart\/form-data\s*;\s*boundary=/i.test(type)) {
    return reject(415, 'Donation requests require multipart/form-data.')
  }
  const encoding = request.headers.get('content-encoding')
  if (encoding && encoding.toLowerCase().trim() !== 'identity') {
    return reject(415, 'Compressed donation requests are not supported.')
  }
  const declaredLength = request.headers.get('content-length')
  let declared: number | null = null
  if (declaredLength !== null) {
    if (!/^(0|[1-9][0-9]*)$/.test(declaredLength)) {
      return reject(400, 'Invalid Content-Length.')
    }
    // Avoid Number integer overflow and reject oversized lengths immediately.
    declared = Number(declaredLength)
    if (!Number.isSafeInteger(declared) || declared > MAX_DONATION_REQUEST_BYTES) {
      return reject(413, 'Donation request exceeds 3 MiB.')
    }
  }

  if (!request.body) return reject(400, 'Donation request body is missing.')
  const reader = request.body.getReader()
  let buffer = new Uint8Array(64 * 1024)
  let used = 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      if (chunk.value.byteLength > MAX_DONATION_REQUEST_BYTES - used) {
        // Do not await cancel; response must not be held by a stalled sender.
        void reader.cancel('donation body too large').catch(() => {})
        return reject(413, 'Donation request exceeds 3 MiB.')
      }
      const needed = used + chunk.value.byteLength
      if (needed > buffer.byteLength) {
        const expanded = new Uint8Array(Math.min(
          MAX_DONATION_REQUEST_BYTES,
          Math.max(buffer.byteLength * 2, needed),
        ))
        expanded.set(buffer.subarray(0, used))
        buffer = expanded
      }
      buffer.set(chunk.value, used)
      used = needed
    }
  } catch {
    return reject(400, 'Donation request body could not be read.')
  } finally {
    reader.releaseLock()
  }

  // An understated/misleading header must never bypass the stream count.
  if (declared !== null && declared !== used) {
    return reject(400, 'Content-Length does not match request body.')
  }

  // Preserve the original URL, method, content-type/boundary, origin, cookies,
  // and abort signal. No form parsing or financial side effects happen here.
  const bounded = buffer.slice(0, used)
  // Nitro/Start can provide a Request-compatible facade rather than a native
  // Undici Request. Passing that facade as the first constructor argument
  // makes Undici inspect private Request state and throws at runtime.
  // Construct from the safe URL string instead, explicitly forwarding the
  // method, headers (including cookies/Origin/boundary), and abort signal.
  const init: RequestInit & { duplex: 'half' } = {
    method: request.method,
    headers: new Headers(request.headers),
    body: bounded as BodyInit,
    signal: request.signal,
    duplex: 'half',
  }
  return { kind: 'forward', request: new Request(request.url, init) }
}
