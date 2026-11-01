import { createServerFn } from '@tanstack/react-start'
import { enforceVerificationBudget } from './budget'
import type { PublicOfficeBearerVerificationRecord } from '../committees-public'

export function normalizeOfficeBearerId(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^JAS-OB-\d{4}-[0-9A-F]{8}$/.test(value.trim().toUpperCase())
  ) {
    throw new Error('VERIFY_INVALID_NUMBER')
  }

  return value.trim().toUpperCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

export function sanitizePublicOfficeBearerRecord(
  value: unknown,
  requestedId: string,
): PublicOfficeBearerVerificationRecord | null {
  if (!isRecord(value)) return null

  const committee = isRecord(value.committee) ? value.committee : null
  const member = isRecord(value.member) ? value.member : null
  const designationTitle = nullableString(value.designation_title)
  const fullName = nullableString(member?.full_name) ?? nullableString(value.full_name_snapshot)

  if (!designationTitle || !fullName || !committee || !member) return null

  return {
    office_bearer_id: requestedId.toUpperCase(),
    designation_title: designationTitle,
    status: (nullableString(value.status) ?? 'active') as PublicOfficeBearerVerificationRecord['status'],
    sort_order: typeof value.sort_order === 'number' ? value.sort_order : 0,
    tenure_start: nullableString(value.tenure_start),
    tenure_end: nullableString(value.tenure_end),
    member_no_snapshot: nullableString(value.member_no_snapshot),
    full_name_snapshot: nullableString(value.full_name_snapshot) ?? fullName,
    father_name_snapshot: nullableString(value.father_name_snapshot),
    district_snapshot: nullableString(value.district_snapshot),
    taluka_snapshot: nullableString(value.taluka_snapshot),
    created_at: nullableString(value.created_at) ?? '',
    updated_at: nullableString(value.updated_at) ?? '',
    committee: {
      committee_type: (nullableString(committee.committee_type) ??
        'district') as NonNullable<
        PublicOfficeBearerVerificationRecord['committee']
      >['committee_type'],
      name: nullableString(committee.name) ?? 'Committee record',
      division: nullableString(committee.division),
      district: nullableString(committee.district),
      taluka: nullableString(committee.taluka),
      tenure_start: nullableString(committee.tenure_start),
      tenure_end: nullableString(committee.tenure_end),
      status: (nullableString(committee.status) ?? 'active') as PublicOfficeBearerVerificationRecord['status'],
      public_display: committee.public_display !== false,
      notes: nullableString(committee.notes),
      created_at: nullableString(committee.created_at) ?? '',
      updated_at: nullableString(committee.updated_at) ?? '',
    },
    member: {
      full_name: fullName,
      father_name: nullableString(member.father_name),
      member_no: nullableString(member.member_no),
      district: nullableString(member.district),
      taluka: nullableString(member.taluka),
      status: nullableString(member.status) ?? 'approved',
    },
    photoSignedUrl: nullableString(value.photoSignedUrl),
  }
}

export const verifyOfficeBearerAction = createServerFn({ method: 'POST' })
  .inputValidator((value: unknown) => normalizeOfficeBearerId(value))
  .handler(async ({ data }): Promise<PublicOfficeBearerVerificationRecord | null> => {
    try {
      const client = await enforceVerificationBudget(data)
      const result = await client.rpc('lookup_public_office_bearer', { _card_id: data })
      if (result.error) throw result.error
      return sanitizePublicOfficeBearerRecord(result.data, data)
    } catch (error) {
      if (error instanceof Error && error.message === 'VERIFY_RATE_LIMITED') throw error
      throw new Error('VERIFY_UNAVAILABLE')
    }
  })
