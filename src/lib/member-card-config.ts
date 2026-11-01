export const MEMBER_CARD_VERSION = 'v1'
export const JAS_ORGANIZATION_NAME = 'Jatt Alliance Sindh'
export const JAS_ORGANIZATION_LOCATION = 'Sindh, Pakistan'
export const DEFAULT_PUBLIC_SITE_ORIGIN = 'https://jasofficial.org'

export function normalizePublicSiteOrigin(value: string | null | undefined) {
  const normalized = String(value || DEFAULT_PUBLIC_SITE_ORIGIN).trim().replace(/\/+$/, '')
  return normalized || DEFAULT_PUBLIC_SITE_ORIGIN
}

export const PUBLIC_SITE_ORIGIN = normalizePublicSiteOrigin(
  import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    DEFAULT_PUBLIC_SITE_ORIGIN,
)

export function buildMemberVerificationUrl(
  memberNo: string,
  publicSiteOrigin = PUBLIC_SITE_ORIGIN,
) {
  return `${normalizePublicSiteOrigin(publicSiteOrigin)}/verify/${encodeURIComponent(memberNo)}`
}

export function buildMemberCardIssueLabel(memberNo: string | null | undefined) {
  return memberNo
    ? `${memberNo} / ${MEMBER_CARD_VERSION}`
    : `Pending / ${MEMBER_CARD_VERSION}`
}
