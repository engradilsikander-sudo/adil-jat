import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ downstream: vi.fn() }))
vi.mock('@tanstack/react-start/server-entry', () => ({
  default: { fetch: mocks.downstream },
  createServerEntry: (entry: unknown) => entry,
}))
vi.mock('./lib/donation-action', () => ({
  submitDonationAction: { url: '/_serverFn/compiled-donation-action-id', method: 'POST' },
}))

import server from './server'
import { MAX_DONATION_REQUEST_BYTES } from './lib/donation-upload-guard'

const endpoint = 'https://jwas.app/_serverFn/compiled-donation-action-id'
const headers = { 'content-type': 'multipart/form-data; boundary=----r4' }

beforeEach(() => { mocks.downstream.mockReset().mockImplementation(async () => new Response(null, { status: 204 })) })

it('blocks oversize declared donation content before any downstream/server financial action', async () => {
  const incoming = new Request(endpoint, { method: 'POST', headers: { ...headers, 'content-length': String(MAX_DONATION_REQUEST_BYTES + 1) }, body: 'small' })
  const response = await server.fetch(incoming, {} as never)
  expect(response.status).toBe(413)
  expect(mocks.downstream).not.toHaveBeenCalled()
})

it('blocks an over-limit chunked donation body before dispatch or financial writes', async () => {
  let n = 0
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      if (n++ >= 25) c.close()
      else c.enqueue(new Uint8Array(128 * 1024))
    },
  })
  const incoming = new Request(endpoint, { method: 'POST', headers, body, duplex: 'half' } as RequestInit)
  const response = await server.fetch(incoming, {} as never)
  expect(response.status).toBe(413)
  expect(mocks.downstream).not.toHaveBeenCalled()
})

it('passes bounded donation multipart into the original Start dispatcher', async () => {
  const form = new FormData()
  form.set('donorName', 'Genuine Donor')
  form.set('receipt', new File([new Uint8Array(2 * 1024 * 1024)], 'receipt.pdf', { type: 'application/pdf' }))
  const response = await server.fetch(new Request(endpoint, { method: 'POST', body: form }), {} as never)
  expect(response.status).toBe(204)
  expect(mocks.downstream).toHaveBeenCalledTimes(1)
  const boundedRequest = mocks.downstream.mock.calls[0]![0] as Request
  const restored = await boundedRequest.formData()
  expect(restored.get('donorName')).toBe('Genuine Donor')
  expect((restored.get('receipt') as File).size).toBe(2 * 1024 * 1024)
})

it('does not consume or alter non-donation request bodies', async () => {
  const incoming = new Request('https://jwas.app/_serverFn/unrelated-upload', { method: 'POST', headers, body: new Uint8Array(MAX_DONATION_REQUEST_BYTES + 1) })
  const response = await server.fetch(incoming, {} as never)
  expect(response.status).toBe(204)
  expect(mocks.downstream.mock.calls[0]![0]).toBe(incoming)
  expect(incoming.bodyUsed).toBe(false)
})
