import { describe, expect, it } from 'vitest'
import {
  guardDonationUploadRequest,
  isDonationUploadRequest,
  MAX_DONATION_REQUEST_BYTES,
} from './donation-upload-guard'

const action = '/_serverFn/compiled-donation-action-id'
const endpoint = `https://jwas.app${action}`
const multipart = 'multipart/form-data; boundary=----jwastest'

function request(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request(endpoint, {
    method: 'POST',
    headers: { 'content-type': multipart, origin: 'https://jwas.app', ...headers },
    body,
    // Node fetch requires duplex for a streaming request body.
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as RequestInit)
}

function stream(parts: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === parts.length) controller.close()
      else controller.enqueue(parts[index++]!)
    },
  })
}

async function responseStatus(body: BodyInit, headers: Record<string, string> = {}) {
  const gate = await guardDonationUploadRequest(request(body, headers), action)
  if (gate.kind !== 'reject') throw new Error('Expected request rejection')
  return gate.response.status
}

describe('R1.3-r4 pre-parser donation upload guard', () => {
  it('recognizes only the exact POST donation server function', () => {
    const upload = request('hello')
    expect(isDonationUploadRequest(upload, action)).toBe(true)
    expect(isDonationUploadRequest(new Request(endpoint + '/other', { method: 'POST' }), action)).toBe(false)
    expect(isDonationUploadRequest(new Request(endpoint, { method: 'GET' }), action)).toBe(false)
    expect(isDonationUploadRequest(new Request('https://jwas.app/_serverFn/other', { method: 'POST' }), action)).toBe(false)
    expect(isDonationUploadRequest(new Request(endpoint + '?foo=1', { method: 'POST' }), action)).toBe(true)
  })

  it('rejects oversized declared Content-Length without reading even the first byte', async () => {
    let reads = 0
    const body = new ReadableStream<Uint8Array>({ pull(c) { reads++; c.enqueue(new Uint8Array(16)); c.close() } }, { highWaterMark: 0 })
    const response = await guardDonationUploadRequest(request(body, { 'content-length': String(MAX_DONATION_REQUEST_BYTES + 1) }), action)
    expect(response.kind).toBe('reject')
    if (response.kind === 'reject') expect(response.response.status).toBe(413)
    expect(reads).toBe(0)
  })

  it('rejects chunked/unknown-length bodies as soon as the stream exceeds 3 MiB', async () => {
    const parts = Array.from({ length: 25 }, () => new Uint8Array(128 * 1024))
    expect(await responseStatus(stream(parts))).toBe(413)
  })

  it('rejects dishonest Content-Length even when it claims a smaller request', async () => {
    const parts = Array.from({ length: 25 }, () => new Uint8Array(128 * 1024))
    expect(await responseStatus(stream(parts), { 'content-length': '100' })).toBe(413)
    expect(await responseStatus(new Uint8Array(200), { 'content-length': '100' })).toBe(400)
  })

  it('rejects invalid/overflowing Content-Length, bad type, and encoded bodies', async () => {
    for (const value of ['-1', 'NaN', '3.14', '100, 100', '99999999999999999999']) {
      expect(await responseStatus(new Uint8Array(20), { 'content-length': value })).toBe(value.startsWith('999') ? 413 : 400)
    }
    const wrongType = new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const deniedType = await guardDonationUploadRequest(wrongType, action)
    expect(deniedType.kind === 'reject' && deniedType.response.status).toBe(415)
    expect(await responseStatus(new Uint8Array(1), { 'content-encoding': 'gzip' })).toBe(415)
  })

  it('allows a real multipart form with a 2 MiB receipt and preserves bytes', async () => {
    const original = new FormData()
    original.set('donorName', 'Public Test Donor')
    original.set('amount', '123.45')
    original.set('receipt', new File([new Uint8Array(2 * 1024 * 1024)], 'receipt.pdf', { type: 'application/pdf' }))
    const incoming = new Request(endpoint, { method: 'POST', body: original, headers: { origin: 'https://jwas.app' } })
    const result = await guardDonationUploadRequest(incoming, action)
    expect(result.kind).toBe('forward')
    if (result.kind !== 'forward') return
    expect(result.request.headers.get('origin')).toBe('https://jwas.app')
    expect(result.request.url).toBe(endpoint)
    const restored = await result.request.formData()
    expect(restored.get('donorName')).toBe('Public Test Donor')
    expect(restored.get('amount')).toBe('123.45')
    expect((restored.get('receipt') as File).size).toBe(2 * 1024 * 1024)
  })

  it('accepts a Nitro-style Request facade without native private state', async () => {
    // The actual Nitro SSR entry can hand us a Request-like facade. Its
    // properties work, but new Request(facade) accesses Undici private state.
    const native = request(new Uint8Array([37, 80, 68, 70, 45]), {
      cookie: 'session=fake-test-cookie',
      origin: 'https://jwas.app',
    })
    const facade = Object.create(Request.prototype) as Request
    for (const key of ['url', 'method', 'headers', 'body', 'signal'] as const) {
      Object.defineProperty(facade, key, {
        configurable: true,
        enumerable: true,
        value: native[key],
      })
    }
    const result = await guardDonationUploadRequest(facade, action)
    expect(result.kind).toBe('forward')
    if (result.kind !== 'forward') return
    expect(result.request.url).toBe(endpoint)
    expect(result.request.method).toBe('POST')
    expect(result.request.headers.get('cookie')).toBe('session=fake-test-cookie')
    expect(result.request.headers.get('origin')).toBe('https://jwas.app')
    expect(result.request.headers.get('content-type')).toBe(multipart)
    expect(new Uint8Array(await result.request.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70, 45]))
  })

  it('accepts exactly 3 MiB and leaves non-donation uploads untouched', async () => {
    const exact = await guardDonationUploadRequest(request(stream([new Uint8Array(MAX_DONATION_REQUEST_BYTES)])), action)
    expect(exact.kind).toBe('forward')
    if (exact.kind === 'forward') expect((await exact.request.arrayBuffer()).byteLength).toBe(MAX_DONATION_REQUEST_BYTES)
    const unrelated = new Request('https://jwas.app/_serverFn/other', {
      method: 'POST',
      body: new Uint8Array(MAX_DONATION_REQUEST_BYTES + 1),
      headers: { 'content-type': multipart },
    })
    const other = await guardDonationUploadRequest(unrelated, action)
    expect(other).toEqual({ kind: 'forward', request: unrelated })
    expect(unrelated.bodyUsed).toBe(false)
  })
})
