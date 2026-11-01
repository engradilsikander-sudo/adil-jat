export const JAS_EMAIL_BRAND = {
  shortName: 'JAS',
  organization: 'Jatt Alliance Sindh',
  senderName: 'Jatt Alliance Sindh',
  senderEmail: 'support@jasofficial.org',
  supportEmail: 'support@jasofficial.org',
  defaultSiteUrl: 'https://jasofficial.org',
} as const

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g
const NON_LINE_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const RTL_TEXT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

export type NotificationEmailInput = {
  recipientName?: string | null
  title: string
  message: string
  actionPath?: string | null
  siteUrl?: string | null
}

export type NotificationEmailContent = {
  subject: string
  htmlContent: string
  textContent: string
  actionUrl: string
}

export function cleanEmailText(
  value: unknown,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== 'string') return fallback
  const cleaned = value.replace(CONTROL_CHARACTERS, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : fallback
}


export function cleanEmailMessage(
  value: unknown,
  fallback: string,
  maxLength: number,
) {
  if (typeof value !== 'string') return fallback
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .replace(NON_LINE_CONTROL_CHARACTERS, ' ')
    .trim()
  return cleaned ? cleaned.slice(0, maxLength) : fallback
}

export function sanitizeNotificationActionPath(value: unknown) {
  if (typeof value !== 'string') return '/notifications'

  const cleaned = value.replace(CONTROL_CHARACTERS, '').trim()
  if (
    !cleaned.startsWith('/') ||
    cleaned.startsWith('//') ||
    cleaned.includes('\\')
  ) {
    return '/notifications'
  }

  return cleaned.slice(0, 300)
}

export function normalizeSiteUrl(value: unknown) {
  const fallback = JAS_EMAIL_BRAND.defaultSiteUrl
  if (typeof value !== 'string' || !value.trim()) return fallback

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return fallback
    }
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export function buildNotificationActionUrl(
  siteUrl: unknown,
  actionPath: unknown,
) {
  return `${normalizeSiteUrl(siteUrl)}${sanitizeNotificationActionPath(actionPath)}`
}

export function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function renderNotificationEmail(
  input: NotificationEmailInput,
): NotificationEmailContent {
  const title = cleanEmailText(input.title, 'JAS notification', 140)
  const message = cleanEmailMessage(
    input.message,
    'Your JAS member portal record has been updated.',
    5000,
  )
  const recipientName = cleanEmailText(input.recipientName, 'Member', 120)
  const actionUrl = buildNotificationActionUrl(input.siteUrl, input.actionPath)
  const direction = RTL_TEXT.test(`${title} ${message}`) ? 'rtl' : 'ltr'
  const align = direction === 'rtl' ? 'right' : 'left'
  const messageHtml = escapeEmailHtml(message).replace(/\r?\n/g, '<br>')
  const safeTitle = escapeEmailHtml(title)
  const safeName = escapeEmailHtml(recipientName)
  const safeActionUrl = escapeEmailHtml(actionUrl)
  const subject = title.toLowerCase().startsWith('jas')
    ? title
    : `[JAS] ${title}`

  const htmlContent = `<!doctype html>
<html lang="en" dir="${direction}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safeTitle}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#064e3b;padding:24px 28px;color:#ffffff;text-align:left;" dir="ltr">
                <div style="display:inline-block;border:2px solid #fbbf24;border-radius:999px;padding:8px 12px;font-size:20px;font-weight:800;letter-spacing:1px;">JAS</div>
                <div style="margin-top:12px;font-size:19px;font-weight:800;">Jatt Alliance Sindh</div>
                <div style="margin-top:4px;font-size:12px;color:#d1fae5;">Official Member Portal Notification</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 20px;text-align:${align};" dir="${direction}">
                <div style="font-size:15px;line-height:24px;color:#475569;margin-bottom:8px;">Dear ${safeName},</div>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:32px;color:#0f172a;">${safeTitle}</h1>
                <div style="font-size:15px;line-height:25px;color:#334155;white-space:normal;">${messageHtml}</div>
                <div style="padding:24px 0 18px;" dir="ltr">
                  <a href="${safeActionUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:20px;padding:13px 22px;border-radius:10px;">Open JAS Member Portal</a>
                </div>
                <div style="font-size:12px;line-height:19px;color:#64748b;word-break:break-all;" dir="ltr">${safeActionUrl}</div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:18px 28px;font-size:12px;line-height:19px;color:#64748b;text-align:left;" dir="ltr">
                Need help? Email <a href="mailto:${JAS_EMAIL_BRAND.supportEmail}" style="color:#0f766e;font-weight:700;">${JAS_EMAIL_BRAND.supportEmail}</a>.<br>
                This is an automated service email from Jatt Alliance Sindh. Do not reply with your password, CNIC, OTP, or payment PIN.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textContent = [
    JAS_EMAIL_BRAND.organization,
    '',
    `Dear ${recipientName},`,
    '',
    title,
    '',
    message,
    '',
    `Open JAS Member Portal: ${actionUrl}`,
    '',
    `Support: ${JAS_EMAIL_BRAND.supportEmail}`,
    'Never share your password, CNIC, OTP, or payment PIN by email.',
  ].join('\n')

  return {
    subject: subject.slice(0, 150),
    htmlContent,
    textContent,
    actionUrl,
  }
}
