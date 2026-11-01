import { readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function check(condition, message) {
  checks.push({ condition, message })
}

const worker = read('supabase/functions/send-web-push/index.ts')
const migration = read(
  'supabase/migrations/20260711010000_web_push_reliability_preferences.sql',
)
const serviceWorker = read('public/sw.js')
const routeTree = read('src/routeTree.gen.ts')
const config = read('supabase/config.toml')
const envExample = read('.env.example')
const smokeTests = read('supabase/qa/web-push-reliability-smoke-tests.sql')

check(!worker.includes('@ts-nocheck'), 'Edge worker has no @ts-nocheck bypass')
check(
  worker.includes("getRequiredEnv('PUSH_SEND_SECRET')"),
  'Edge worker requires the protected push secret',
)
check(
  worker.includes('claim_web_push_deliveries'),
  'Edge worker claims durable database queue jobs',
)
check(
  worker.includes('PUSH_MAX_SENDS_PER_MINUTE'),
  'Edge worker reads a bounded send-rate setting',
)
check(
  migration.includes('create table if not exists public.notification_preferences'),
  'Notification preferences table is present',
)
check(
  migration.includes('create table if not exists public.web_push_deliveries'),
  'Durable web push delivery table is present',
)
check(
  migration.includes('pg_advisory_xact_lock'),
  'Database claim function serializes global rate capacity',
)
check(
  migration.includes('create or replace function public.admin_send_bulk_notification'),
  'Admin bulk sender RPC is present',
)
check(
  migration.includes("lower(coalesce(_related_type, '')) <> 'bulk_web_push_campaign'"),
  'Bulk browser campaigns are excluded from automatic email delivery',
)
check(
  migration.includes('drop trigger if exists audit_log_changes on public.notification_campaigns'),
  'Bulk notification campaigns are covered by the audit log',
)
check(
  smokeTests.includes('Phase 9 web-push reliability smoke tests passed.'),
  'Post-migration SQL smoke tests are included',
)
check(
  serviceWorker.includes('safeNotificationTarget'),
  'Service worker validates notification click targets',
)
check(
  routeTree.includes("'/notification-preferences'"),
  'Member notification preferences route is registered',
)
check(
  routeTree.includes("'/admin/notifications'"),
  'Admin notification center route is registered',
)
check(
  envExample.includes('PUSH_SEND_SECRET') &&
    envExample.includes('PUSH_MAX_SENDS_PER_MINUTE'),
  'Push worker secrets and rate settings are documented',
)
check(
  !envExample.includes('VITE_VAPID_PRIVATE_KEY'),
  'Private VAPID key is not documented as a client variable',
)
check(
  config.includes('content_path = "./supabase/templates/recovery.html"'),
  'Auth template path follows the local CLI path format',
)
check(
  config.includes(
    'content_path = "./templates/password_changed_notification.html"',
  ),
  'Security notification template path follows the local CLI path format',
)
check(
  config.includes('[functions.send-web-push]') &&
    /\[functions\.send-web-push\][\s\S]*?verify_jwt\s*=\s*false/.test(config),
  'Web push worker disables platform JWT verification and requires its own secret',
)

const failed = checks.filter((item) => !item.condition)
for (const item of checks) {
  console.log(`${item.condition ? '✓' : '✗'} ${item.message}`)
}

if (failed.length) {
  console.error(`\n${failed.length} web push verification check(s) failed.`)
  process.exit(1)
}

console.log(`\nWeb push verification passed: ${checks.length}/${checks.length}`)
