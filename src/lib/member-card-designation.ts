import { supabase } from './supabase/client'
import {
  getCommitteeLocationLabel,
  getCommitteeTypeLabel,
  type CommitteeRecord,
  type CommitteeType,
} from './committees'
import {
  formatDesignationExpiry,
  formatDesignationValidity,
  getDesignationExpiryDate,
  getDesignationValidityStart,
  isDesignationCurrentlyValid,
} from './designation-validity'

export type MemberCardDesignation = {
  title: string
  committeeName: string | null
  committeeType: CommitteeType | null
  committeeLevelLabel: string | null
  committeeLocationLabel: string | null
  tenureStart: string | null
  tenureEnd: string | null
  validityStart: string | null
  expiresOn: string | null
  validityLabel: string
  expiryLabel: string
}

type CommitteeSummary = Pick<
  CommitteeRecord,
  | 'id'
  | 'committee_type'
  | 'name'
  | 'division'
  | 'district'
  | 'taluka'
  | 'status'
>

type CommitteeAssignmentRow = {
  member_id: string
  designation_title: string
  tenure_start: string | null
  tenure_end: string | null
  sort_order: number | null
  created_at: string | null
  committee: CommitteeSummary | CommitteeSummary[] | null
}

const DESIGNATION_BATCH_SIZE = 100

export function getMemberDesignationTitle(
  designation: MemberCardDesignation | null | undefined,
) {
  return designation?.title?.trim() || null
}

export function getMemberDesignationLevel(
  designation: MemberCardDesignation | null | undefined,
) {
  if (!designation) return null

  return (
    [designation.committeeLevelLabel, designation.committeeLocationLabel]
      .filter(Boolean)
      .join(' · ') || null
  )
}

export async function fetchActiveMemberCardDesignation(memberId: string) {
  const designations = await fetchActiveMemberCardDesignations([memberId])
  return designations[memberId] ?? null
}

export async function fetchActiveMemberCardDesignations(
  memberIds: string[],
  options?: { throwOnError?: boolean },
) {
  const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))]
  const result: Record<string, MemberCardDesignation | null> = Object.fromEntries(
    uniqueMemberIds.map((memberId) => [memberId, null]),
  )

  if (uniqueMemberIds.length === 0) return result

  const rows: CommitteeAssignmentRow[] = []

  for (let index = 0; index < uniqueMemberIds.length; index += DESIGNATION_BATCH_SIZE) {
    const memberIdBatch = uniqueMemberIds.slice(
      index,
      index + DESIGNATION_BATCH_SIZE,
    )

    const { data, error } = await supabase
      .from('organization_committee_members' as never)
      .select(
        [
          'member_id',
          'designation_title',
          'tenure_start',
          'tenure_end',
          'sort_order',
          'created_at',
          'committee:organization_committees(id, committee_type, name, division, district, taluka, status)',
        ].join(', '),
      )
      .in('member_id' as never, memberIdBatch as never)
      .eq('status' as never, 'active' as never)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      if (options?.throwOnError) throw error

      console.warn('Unable to load member card designations:', error.message)
      continue
    }

    rows.push(...((data ?? []) as unknown as CommitteeAssignmentRow[]))
  }

  const rowsByMemberId = new Map<string, CommitteeAssignmentRow[]>()

  rows.forEach((row) => {
    const memberRows = rowsByMemberId.get(row.member_id) ?? []
    memberRows.push(row)
    rowsByMemberId.set(row.member_id, memberRows)
  })

  uniqueMemberIds.forEach((memberId) => {
    result[memberId] = resolveActiveDesignation(rowsByMemberId.get(memberId) ?? [])
  })

  return result
}

function resolveActiveDesignation(rows: CommitteeAssignmentRow[]) {
  const activeRow = rows.find((row) => {
    const committee = getCommittee(row)

    return (
      Boolean(row.designation_title?.trim()) &&
      committee?.status === 'active' &&
      isDesignationCurrentlyValid({
        tenure_start: row.tenure_start,
        tenure_end: row.tenure_end,
        created_at: row.created_at,
      })
    )
  })

  if (!activeRow) return null

  const committee = getCommittee(activeRow)
  if (!committee) return null

  const validitySource = {
    tenure_start: activeRow.tenure_start,
    tenure_end: activeRow.tenure_end,
    created_at: activeRow.created_at,
  }

  return {
    title: activeRow.designation_title.trim(),
    committeeName: committee.name ?? null,
    committeeType: committee.committee_type,
    committeeLevelLabel: getCommitteeTypeLabel(committee.committee_type),
    committeeLocationLabel: getCommitteeLocationLabel(committee),
    tenureStart: activeRow.tenure_start,
    tenureEnd: activeRow.tenure_end,
    validityStart: getDesignationValidityStart(validitySource),
    expiresOn: getDesignationExpiryDate(validitySource),
    validityLabel: formatDesignationValidity(validitySource),
    expiryLabel: formatDesignationExpiry(validitySource),
  } satisfies MemberCardDesignation
}

function getCommittee(row: CommitteeAssignmentRow) {
  return Array.isArray(row.committee) ? row.committee[0] : row.committee
}
