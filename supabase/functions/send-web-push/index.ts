// Supabase Edge Function: send-web-push
//
// Protected worker for the durable public.web_push_deliveries queue.
// Deploy with --no-verify-jwt and require X-Push-Secret on every invocation.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type WebPushJob = {
  delivery_id: string
  notification_id: string
  user_id: string
  subscription_id: string
  endpoint: string
  p256dh: string
  auth: string
  title: string
  message: string
  category: string
  action_url: string | null
  attempts: number
}

type PushError = Error & {
  statusCode?: number
  body?: string
}

const DEFAULT_BATCH_SIZE = 20
const MAX_BATCH_SIZE = 50
const DEFAULT_MAX_PER_MINUTE = 120
const MAX_CONFIGURED_RATE = 500
const SEND_CONCURRENCY = 5

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function parseBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(minimum, Math.min(maximum, Math.floor(parsed)))
}

function cleanActionUrl(value: unknown) {
  if (typeof value !== 'string') return '/notifications'
  const trimmed = value.trim()

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return '/notifications'
  }

  return trimmed.slice(0, 300)
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.replace(/\s+/g, ' ').trim()
  return trimmed ? trimmed.slice(0, maxLength) : fallback
}

function getStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') return 0
  const status = Number((error as PushError).statusCode)
  return Number.isFinite(status) ? status : 0
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500
}

function shouldDisableSubscription(status: number) {
  return status === 404 || status === 410
}

function deliveryErrorMessage(status: number) {
  if (status === 404 || status === 410) {
    return 'Push subscription expired and was disabled.'
  }
  if (status === 429) return 'Push provider rate limit reached.'
  if (status >= 500) return `Push provider temporary failure (HTTP ${status}).`
  if (status > 0) return `Push provider rejected delivery (HTTP ${status}).`
  return 'Push provider network request failed.'
}

function secureEquals(provided: string, expected: string) {
  if (!provided || provided.length !== expected.length) return false
  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return mismatch === 0
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function processInChunks<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += concurrency) {
    const chunk = items.slice(index, index + concurrency)
    await Promise.all(chunk.map(worker))
  }
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Headers': 'content-type, x-push-secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': 'null',
      },
    })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const workerSecret = getRequiredEnv('PUSH_SEND_SECRET')
    const providedSecret = request.headers.get('x-push-secret') || ''

    if (!secureEquals(providedSecret, workerSecret)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const vapidPublicKey = getRequiredEnv('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = getRequiredEnv('VAPID_PRIVATE_KEY')
    const vapidSubject = getRequiredEnv('VAPID_SUBJECT')
    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const body = (await request.json().catch(() => ({}))) as {
      batch_size?: number
      max_per_minute?: number
    }

    const batchSize = parseBoundedInteger(
      body.batch_size,
      DEFAULT_BATCH_SIZE,
      1,
      MAX_BATCH_SIZE,
    )
    const envRate = parseBoundedInteger(
      Deno.env.get('PUSH_MAX_SENDS_PER_MINUTE'),
      DEFAULT_MAX_PER_MINUTE,
      1,
      MAX_CONFIGURED_RATE,
    )
    const maxPerMinute = parseBoundedInteger(
      body.max_per_minute,
      envRate,
      1,
      envRate,
    )
    const workerId = crypto.randomUUID()

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data, error: claimError } = await supabase.rpc(
      'claim_web_push_deliveries',
      {
        _limit: batchSize,
        _max_per_minute: maxPerMinute,
        _worker_id: workerId,
      },
    )

    if (claimError) throw claimError

    const jobs = (data || []) as WebPushJob[]
    const result = {
      claimed: jobs.length,
      sent: 0,
      retry_pending: 0,
      dead: 0,
      stale: 0,
    }

    await processInChunks(jobs, SEND_CONCURRENCY, async (job) => {
      const payload = JSON.stringify({
        title: cleanText(job.title, 'JAS Update', 80),
        body: cleanText(
          job.message,
          'You have a new update in the JAS member portal.',
          220,
        ),
        url: cleanActionUrl(job.action_url),
        notification_id: job.notification_id,
        tag: `jas-${job.notification_id}`,
      })

      try {
        await webpush.sendNotification(
          {
            endpoint: job.endpoint,
            keys: {
              p256dh: job.p256dh,
              auth: job.auth,
            },
          },
          payload,
          {
            TTL: 60 * 60 * 24,
            urgency: 'normal',
          },
        )

        const { data: marked, error: markError } = await supabase.rpc(
          'mark_web_push_delivery_sent',
          {
            _delivery_id: job.delivery_id,
            _expected_attempt: job.attempts,
          },
        )

        if (markError) throw markError
        if (marked) result.sent += 1
        else result.stale += 1
      } catch (error) {
        const status = getStatusCode(error)
        const retryable = isRetryableStatus(status)
        const disableSubscription = shouldDisableSubscription(status)

        const { data: deliveryStatus, error: markError } = await supabase.rpc(
          'mark_web_push_delivery_failed',
          {
            _delivery_id: job.delivery_id,
            _expected_attempt: job.attempts,
            _http_status: status || null,
            _reason: deliveryErrorMessage(status),
            _retryable: retryable,
            _disable_subscription: disableSubscription,
          },
        )

        if (markError) {
          console.error('Unable to persist web push failure state', {
            deliveryId: job.delivery_id,
            message: markError.message,
          })
          result.stale += 1
          return
        }

        if (deliveryStatus === 'failed') result.retry_pending += 1
        else if (deliveryStatus === 'dead') result.dead += 1
        else result.stale += 1
      }
    })

    return jsonResponse({
      ok: true,
      worker_id: workerId,
      rate_limit_per_minute: maxPerMinute,
      ...result,
    })
  } catch (error) {
    console.error('send-web-push worker failed', {
      message: error instanceof Error ? error.message : 'Unknown error',
    })

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
