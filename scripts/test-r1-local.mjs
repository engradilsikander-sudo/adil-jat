// Reads only local-stack credentials; never prints or persists keys.
import { execFileSync, spawnSync } from 'node:child_process'
const status = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname)) throw new Error('Local stack required')
const env = { ...process.env, SUPABASE_URL: status.API_URL, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, VITE_SUPABASE_URL: status.API_URL, VITE_SUPABASE_ANON_KEY: status.ANON_KEY, R1_LOCAL_INTEGRATION: 'true', DONATION_LOCAL_TEST: 'true' }
const args = process.argv.includes('--mobile') ? ['playwright', 'test', '--project=mobile'] : ['vitest', 'run', 'src/lib/donation-local.integration.test.ts']
const result = spawnSync('npx', args, { env, stdio: 'inherit' })
process.exit(result.status ?? 1)
