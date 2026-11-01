import { describe, expect, it } from 'vitest'
import {
  buildNotificationActionUrl,
  cleanEmailMessage,
  cleanEmailText,
  escapeEmailHtml,
  normalizeSiteUrl,
  renderNotificationEmail,
  sanitizeNotificationActionPath,
} from '../../supabase/functions/_shared/notification-email'

describe('notification email helpers', () => {
  it('keeps safe in-app action paths', () => {
    expect(sanitizeNotificationActionPath('/card?from=email')).toBe(
      '/card?from=email',
    )
    expect(sanitizeNotificationActionPath('/notifications')).toBe(
      '/notifications',
    )
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    'javascript:alert(1)',
    '/\\evil.example',
    '',
  ])('replaces unsafe action path %s', (value) => {
    expect(sanitizeNotificationActionPath(value)).toBe('/notifications')
  })

  it('allows HTTPS production origins and local HTTP only', () => {
    expect(normalizeSiteUrl('https://jasofficial.org/path')).toBe(
      'https://jasofficial.org',
    )
    expect(normalizeSiteUrl('http://localhost:3000/path')).toBe(
      'http://localhost:3000',
    )
    expect(normalizeSiteUrl('http://evil.example')).toBe(
      'https://jasofficial.org',
    )
  })

  it('builds a same-site action URL', () => {
    expect(
      buildNotificationActionUrl('https://jasofficial.org/', '/dashboard'),
    ).toBe('https://jasofficial.org/dashboard')
  })

  it('escapes user-controlled HTML in all visible fields', () => {
    const rendered = renderNotificationEmail({
      recipientName: '<img src=x onerror=alert(1)>',
      title: '<script>alert(1)</script>',
      message: 'Approved & ready <b>now</b>',
      actionPath: '/dashboard',
      siteUrl: 'https://jasofficial.org',
    })

    expect(rendered.htmlContent).not.toContain('<script>')
    expect(rendered.htmlContent).not.toContain('<img src=x')
    expect(rendered.htmlContent).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(rendered.htmlContent).toContain(
      'Approved &amp; ready &lt;b&gt;now&lt;/b&gt;',
    )
    expect(rendered.textContent).toContain('Approved & ready <b>now</b>')
  })

  it('uses RTL direction for Urdu notification content', () => {
    const rendered = renderNotificationEmail({
      title: 'ممبرشپ منظور ہو گئی',
      message: 'آپ کی درخواست منظور کر لی گئی ہے۔',
      actionPath: '/card',
    })

    expect(rendered.htmlContent).toContain('dir="rtl"')
    expect(rendered.subject).toBe('[JAS] ممبرشپ منظور ہو گئی')
  })

  it('removes control characters and limits text length', () => {
    expect(cleanEmailText(' Hello\u0000\nWorld ', 'fallback', 11)).toBe(
      'Hello  Worl',
    )
    expect(cleanEmailText('', 'fallback', 10)).toBe('fallback')
    expect(cleanEmailMessage('First\nSecond', 'fallback', 50)).toBe(
      'First\nSecond',
    )
    expect(escapeEmailHtml(`"'&<>`)).toBe(
      '&quot;&#039;&amp;&lt;&gt;',
    )
  })
})
