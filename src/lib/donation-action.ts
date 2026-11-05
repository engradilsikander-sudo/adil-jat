import { createServerFn } from '@tanstack/react-start'

export const submitDonationAction = createServerFn({ method: 'POST' })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error('Invalid donation submission.')
    return data
  })
  .handler(async ({ data }) => {
    const { submitDonation } = await import('./donation-submit.server')
    return submitDonation(data)
  })
