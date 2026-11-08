import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BRAND, BRAND_METADATA, organizationDisplayText } from './branding'
import { en } from './i18n/en'
import { ur } from './i18n/ur'
import { sd } from './i18n/sd'
import { normalizeVerificationNumber } from './verify/validation'
import { JAS_EMAIL_BRAND, renderNotificationEmail } from '../../supabase/functions/_shared/notification-email'
import { I18nProvider } from './i18n'
import Footer from '../components/Footer'

const read = (file: string) => readFileSync(file, 'utf8')

it('uses exact official names in English, Urdu and Sindhi and preserves the tagline', () => {
  expect(BRAND.name).toBe('Jatt Welfare Alliance Sindh')
  expect(BRAND.shortName).toBe('JWAS')
  expect(en['brand.name']).toBe(BRAND.name)
  expect(ur['brand.name']).toBe('جٹ ویلفیئر الائنس سندھ')
  expect(sd['brand.name']).toBe('جٽ ويلفيئر الائنس سنڌ')
  expect(BRAND.tagline).toBe('Education · Health · Dignity')
})

it('renders the footer with organization copyright rather than starter branding', () => {
  const html = renderToStaticMarkup(<I18nProvider><Footer /></I18nProvider>)
  expect(html).toContain(BRAND.name)
  expect(html).toContain('JWAS')
  expect(html).toContain('©')
  expect(html).not.toContain('Your name here')
  expect(html).not.toContain('TanStack')
})

it('keeps PWA and SEO/social identity aligned', () => {
  const manifest = JSON.parse(read('public/manifest.json'))
  expect(manifest.name).toBe(BRAND.name)
  expect(manifest.short_name).toBe(BRAND.shortName)
  expect(manifest.start_url).toBe('/')
  expect(BRAND_METADATA.title).toContain(BRAND.name)
  expect(BRAND_METADATA.description).toContain(BRAND.name)
  expect(BRAND_METADATA.socialTitle).toContain(BRAND.name)
  expect(BRAND_METADATA.socialDescription).toContain(BRAND.name)
  const root = read('src/routes/__root.tsx')
  for (const key of ['og:title', 'og:description', 'twitter:title', 'twitter:description']) expect(root).toContain(key)
})

it('brands notification emails and every auth email template without changing template tokens', () => {
  expect(JAS_EMAIL_BRAND.organization).toBe(BRAND.name)
  expect(JAS_EMAIL_BRAND.shortName).toBe(BRAND.shortName)
  const mail = renderNotificationEmail({ title: 'Update', message: 'Your membership was approved.' })
  expect(mail.subject).toContain('[JWAS]')
  expect(mail.htmlContent).toContain(BRAND.name)
  for (const filename of readdirSync('supabase/templates').filter(f => f.endsWith('.html'))) {
    const html = read(`supabase/templates/${filename}`)
    expect(html).toContain(BRAND.name)
    expect(html).not.toMatch(/Jatt Alliance Sindh|\bJAS\b/)
  }
  expect(read('supabase/templates/recovery.html')).toContain('{{ .ConfirmationURL }}')
})

it('updates organization prose without renaming issued IDs, QR formats, storage keys or paths', () => {
  expect(organizationDisplayText('Jatt Alliance Sindh (JAS), member JAS-2026-10001')).toBe(`${BRAND.name} (JWAS), member JAS-2026-10001`)
  expect(organizationDisplayText('جٹ الائنس سندھ / جٽ الائنس سنڌ')).toBe(`${BRAND.localizedName.ur} / ${BRAND.localizedName.sd}`)
  expect(normalizeVerificationNumber('jas-2026-10001')).toBe('JAS-2026-10001')
  expect(read('src/components/admin/AdminShell.tsx')).toContain("'jas_admin_sidebar_collapsed_v1'")
  expect(read('src/lib/supabase/client.ts')).toContain("'jas-app-auth'")
  expect(read('src/components/layout/Header.tsx')).toContain('/jas/logo.jpeg')
})

it('has no obsolete standalone brand in audited presentation sources', () => {
  for (const file of ['src/lib/public-page-i18n.ts', 'src/lib/home-i18n.ts', 'src/routes/index.tsx', 'src/routes/verify/$memberNo.tsx', 'src/lib/admin-dashboard-i18n.ts', 'public/manifest.json', 'public/offline.html']) {
    expect(read(file), file).not.toMatch(/Jatt Alliance Sindh|JATT ALLIANCE SINDH|\bJAS\b(?![-_])/)
  }
})
