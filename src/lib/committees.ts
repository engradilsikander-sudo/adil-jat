import { supabase } from './supabase/client'

export const committeeTypeOptions = [
  { value: 'central', label: 'Central Executive Committee' },
  { value: 'central_advisory', label: 'Central Advisory Committee' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'divisional', label: 'Divisional' },
  { value: 'district', label: 'District' },
  { value: 'taluka', label: 'Taluka' },
] as const

export const committeeStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'completed', label: 'Completed' },
  { value: 'resigned', label: 'Resigned' },
] as const

export const designationScopeOptions = [
  { value: 'central', label: 'Central Executive' },
  { value: 'central_advisory', label: 'Central Advisory' },
  { value: 'provincial', label: 'Provincial' },
  { value: 'divisional', label: 'Divisional' },
  { value: 'district', label: 'District' },
  { value: 'taluka', label: 'Taluka' },
] as const

export type CommitteeType = (typeof committeeTypeOptions)[number]['value']
export type CommitteeStatus = (typeof committeeStatusOptions)[number]['value']
export type DesignationScope = (typeof designationScopeOptions)[number]['value']

export type CommitteeRecord = {
  id: string
  committee_type: CommitteeType
  name: string
  division: string | null
  district: string | null
  taluka: string | null
  tenure_start: string | null
  tenure_end: string | null
  status: CommitteeStatus
  public_display: boolean
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  member_count?: number
}

export type CommitteeMemberRecord = {
  id: string
  committee_id: string
  member_id: string
  designation_id: string | null
  designation_title: string
  status: CommitteeStatus
  sort_order: number
  tenure_start: string | null
  tenure_end: string | null
  appointment_notes: string | null
  member_no_snapshot: string | null
  full_name_snapshot: string
  father_name_snapshot: string | null
  district_snapshot: string | null
  taluka_snapshot: string | null
  created_at: string
  updated_at: string
}

export type DesignationRecord = {
  id: string
  scope: DesignationScope
  title: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CommitteeDetails = CommitteeRecord & {
  members: CommitteeMemberRecord[]
}

export type MemberSearchResult = {
  id: string
  full_name: string
  father_name: string
  member_no: string | null
  district: string | null
  taluka: string | null
  mobile?: string | null
  status: string
}

export type MemberSearchFilters = {
  district?: string | null
  taluka?: string | null
  requireMemberNo?: boolean
}

const committeeSelect = [
  'id',
  'committee_type',
  'name',
  'division',
  'district',
  'taluka',
  'tenure_start',
  'tenure_end',
  'status',
  'public_display',
  'notes',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
].join(', ')

const committeeMemberSelect = [
  'id',
  'committee_id',
  'member_id',
  'designation_id',
  'designation_title',
  'status',
  'sort_order',
  'tenure_start',
  'tenure_end',
  'appointment_notes',
  'member_no_snapshot',
  'full_name_snapshot',
  'father_name_snapshot',
  'district_snapshot',
  'taluka_snapshot',
  'created_at',
  'updated_at',
].join(', ')

export function getCommitteeTypeLabel(value: string | null | undefined) {
  return committeeTypeOptions.find((item) => item.value === value)?.label ?? 'Level'
}

export function getCommitteeStatusLabel(value: string | null | undefined) {
  return committeeStatusOptions.find((item) => item.value === value)?.label ?? 'Unknown'
}

export function getCommitteeStatusClass(value: string | null | undefined) {
  switch (value) {
    case 'active':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'suspended':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'completed':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    case 'resigned':
      return 'bg-amber-50 text-amber-800 ring-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function getCommitteeLocationLabel(
  committee: Pick<CommitteeRecord, 'committee_type' | 'division' | 'district' | 'taluka'>,
) {
  if (committee.committee_type === 'central') return 'Sindh / Central Executive Committee'
  if (committee.committee_type === 'central_advisory') return 'Sindh / Central Advisory Committee'
  if (committee.committee_type === 'provincial') return 'Sindh / Provincial'
  if (committee.committee_type === 'divisional') {
    return committee.division || 'Division not set'
  }
  if (committee.committee_type === 'district') return committee.district || 'District not set'

  return [committee.taluka, committee.district].filter(Boolean).join(', ') || 'Taluka not set'
}

export function formatCommitteeDate(value: string | null | undefined) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function currentUserCanManageCommittees() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return false

  // Prefer the same SECURITY DEFINER helper that the committee RLS policies use.
  // This avoids false negatives from direct user_roles reads when role policies are tightened.
  const { data: rpcAllowed, error: rpcError } = await supabase.rpc(
    'current_user_can_manage_organization' as never,
  )

  if (!rpcError) return Boolean(rpcAllowed)

  // Fallback for local/dev databases where the helper function may not exist yet.
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'super_admin'])
    .limit(1)

  if (error) throw error
  return Boolean(data?.length)
}

async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Login required.')
  return user.id
}

export async function fetchCommitteesForAdmin() {
  const { data, error } = await supabase
    .from('organization_committees' as never)
    .select(committeeSelect)
    .order('created_at', { ascending: false })

  if (error) throw error

  const committees = (data ?? []) as unknown as CommitteeRecord[]

  if (!committees.length) return []

  const { data: members, error: countError } = await supabase
    .from('organization_committee_members' as never)
    .select('committee_id')

  if (countError) {
    console.warn('Committee member count query failed:', countError)
    return committees.map((committee) => ({
      ...committee,
      member_count: 0,
    }))
  }

  const counts = new Map<string, number>()
  ;((members ?? []) as unknown as Array<{ committee_id: string }>).forEach((item) => {
    counts.set(item.committee_id, (counts.get(item.committee_id) ?? 0) + 1)
  })

  return committees.map((committee) => ({
    ...committee,
    member_count: counts.get(committee.id) ?? 0,
  }))
}

