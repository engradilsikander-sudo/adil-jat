// src/lib/supabase/client.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type PublicEnvName = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'
type BrowserSupabaseClient = SupabaseClient<Database>

const isBrowser = typeof window !== 'undefined'

function getRequiredPublicEnv(name: PublicEnvName) {
  const value = import.meta.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`)
  }

  return value
}

function getSupabaseUrl() {
  const value = getRequiredPublicEnv('VITE_SUPABASE_URL')

  try {
    new URL(value)
  } catch {
    throw new Error('VITE_SUPABASE_URL must be a valid URL.')
  }

  return value
}

function getSupabaseAnonKey() {
  const value = getRequiredPublicEnv('VITE_SUPABASE_ANON_KEY')

  if (value.length < 40) {
    throw new Error('VITE_SUPABASE_ANON_KEY looks invalid.')
  }

  const role = readJwtRole(value)

  if (role && role !== 'anon') {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be the Supabase anon public key. Never expose the service-role key in VITE_* variables.',
    )
  }

  return value
}

function readJwtRole(jwt: string) {
  try {
    const [, payload] = jwt.split('.')

    if (!payload) return null

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')

    const parsed = JSON.parse(decoded) as { role?: unknown }

    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

export const supabase: BrowserSupabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      flowType: 'pkce',
      storageKey: 'jas-app-auth',
    },
    global: {
      headers: {
        'X-Client-Info': 'jas-app-browser',
      },
    },
  },
)