#!/usr/bin/env node
/** R6.2-P1: read-only JWAS production release gate. It never prints env values. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const EXPECTED_SUPABASE = 'https://grnwtiqwivtwxkaqryve.supabase.co'
const OFFICIAL_ORIGIN = 'https://jwas.app'
const EXPECTED_CURRENT_FEE = '500'

export function parseEnvText(source) {
  const parsed = {}
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) throw new Error(`Malformed env-file line ${index + 1}; no values were printed.`)
    const [, name, raw] = match
    if (Object.hasOwn(parsed, name)) throw new Error(`Duplicate env variable ${name}`)
    const unquoted = raw.trim().replace(/^(['"])([\s\S]*)\1$/, '$2')
    parsed[name] = unquoted
  }
  return parsed
}

function isExpectedOrigin(raw, expected) {
  try {
    const u = new URL(raw)
    return u.origin === expected && u.pathname.replace(/\/+$/, '') === '' && !u.search && !u.hash && !u.username && !u.password
  } catch { return false }
}

export function checkProductionConfig(env, { projectRoot = process.cwd() } = {}) {
  const errors = [], warnings = [], passes = []
  const block = (id, description) => errors.push({ id, description })
  const pass = (id, description) => passes.push({ id, description })

  const publicOrigin = env.VITE_PUBLIC_SITE_URL || env.VITE_SITE_URL || env.VITE_APP_URL || OFFICIAL_ORIGIN
  if (!isExpectedOrigin(publicOrigin, OFFICIAL_ORIGIN)) block('public-origin', 'Public verification origin is not official JWAS domain (jwas.app).')
  else pass('public-origin', 'JWAS public verification origin is aligned.')

  for (const name of ['VITE_SUPABASE_URL', 'SUPABASE_URL']) {
    if (!isExpectedOrigin(env[name], EXPECTED_SUPABASE)) block(name, `${name} is missing or does not target migrated JWAS Supabase project.`)
    else pass(name, `${name} targets migrated JWAS Supabase project.`)
  }
  const publicKey = env.VITE_SUPABASE_ANON_KEY || ''
  const isPublishableKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey)
  const jwtRole = (() => {
    try { return JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8')).role }
    catch { return null }
  })()
  if (publicKey.length < 40 || (!isPublishableKey && jwtRole !== 'anon')) {
    block('anon-key', 'Browser key must be a Supabase publishable key or JWT with anon role; never a secret/service-role key.')
  } else {
    pass('anon-key', 'Public anon/publishable browser key format is valid (no secret value displayed).')
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.length < 40) {
    block('server-key', 'SUPABASE_SERVICE_ROLE_KEY is missing or too short.')
  } else if (env.SUPABASE_SERVICE_ROLE_KEY === env.VITE_SUPABASE_ANON_KEY) {
    block('server-key', 'Server service-role key must not equal the public browser key.')
  } else pass('server-key', 'Server-only service-role key is configured (value not disclosed).')

  const bank = env.VITE_MEMBERSHIP_PAYMENT_NETWORK?.trim() || ''
  const title = env.VITE_MEMBERSHIP_PAYMENT_ACCOUNT_TITLE?.trim() || ''
  const acct = (env.VITE_MEMBERSHIP_PAYMENT_ACCOUNT_NUMBER || '').replace(/[\s-]/g, '')
  const verified = env.VITE_MEMBERSHIP_PAYMENT_DETAILS_VERIFIED === 'true'
  const iban = (env.VITE_MEMBERSHIP_PAYMENT_IBAN || '').replace(/\s/g, '').toUpperCase()
  const ibanOkay = (() => {
    if (!iban) return true
    if (!/^PK\d{2}[A-Z0-9]{20}$/.test(iban)) return false
    const reordered = iban.slice(4) + iban.slice(0, 4)
    let remainder = 0
    for (const char of reordered) {
      const digits = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char
      for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
    }
    return remainder === 1
  })()
  if (!verified || !bank || bank.length > 60 || !title || title.length > 100 || /^(test|example|your name|account holder|placeholder)$/i.test(title) || !/^\d{10,24}$/.test(acct) || /^(\d)\1+$/.test(acct) || acct.includes('123456789') || acct.includes('987654321') || (/easypaisa|jazzcash/i.test(bank) && !/^03\d{9}$/.test(acct)) || !ibanOkay) {
    block('payment-account', 'Public payment destination is missing, placeholder-like or not operator-verified.')
  } else pass('payment-account', 'Payment destination is explicitly configured and marked operator-verified.')

  if (env.VITE_MEMBERSHIP_PAYMENT_QR_VERIFIED !== 'true') block('payment-qr', 'Payment QR has not been approved against the displayed account.')
  else if (!fs.existsSync(path.join(projectRoot, 'public/jas/membership-payment-qr.jpg'))) block('payment-qr', 'Approved payment QR image is missing from repository.')
  else pass('payment-qr', 'QR verification flag and QR asset both present (manual QR/account comparison still required).')

  if (env.JWAS_APPROVED_NEW_FEE_PKR !== EXPECTED_CURRENT_FEE) {
    block('fee-policy', 'Current PKR 500 new-payment fee has not received matching written release approval; historical PKR 600 must remain intact.')
  } else pass('fee-policy', 'Current new-payment fee explicitly acknowledged as PKR 500; historical fees remain separate.')

  warnings.push({ id: 'acceptance', description: 'Live Super Admin/member login, private signed Storage URLs and QR scan still require real browser acceptance.' })
  warnings.push({ id: 'historical-pending', description: 'Three approved legacy members have pending payments; do not auto-mark paid.' })
  return { ok: errors.length === 0, errors, warnings, passes }
}

export function runCli(argv = process.argv.slice(2)) {
  let env = { ...process.env }
  const at = argv.indexOf('--env-file')
  if (at !== -1) {
    const filename = argv[at + 1]
    if (!filename || filename.startsWith('--')) throw new Error('--env-file requires a readable path')
    env = { ...env, ...parseEnvText(fs.readFileSync(filename, 'utf8')) }
    argv = [...argv.slice(0, at), ...argv.slice(at + 2)]
  }
  if (argv.length) throw new Error(`Unsupported option: ${argv[0]}`)
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const result = checkProductionConfig(env, { projectRoot: root })
  console.log('JWAS R6.2-P1 — read-only production gate (values redacted)')
  for (const item of result.passes) console.log(`PASS: ${item.id} — ${item.description}`)
  for (const item of result.warnings) console.log(`REVIEW: ${item.id} — ${item.description}`)
  for (const item of result.errors) console.error(`BLOCK: ${item.id} — ${item.description}`)
  console.log(`RESULT: ${result.ok ? 'CONFIGURATION_PASS (browser acceptance pending)' : 'DO_NOT_DEPLOY'}`)
  if (!result.ok) process.exitCode = 1
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runCli() } catch (error) {
    console.error(`BLOCK: production preflight failed (${error instanceof Error ? error.message : 'unknown error'}).`)
    process.exitCode = 1
  }
}