export async function createCommittee(input: {
  committee_type: CommitteeType
  name: string
  division: string | null
  district: string | null
  taluka: string | null
  tenure_start: string | null
  tenure_end: string | null
  status: CommitteeStatus
  public_display: boolean
  notes: string | null
}) {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('organization_committees' as never)
    .insert({
      ...input,
      created_by: userId,
      updated_by: userId,
    } as never)
    .select('id')
    .single()

  if (error) throw error

  return String((data as unknown as { id: string }).id)
}

export async function updateCommittee(
  id: string,
  input: {
    committee_type: CommitteeType
    name: string
    division: string | null
    district: string | null
    taluka: string | null
    tenure_start: string | null
    tenure_end: string | null
    status: CommitteeStatus
    public_display: boolean
    notes: string | null
  },
) {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('organization_committees' as never)
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id' as never, id as never)

  if (error) throw error
}

export async function fetchCommitteeDetails(id: string): Promise<CommitteeDetails | null> {
  const { data: committee, error } = await supabase
    .from('organization_committees' as never)
    .select(committeeSelect)
    .eq('id' as never, id as never)
    .maybeSingle()

  if (error) throw error
  if (!committee) return null

  const { data: members, error: membersError } = await supabase
    .from('organization_committee_members' as never)
    .select(committeeMemberSelect)
    .eq('committee_id' as never, id as never)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (membersError) throw membersError

  return {
    ...(committee as unknown as CommitteeRecord),
    members: (members ?? []) as unknown as CommitteeMemberRecord[],
  }
}

export async function fetchDesignations(scope?: DesignationScope) {
  let query = supabase
    .from('organization_designations' as never)
    .select('id, scope, title, sort_order, is_active, created_at, updated_at')
    .order('scope', { ascending: true })
    .order('sort_order', { ascending: true })

  if (scope) {
    query = query.eq('scope' as never, scope as never)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as DesignationRecord[]
}

export async function createDesignation(input: {
  scope: DesignationScope
  title: string
  sort_order: number
  is_active: boolean
}) {
  const { error } = await supabase.from('organization_designations' as never).insert(input as never)
  if (error) throw error
}

export async function updateDesignation(
  id: string,
  input: {
    scope: DesignationScope
    title: string
    sort_order: number
    is_active: boolean
  },
) {
  const { error } = await supabase
    .from('organization_designations' as never)
    .update({ ...input, updated_at: new Date().toISOString() } as never)
    .eq('id' as never, id as never)

  if (error) throw error
}

export async function searchApprovedMembers(
  query: string,
  filters: MemberSearchFilters = {},
) {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  let request = supabase
    .from('members')
    .select('id, full_name, father_name, member_no, district, taluka, mobile, status')
    .eq('status', 'approved')
    .or(
      [
        `full_name.ilike.%${escapeIlike(trimmed)}%`,
        `father_name.ilike.%${escapeIlike(trimmed)}%`,
        `member_no.ilike.%${escapeIlike(trimmed)}%`,
        `mobile.ilike.%${escapeIlike(trimmed)}%`,
      ].join(','),
    )

  if (filters.requireMemberNo ?? true) {
    request = request.not('member_no', 'is', null)
  }

  if (filters.district) {
    request = request.eq('district', filters.district)
  }

  if (filters.taluka) {
    request = request.eq('taluka', filters.taluka)
  }

  const { data, error } = await request
    .order('full_name', { ascending: true })
    .limit(15)

  if (error) throw error

  return (data ?? []) as MemberSearchResult[]
}

export async function addCommitteeMember(input: {
  committee_id: string
  member: MemberSearchResult
  designation_id: string | null
  designation_title: string
  status: CommitteeStatus
  sort_order: number
  tenure_start: string | null
  tenure_end: string | null
  appointment_notes: string | null
}) {
  const userId = await getCurrentUserId()

  const { error } = await supabase.from('organization_committee_members' as never).insert({
    committee_id: input.committee_id,
    member_id: input.member.id,
    designation_id: input.designation_id,
    designation_title: input.designation_title,
    status: input.status,
    sort_order: input.sort_order,
    tenure_start: input.tenure_start,
    tenure_end: input.tenure_end,
    appointment_notes: input.appointment_notes,
    member_no_snapshot: input.member.member_no,
    full_name_snapshot: input.member.full_name,
    father_name_snapshot: input.member.father_name,
    district_snapshot: input.member.district,
    taluka_snapshot: input.member.taluka,
    created_by: userId,
    updated_by: userId,
  } as never)

  if (error) throw error
}

export async function updateCommitteeMember(
  id: string,
  input: {
    designation_id: string | null
    designation_title: string
    status: CommitteeStatus
    sort_order: number
    tenure_start: string | null
    tenure_end: string | null
    appointment_notes: string | null
  },
) {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('organization_committee_members' as never)
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id' as never, id as never)

  if (error) throw error
}

export async function removeCommitteeMember(id: string) {
  const { error } = await supabase
    .from('organization_committee_members' as never)
    .delete()
    .eq('id' as never, id as never)

  if (error) throw error
}

function escapeIlike(value: string) {
  return value.replace(/[%_]/g, (match) => `\\${match}`)
}
