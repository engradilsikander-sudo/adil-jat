/** Presentation identity only. Legacy IDs, URLs, storage keys and APIs stay stable. */
export const BRAND = {
  name: 'Jatt Welfare Alliance Sindh',
  shortName: 'JWAS',
  tagline: 'Education · Health · Dignity',
  localizedName: {
    en: 'Jatt Welfare Alliance Sindh',
    ur: 'جٹ ویلفیئر الائنس سندھ',
    sd: 'جٽ ويلفيئر الائنس سنڌ',
  },
} as const

export const BRAND_METADATA = {
  title: `${BRAND.name} | Member & Programs Portal`,
  description: `${BRAND.name} membership registration, admin approval, QR verification, digital ID card and member-verified education, health, welfare and employment support platform.`,
  socialTitle: `${BRAND.name} Member & Programs Portal`,
  socialDescription: `Register, verify and access ${BRAND.name} digital membership, education, health, welfare and employment support programs.`,
}

// Only organization-owned CMS prose uses this presentation adapter. Stored text,
// historical records, member names, URLs and issued identifiers are not rewritten.
export function organizationDisplayText(value: string) {
  return value
    .replace(/\bJatt Alliance Sindh\b/g, BRAND.name)
    .replace(/جٹ الائنس سندھ/g, BRAND.localizedName.ur)
    .replace(/جٽ الائنس سنڌ/g, BRAND.localizedName.sd)
    .replace(/\bJAS\b(?![-_])/g, BRAND.shortName)
}
