#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const templateDir = resolve(root, 'supabase/templates')
const configPath = resolve(root, 'supabase/config.toml')

const requiredTemplates = {
  'invite.html': ['{{ .ConfirmationURL }}'],
  'recovery.html': ['{{ .ConfirmationURL }}', '{{ .Email }}'],
  'magic_link.html': ['{{ .ConfirmationURL }}', '{{ .Token }}'],
  'email_change.html': ['{{ .ConfirmationURL }}', '{{ .NewEmail }}'],
  'reauthentication.html': ['{{ .Token }}'],
  'password_changed_notification.html': ['{{ .Email }}'],
  'email_changed_notification.html': ['{{ .OldEmail }}', '{{ .Email }}'],
  'phone_changed_notification.html': ['{{ .OldPhone }}', '{{ .Phone }}'],
  'identity_linked_notification.html': ['{{ .Provider }}'],
  'identity_unlinked_notification.html': ['{{ .Provider }}'],
  'mfa_factor_enrolled_notification.html': ['{{ .FactorType }}'],
  'mfa_factor_unenrolled_notification.html': ['{{ .FactorType }}'],
}

const forbiddenPatterns = [
  /<script\b/i,
  /<form\b/i,
  /javascript:/i,
  /\bJASW\b/i,
  /Jatt Alliance Sindh Welfare/i,
  /Bilawal Bhutto Jayala Force/i,
]

const config = await readFile(configPath, 'utf8')
const presentFiles = new Set(await readdir(templateDir))
const failures = []

if (presentFiles.has('confirmation.html')) {
  failures.push('Remove supabase/templates/confirmation.html; signup confirmation is disabled')
}

for (const [filename, variables] of Object.entries(requiredTemplates)) {
  if (!presentFiles.has(filename)) {
    failures.push(`Missing template: ${filename}`)
    continue
  }

  const path = resolve(templateDir, filename)
  const info = await stat(path)
  const html = await readFile(path, 'utf8')

  if (info.size < 1000) failures.push(`${filename}: template is unexpectedly small`)
  if (!html.includes('Jatt Alliance Sindh')) failures.push(`${filename}: missing official organization name`)
  if (!html.includes('support@jasofficial.org')) failures.push(`${filename}: missing official support email`)
  if (!html.includes('https://jasofficial.org')) failures.push(`${filename}: missing official website`)

  for (const variable of variables) {
    if (!html.includes(variable)) failures.push(`${filename}: missing variable ${variable}`)
  }

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(html)) failures.push(`${filename}: forbidden content matched ${pattern}`)
  }

  const isSecurityNotification = filename.endsWith('_notification.html')
  const configReference = isSecurityNotification
    ? `./templates/${filename}`
    : `./supabase/templates/${filename}`
  if (!config.includes(configReference)) {
    failures.push(`supabase/config.toml does not reference ${filename}`)
  }
}

if (!/\[auth\.email\][\s\S]*?enable_confirmations\s*=\s*false/.test(config)) {
  failures.push('Signup email confirmation must remain disabled in supabase/config.toml')
}
if (config.includes('[auth.email.template.confirmation]') || config.includes('confirmation.html')) {
  failures.push('Signup confirmation template must not be included in this patch')
}

if (!config.includes('[functions.send-notification-emails]')) {
  failures.push('Missing send-notification-emails function configuration')
}
if (!config.includes('verify_jwt = false')) {
  failures.push('send-notification-emails must declare verify_jwt = false and validate its own worker secret')
}

if (failures.length) {
  console.error('Email template verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Email templates verified: ${Object.keys(requiredTemplates).length}`)
console.log('Brand: JAS — Jatt Alliance Sindh')
console.log('Notification worker config: present')
