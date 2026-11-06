import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { submitDonationAction } from './lib/donation-action'
import { guardDonationUploadRequest } from './lib/donation-upload-guard'

/**
 * Pre-parser guard for the exact compiled donation server-function URL.
 * Request middleware and server-function validators run too late: Start's
 * multipart dispatcher has already called request.formData() by then.
 * Other routes and server functions are delegated unchanged.
 */
export default createServerEntry({
  async fetch(request, opts) {
    const gate = await guardDonationUploadRequest(request, submitDonationAction.url)
    if (gate.kind === 'reject') return gate.response
    return handler.fetch(gate.request, opts)
  },
})
