import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { getRequestHeader } from '@tanstack/react-start/server'
import { createSupabaseAdminClient } from '../supabase/admin'

export function verificationClientKey(vercel: boolean, ip: string | undefined, secret: string, day: string) {
  // Only trust this platform header when actually running on Vercel.
  if (!vercel || !ip || !isIP(ip.trim())) return 'shared-nonvercel'
  return createHmac('sha256', secret).update(`${day}:${ip.trim()}`).digest('hex')
}
export async function enforceVerificationBudget(resource: string) {
  const client = createSupabaseAdminClient()
  const onVercel = process.env.VERCEL === '1'
  const key = verificationClientKey(onVercel, onVercel ? getRequestHeader('x-vercel-forwarded-for') : undefined,
    process.env.SUPABASE_SERVICE_ROLE_KEY || '', new Date().toISOString().slice(0, 10))
  const { data, error } = await client.rpc('consume_verification_budget_v2', { _resource: resource, _client: key })
  if (error) throw new Error('VERIFY_UNAVAILABLE')
  if (data !== true) throw new Error('VERIFY_RATE_LIMITED')
  return client
}
