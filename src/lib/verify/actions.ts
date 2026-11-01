import { enforceVerificationBudget } from './budget'
// src/lib/verify/actions.ts
import { normalizeVerificationNumber } from './validation'
import { createServerFn } from '@tanstack/react-start'
import { createSupabaseAdminClient } from '../supabase/admin'

const MEMBER_PHOTO_BUCKET = 'member-photos'
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 10

type MemberStatus = 'pending' | 'approved' | 'rejected'

type VerifyMemberInput = {
  memberNo: string
}

type VerifyMemberDesignation = {
  title: string
  committeeName: string | null
  level: string | null
  location: string | null
  validFrom: string | null
  expiresOn: string | null
  validity: string
  expiryDate: string
}

type VerifyMemberResult = {
  found: boolean
  verified: boolean
  member: {
    member_no: string | null
    full_name: string
    district: string
    taluka: string | null
    status: MemberStatus
    approved_at: string | null
  } | null
  photoSignedUrl: string | null
  activeDesignation: VerifyMemberDesignation | null
}

type MemberVerificationRow = {
  id: string
  member_no: string | null
  full_name: string
  district: string
  taluka: string | null
  photo_url: string | null
  status: MemberStatus
  approved_at: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateVerifyInput(data: unknown): VerifyMemberInput {
  if (!isRecord(data)) {
    throw new Error('Invalid verification request.')
  }

  const memberNo = data.memberNo

  if (typeof memberNo !== 'string') {
    throw new Error('Member number is required.')
  }

  return {
    memberNo: normalizeVerificationNumber(memberNo),
  }
}

async function createMemberPhotoSignedUrl(
  photoPath: string | null,
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
) {
  if (!photoPath) return null

  const { data, error } = await supabaseAdmin.storage
    .from(MEMBER_PHOTO_BUCKET)
    .createSignedUrl(photoPath, PHOTO_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

function buildPublicMemberPayload(member: MemberVerificationRow) {
  const verified = member.status === 'approved' && Boolean(member.member_no)

  if (!verified) {
    return {
      found: true,
      verified: false,
      member: {
        member_no: member.member_no,
        full_name: 'Not disclosed',
        district: 'Not disclosed',
        taluka: null,
        status: member.status,
        approved_at: null,
      },
      photoSignedUrl: null,
      activeDesignation: null,
    } satisfies VerifyMemberResult
  }

  return {
    found: true,
    verified: true,
    member: {
      member_no: member.member_no,
      full_name: member.full_name,
      district: member.district,
      taluka: member.taluka ?? null,
      status: member.status,
      approved_at: member.approved_at,
    },
    photoSignedUrl: null,
    activeDesignation: null,
  } satisfies VerifyMemberResult
}


function formatPublicDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getDesignationValidityLabel(
  validFrom: string | null,
  expiresOn: string | null,
) {
  const startLabel = formatPublicDate(validFrom)
  const endLabel = formatPublicDate(expiresOn)

  if (startLabel && endLabel) return `${startLabel} → ${endLabel}`
  if (endLabel) return `Valid until ${endLabel}`
  if (startLabel) return `Valid from ${startLabel}`

  return 'Tenure not set'
}

function getDesignationExpiryDateLabel(expiresOn: string | null) {
  return formatPublicDate(expiresOn) ?? 'Not set'
}

function getCommitteeLocationLabel(committee: {
  committee_type: string | null
  division: string | null
  district: string | null
  taluka: string | null
}) {
  if (committee.committee_type === 'central') return 'Sindh / Central Executive Committee'
  if (committee.committee_type === 'central_advisory') return 'Sindh / Central Advisory Committee'
  if (committee.committee_type === 'provincial') return 'Sindh / Provincial'
  if (committee.committee_type === 'divisional') return committee.division || 'Division not set'
  if (committee.committee_type === 'district') return committee.district || 'District not set'

  return [committee.taluka, committee.district].filter(Boolean).join(', ') || 'Taluka not set'
}

function getCommitteeLevelLabel(value: string | null) {
  switch (value) {
    case 'central':
      return 'Central Executive Committee'
    case 'central_advisory':
      return 'Central Advisory Committee'
    case 'provincial':
      return 'Provincial Committee'
    case 'divisional':
      return 'Divisional Committee'
    case 'district':
      return 'District Committee'
    case 'taluka':
      return 'Taluka Committee'
    default:
      return 'Committee'
  }
}

async function fetchActiveMemberDesignation(
  memberId: string,
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
) {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabaseAdmin
    .from('organization_committee_members')
    .select(
      [
        'designation_title',
        'tenure_start',
        'tenure_end',
        'sort_order',
        'created_at',
        'committee:organization_committees!inner(id, committee_type, name, division, district, taluka, status)',
      ].join(', '),
    )
    .eq('member_id', memberId)
    .eq('status', 'active')
    .eq('committee.status', 'active')
    .eq('committee.public_display', true)
    .lte('tenure_start', today)
    .gte('tenure_end', today)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return null

  const rows = (data ?? []) as unknown as Array<{
    designation_title: string | null
    tenure_start: string | null
    tenure_end: string | null
    committee:
      | {
          committee_type: string | null
          name: string | null
          division: string | null
          district: string | null
          taluka: string | null
          status: string | null
        }
      | Array<{
          committee_type: string | null
          name: string | null
          division: string | null
          district: string | null
          taluka: string | null
          status: string | null
        }>
      | null
  }>

  const row = rows.find((item) => {
    const committee = Array.isArray(item.committee) ? item.committee[0] : item.committee
    return Boolean(item.designation_title?.trim()) && committee?.status === 'active'
  })

  if (!row) return null

  const committee = Array.isArray(row.committee) ? row.committee[0] : row.committee
  if (!committee) return null

  const validFrom = row.tenure_start ?? null
  const expiresOn = row.tenure_end ?? null

  return {
    title: row.designation_title?.trim() || 'Designation',
    committeeName: committee.name,
    level: getCommitteeLevelLabel(committee.committee_type),
    location: getCommitteeLocationLabel(committee),
    validFrom,
    expiresOn,
    validity: getDesignationValidityLabel(validFrom, expiresOn),
    expiryDate: getDesignationExpiryDateLabel(expiresOn),
  } satisfies VerifyMemberDesignation
}

export const verifyMemberAction = createServerFn({ method: 'POST' })
  .validator(validateVerifyInput)
  .handler(async ({ data }): Promise<VerifyMemberResult> => {
    try {
    const supabaseAdmin = await enforceVerificationBudget(data.memberNo)

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select(
        [
          'id',
          'member_no',
          'full_name',
          'district',
          'taluka',
          'photo_url',
          'status',
          'approved_at',
        ].join(', '),
      )
      .eq('member_no', data.memberNo)
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error('VERIFY_UNAVAILABLE')
    }

    if (!member) {
      return {
        found: false,
        verified: false,
        member: null,
        photoSignedUrl: null,
        activeDesignation: null,
      }
    }

    const safeMember = member as unknown as MemberVerificationRow
    const result = buildPublicMemberPayload(safeMember)

    if (!result.verified) {
      return result
    }

    const [photoSignedUrl, activeDesignation] = await Promise.all([
      createMemberPhotoSignedUrl(safeMember.photo_url, supabaseAdmin),
      fetchActiveMemberDesignation(safeMember.id, supabaseAdmin),
    ])

    return {
      ...result,
      photoSignedUrl,
      activeDesignation,
    }
    } catch (error) {
      if (error instanceof Error && error.message === 'VERIFY_RATE_LIMITED') throw error
      throw new Error('VERIFY_UNAVAILABLE')
    }
  })