import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  JAS_EMAIL_BRAND,
  renderNotificationEmail,
} from '../_shared/notification-email.ts'

type EmailJob = {
  delivery_id: string
  notification_id: string
  user_id: string
  title: string
  message: string
  category: string
  related_type: string | null
  action_url: string | null
  attempts: number
}

type BrevoResponse = {
  messageId?: string
  code?: string
  message?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function validWorkerSecret(request: Request) {
  const expected = Deno.env.get('EMAIL_WORKER_SECRET') || ''
  const provided = request.headers.get('x-email-worker-secret') || ''
  return expected.length >= 24 && provided.length === expected.length && provided === expected
}

function parseBatchSize(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return 20
  return Math.max(1, Math.min(Math.trunc(parsed), 50))
}

function redactError(value: unknown) {
  const text = value instanceof Error ? value.message : String(value || 'Unknown email error')
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email-redacted]')
    .replace(/(api-key|authorization|bearer)\s*[:=]?\s*[^\s,;]+/gi, '$1 [redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 450)
}

async function markJob(
  supabase: ReturnType<typeof createClient>,
  fn:
    | 'mark_notification_email_sent'
    | 'mark_notification_email_skipped'
    | 'mark_notification_email_failed',
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message}`)
}

async function sendWithBrevo(input: {
  apiKey: string
  senderName: string
  senderEmail: string
  recipientEmail: string
  recipientName: string
  subject: string
  htmlContent: string
  textContent: string
  notificationId: string
  sandbox: boolean
}) {
  const payload = {
    sender: {
      name: input.senderName,
      email: input.senderEmail,
    },
    replyTo: {
      name: input.senderName,
      email: input.senderEmail,
    },
    to: [
      {
        email: input.recipientEmail,
        name: input.recipientName,
      },
    ],
    subject: input.subject,
    htmlContent: input.htmlContent,
    textContent: input.textContent,
    headers: {
      'X-JAS-Notification-ID': input.notificationId,
      ...(input.sandbox ? { 'X-Sib-Sandbox': 'drop' } : {}),
    },
    tags: ['jas-member-portal', 'transactional-notification'],
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': input.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responseBody = (await response.json().catch(() => ({}))) as BrevoResponse
  if (!response.ok) {
    const detail = responseBody.message || responseBody.code || response.statusText
    const error = new Error(`Brevo HTTP ${response.status}: ${detail}`)
    ;(error as Error & { retryable?: boolean }).retryable =
      response.status === 408 || response.status === 429 || response.status >= 500
    throw error
  }

  return responseBody.messageId || null
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  if (!validWorkerSecret(request)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL')
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const brevoApiKey = requiredEnv('BREVO_API_KEY')
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')?.trim() || JAS_EMAIL_BRAND.senderEmail
    const senderName = Deno.env.get('BREVO_SENDER_NAME')?.trim() || JAS_EMAIL_BRAND.senderName
    const siteUrl = Deno.env.get('PUBLIC_SITE_URL')?.trim() || JAS_EMAIL_BRAND.defaultSiteUrl
    const sandbox = Deno.env.get('BREVO_SANDBOX_MODE')?.trim().toLowerCase() === 'true'
    const body = await request.json().catch(() => ({}))
    const batchSize = parseBatchSize(body?.batch_size)

    if (!EMAIL_RE.test(senderEmail)) {
      throw new Error('BREVO_SENDER_EMAIL is invalid')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: jobs, error: claimError } = await supabase.rpc(
      'claim_notification_email_jobs',
      { _limit: batchSize },
    )

    if (claimError) throw new Error(`Unable to claim email jobs: ${claimError.message}`)

    const summary = {
      claimed: Array.isArray(jobs) ? jobs.length : 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      dead: 0,
      sandbox,
    }

    for (const job of (jobs || []) as EmailJob[]) {
      try {
        const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(job.user_id)
        if (userError) throw new Error(`Unable to resolve notification recipient: ${userError.message}`)

        const recipientEmail = userResult.user?.email?.trim().toLowerCase() || ''
        if (!EMAIL_RE.test(recipientEmail)) {
          await markJob(supabase, 'mark_notification_email_skipped', {
            _delivery_id: job.delivery_id,
            _expected_attempt: job.attempts,
            _reason: 'Recipient account does not have a deliverable email address.',
          })
          summary.skipped += 1
          continue
        }

        const { data: member } = await supabase
          .from('members')
          .select('full_name')
          .eq('user_id', job.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const metadataName =
          typeof userResult.user?.user_metadata?.full_name === 'string'
            ? userResult.user.user_metadata.full_name
            : null
        const recipientName = member?.full_name || metadataName || 'JAS Member'
        const content = renderNotificationEmail({
          recipientName,
          title: job.title,
          message: job.message,
          actionPath: job.action_url,
          siteUrl,
        })

        const providerMessageId = await sendWithBrevo({
          apiKey: brevoApiKey,
          senderName,
          senderEmail,
          recipientEmail,
          recipientName,
          subject: content.subject,
          htmlContent: content.htmlContent,
          textContent: content.textContent,
          notificationId: job.notification_id,
          sandbox,
        })

        await markJob(supabase, 'mark_notification_email_sent', {
          _delivery_id: job.delivery_id,
          _expected_attempt: job.attempts,
          _provider_message_id: providerMessageId,
        })
        summary.sent += 1
      } catch (error) {
        const retryable = (error as Error & { retryable?: boolean }).retryable !== false
        const { data: status, error: markError } = await supabase.rpc(
          'mark_notification_email_failed',
          {
            _delivery_id: job.delivery_id,
            _expected_attempt: job.attempts,
            _reason: redactError(error),
            _retryable: retryable,
          },
        )

        if (markError) {
          console.error('Unable to mark notification email failure', markError.message)
        }

        if (status === 'dead') summary.dead += 1
        else summary.failed += 1
      }
    }

    return json(summary)
  } catch (error) {
    console.error('send-notification-emails worker failed', redactError(error))
    return json({ error: 'Notification email worker failed.' }, 500)
  }
})
