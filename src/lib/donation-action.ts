import { createServerFn } from '@tanstack/react-start'

export const submitDonationAction = createServerFn({ method: 'POST' })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const { submitDonationResult } = await import('./donation-submit.server')
    return submitDonationResult(data)
  })
