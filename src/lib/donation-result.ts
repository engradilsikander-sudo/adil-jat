export type DonationErrorCode = 'validation' | 'receipt' | 'session' | 'captcha' | 'rate_limit' | 'unavailable' | 'conflict' | 'unconfirmed'
export const donationErrorMessages: Record<DonationErrorCode, string> = {
  validation: 'This attempt was not submitted. Check your name, contact, amount, electronic payment method and transaction reference. Cash is not accepted through this form.',
  receipt: 'This attempt was not submitted. Use a nonempty PDF, JPG, PNG or WEBP receipt with matching file contents, at most 2 MiB.',
  session: 'This attempt was not submitted. Your session could not be verified. Sign in to the same account before recovering a previous submission.',
  captcha: 'This attempt was not submitted. Complete a fresh security check and retry with the same details and receipt.',
  rate_limit: 'This attempt was not submitted. Too many submissions. Wait up to one hour, then complete a fresh security check and retry with the same details and receipt.',
  unavailable: 'This attempt was not submitted. The donation service is temporarily unavailable. Keep the draft and retry later.',
  conflict: 'This key was already received with different details or receipt content. Restore the original details and receipt. Do not create a new attempt to recover this donation.',
  unconfirmed: 'Submission could not be confirmed. It may already be saved. Keep this draft and retry with the same details and original receipt; do not start a new donation.',
}
export class DonationSubmissionError extends Error {
  constructor(public readonly code: DonationErrorCode) { super(donationErrorMessages[code]) }
}
export type DonationSubmissionResult =
  | { ok: true; donationNo: string; status: 'pending' }
  | { ok: false; code: DonationErrorCode; outcome: 'not_submitted' | 'unconfirmed'; message: string }

export function donationFailure(error: unknown): Extract<DonationSubmissionResult, { ok: false }> {
  const code = error instanceof DonationSubmissionError ? error.code : 'unconfirmed'
  return { ok: false, code, outcome: code === 'conflict' || code === 'unconfirmed' ? 'unconfirmed' : 'not_submitted', message: donationErrorMessages[code] }
}
