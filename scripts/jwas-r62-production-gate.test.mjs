import test from 'node:test'
import assert from 'node:assert/strict'
import { checkProductionConfig, parseEnvText } from './jwas-r62-production-gate.mjs'
const root = new URL('..', import.meta.url).pathname
const valid = {
  VITE_PUBLIC_SITE_URL: 'https://jwas.app',
  VITE_SUPABASE_URL: 'https://grnwtiqwivtwxkaqryve.supabase.co',
  SUPABASE_URL: 'https://grnwtiqwivtwxkaqryve.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_TEST_KEY_1234567890_1234567890_1234567',
  SUPABASE_SERVICE_ROLE_KEY: 'TEST_ONLY_SERVER_KEY_1234567890_1234567890_1234567890',
  VITE_MEMBERSHIP_PAYMENT_NETWORK: 'Easypaisa',
  VITE_MEMBERSHIP_PAYMENT_ACCOUNT_TITLE: 'Verified Organization Treasurer',
  VITE_MEMBERSHIP_PAYMENT_ACCOUNT_NUMBER: '03001234567',
  VITE_MEMBERSHIP_PAYMENT_DETAILS_VERIFIED: 'true',
  VITE_MEMBERSHIP_PAYMENT_QR_VERIFIED: 'true',
  JWAS_APPROVED_NEW_FEE_PKR: '500',
}
const check = x => checkProductionConfig({ ...valid, ...x }, { projectRoot: root })
test('source env parser never evaluates shell commands and handles quotes', () => {
  const input = parseEnvText('FOO="bar baz"\nexport FEE=500\n# ignored\n')
  assert.deepEqual(input, { FOO:'bar baz', FEE:'500' })
  assert.throws(() => parseEnvText('FOO=a\nFOO=b'), /Duplicate/)
  assert.throws(() => parseEnvText('garbage'), /Malformed/)
})
test('approved JWAS configuration passes without treating browser acceptance as complete', () => {
  const result = check({})
  assert.equal(result.ok, true)
  assert.equal(result.warnings.length, 2)
})
test('old JAS domain is blocked', () => assert.ok(check({ VITE_PUBLIC_SITE_URL:'https://jasofficial.org' }).errors.some(e => e.id === 'public-origin')))
test('lookalike site origin is blocked', () => assert.ok(check({ VITE_PUBLIC_SITE_URL:'https://jwas.app.attacker.test' }).errors.some(e => e.id === 'public-origin')))
test('redirect/path site origin is blocked', () => assert.ok(check({ VITE_PUBLIC_SITE_URL:'https://jwas.app/fake' }).errors.some(e => e.id === 'public-origin')))
test('wrong client project blocked', () => assert.ok(check({ VITE_SUPABASE_URL:'https://another.supabase.co' }).errors.some(e => e.id === 'VITE_SUPABASE_URL')))
test('wrong server project blocked', () => assert.ok(check({ SUPABASE_URL:'https://another.supabase.co' }).errors.some(e => e.id === 'SUPABASE_URL')))
test('missing payment verification blocked', () => assert.ok(check({ VITE_MEMBERSHIP_PAYMENT_DETAILS_VERIFIED:'false' }).errors.some(e => e.id === 'payment-account')))
test('placeholder account blocked', () => assert.ok(check({ VITE_MEMBERSHIP_PAYMENT_ACCOUNT_NUMBER:'123456789' }).errors.some(e => e.id === 'payment-account')))
test('unverified QR blocked', () => assert.ok(check({ VITE_MEMBERSHIP_PAYMENT_QR_VERIFIED:'false' }).errors.some(e => e.id === 'payment-qr')))
test('unapproved future fee blocked', () => assert.ok(check({ JWAS_APPROVED_NEW_FEE_PKR:'700' }).errors.some(e => e.id === 'fee-policy')))
test('browser admin key exposure blocked', () => assert.ok(check({ VITE_SUPABASE_ANON_KEY:'sb_secret_012345678901234567890123456789012345' }).errors.some(e => e.id === 'anon-key')))
test('invalid IBAN blocked even if payment destination is acknowledged', () => assert.ok(check({ VITE_MEMBERSHIP_PAYMENT_IBAN:'PK123456789' }).errors.some(e => e.id === 'payment-account')))
test('generic placeholder title blocked', () => assert.ok(check({ VITE_MEMBERSHIP_PAYMENT_ACCOUNT_TITLE:'Test' }).errors.some(e => e.id === 'payment-account')))
test('JWT with service_role is blocked even without sb_secret prefix', () => { const payload=Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url'); const token='eyJhbGciOiJIUzI1NiJ9.'+payload+'.'+('x'.repeat(45)); assert.ok(check({ VITE_SUPABASE_ANON_KEY:token }).errors.some(e => e.id === 'anon-key')) })

// The repo's safe exporter must exclude and reject design backups from analysis archives.
test('archive safety sources exclude local design backups', async () => {
  const fs = await import('node:fs')
  const a = fs.readFileSync(new URL('./safe-export.sh', import.meta.url), 'utf8')
  const b = fs.readFileSync(new URL('./check-safe-archive.sh', import.meta.url), 'utf8')
  assert.ok(a.includes('--exclude=.jas-design-backups/'))
  assert.ok(a.includes("--exclude='./.jas-design-backups'"))
  assert.ok(a.includes("-o -name '.jas-design-backups'"))
  assert.ok(b.includes('\\.jas-design-backups(/|$)'))
})
