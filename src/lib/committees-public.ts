import { verifyOfficeBearerAction } from './verify/office-bearer'
import { supabase } from './supabase/client'
import {
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  getCommitteeTypeLabel,
  type CommitteeStatus,
  type CommitteeType,
} from './committees'

export type PublicCommitteeRecord = {
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
  created_at: string
  updated_at: string
  member_count?: number
}

export type PublicCommitteeMemberRecord = {
  id: string
  committee_id?: string
  member_id?: string
  designation_title: string
  status: CommitteeStatus
  sort_order: number
  tenure_start: string | null
  tenure_end: string | null
  member_no_snapshot: string | null
  full_name_snapshot: string
  father_name_snapshot: string | null
  district_snapshot: string | null
  taluka_snapshot: string | null
  created_at: string
  updated_at: string
}

export type PublicCommitteeDetails = PublicCommitteeRecord & {
  members: PublicCommitteeMemberRecord[]
}

export type DesignationCardMember = {
  id: string
  user_id: string | null
  full_name: string
  father_name: string | null
  member_no: string | null
  district: string | null
  taluka: string | null
  photo_url: string | null
  status: string
}

export type DesignationCardRecord = PublicCommitteeMemberRecord & {
  committee: PublicCommitteeRecord | null
  member: DesignationCardMember
  photoSignedUrl?: string | null
}

export type PublicOfficeBearerVerificationRecord = {
  office_bearer_id: string
  designation_title: string
  status: CommitteeStatus
  sort_order: number
  tenure_start: string | null
  tenure_end: string | null
  member_no_snapshot: string | null
  full_name_snapshot: string
  father_name_snapshot: string | null
  district_snapshot: string | null
  taluka_snapshot: string | null
  created_at: string
  updated_at: string
  committee: Omit<PublicCommitteeRecord, 'id'> | null
  member: {
    full_name: string
    father_name: string | null
    member_no: string | null
    district: string | null
    taluka: string | null
    status: string
  }
  photoSignedUrl?: string | null
}

const committeePublicSelect = [
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
  'created_at',
  'updated_at',
].join(', ')

const committeeMemberPublicSelect = [
  'id',
  'committee_id',
  'member_id',
  'designation_title',
  'status',
  'sort_order',
  'tenure_start',
  'tenure_end',
  'member_no_snapshot',
  'full_name_snapshot',
  'father_name_snapshot',
  'district_snapshot',
  'taluka_snapshot',
  'created_at',
  'updated_at',
].join(', ')

const memberCardSelect = [
  'id',
  'user_id',
  'full_name',
  'father_name',
  'member_no',
  'district',
  'taluka',
  'photo_url',
  'status',
].join(', ')

export function formatOrganizationDate(value: string | null | undefined) {
  if (!value) return 'N/A'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTenure(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return 'Tenure not set'
  if (start && end) return `${formatOrganizationDate(start)} – ${formatOrganizationDate(end)}`
  if (start) return `From ${formatOrganizationDate(start)}`
  return `Until ${formatOrganizationDate(end)}`
}

export function getCommitteeLocation(
  committee: Pick<PublicCommitteeRecord, 'committee_type' | 'division' | 'district' | 'taluka'>,
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

export function getInitials(name: string | null | undefined) {
  const parts = (name || 'JWAS')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return parts
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join('') || 'JWAS'
}


export function formatOfficeBearerDisplayText(value: string | null | undefined) {
  return (value || '')
    .replace(/\bRepresenttive\b/gi, 'Representative')
    .replace(/\bRepresenntive\b/gi, 'Representative')
    .replace(/\bRepresentive\b/gi, 'Representative')
    .replace(/\bJatt\s*Alliance\s*Sindh\b/gi, 'Jatt Welfare Alliance Sindh')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildOfficeBearerId(record: Pick<PublicCommitteeMemberRecord, 'id' | 'created_at'>) {
  if (/^JAS-OB-\d{4}-[A-F0-9]{8}$/.test(record.id)) return record.id
  const year = new Date(record.created_at || Date.now()).getUTCFullYear()
  const shortId = record.id.replace(/-/g, '').slice(0, 8).toUpperCase()
  return `JAS-OB-${year}-${shortId}`
}

export function getPublicSiteBaseUrl() {
  const configuredUrl =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_URL ||
    ''

  const cleanedConfiguredUrl = String(configuredUrl).trim().replace(/\/+$/, '')
  if (cleanedConfiguredUrl) return cleanedConfiguredUrl

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '')
  }

  return ''
}

export function getOfficeBearerVerificationUrl(record: Pick<PublicCommitteeMemberRecord, 'id' | 'created_at'>) {
  const baseUrl = getPublicSiteBaseUrl()
  const path = `/verify/office-bearer/${encodeURIComponent(buildOfficeBearerId(record))}`
  return baseUrl ? `${baseUrl}${path}` : path
}

export async function fetchOfficeBearerVerification(officeBearerId: string) {
  return verifyOfficeBearerAction({ data: officeBearerId })
}

export async function fetchPublicCommittees() {
  const { data,error }=await supabase.rpc('get_public_committee_directory',{})
  if(error) throw error
  return (data ?? []) as unknown as PublicCommitteeRecord[]
}

export async function fetchPublicCommitteeDetails(id:string):Promise<PublicCommitteeDetails | null> {
  const { data,error }=await supabase.rpc('get_public_committee_directory',{_committee_id:id})
  if(error) throw error
  return ((data ?? []) as unknown as PublicCommitteeDetails[])[0] ?? null
}

export async function fetchMyDesignationCards() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Login required to view designation cards.')
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select(memberCardSelect)
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle()

  if (memberError) throw memberError
  if (!member) return []

  return fetchDesignationCardsForMember(member as unknown as DesignationCardMember)
}

export async function fetchDesignationCardsForAdminMember(memberId: string) {
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select(memberCardSelect)
    .eq('id', memberId)
    .maybeSingle()

  if (memberError) throw memberError
  if (!member) return []

  return fetchDesignationCardsForMember(member as unknown as DesignationCardMember)
}

async function fetchDesignationCardsForMember(member: DesignationCardMember) {
  const { data: memberships, error } = await supabase
    .from('organization_committee_members' as never)
    .select(committeeMemberPublicSelect)
    .eq('member_id' as never, member.id as never)
    .eq('status' as never, 'active' as never)
    .order('sort_order' as never, { ascending: true })
    .order('created_at' as never, { ascending: true })

  if (error) throw error

  const rows = (memberships ?? []) as unknown as (PublicCommitteeMemberRecord & { committee_id: string; member_id: string })[]
  if (!rows.length) return []

  const committeeIds = [...new Set(rows.map((row) => row.committee_id))]
  const { data: committees, error: committeeError } = await supabase
    .from('organization_committees' as never)
    .select(committeePublicSelect)
    .in('id' as never, committeeIds as never)

  if (committeeError) throw committeeError

  const committeeMap = new Map(
    ((committees ?? []) as unknown as PublicCommitteeRecord[]).map((committee) => [committee.id, committee]),
  )

  const photoSignedUrl = await createPhotoSignedUrl(member.photo_url)

  return rows.map((row) => ({
    ...row,
    committee: committeeMap.get(row.committee_id) ?? null,
    member,
    photoSignedUrl,
  })) satisfies DesignationCardRecord[]
}

async function createPhotoSignedUrl(path: string | null | undefined) {
  if (!path) return null

  const { data, error } = await supabase.storage
    .from('member-photos')
    .createSignedUrl(path, 60 * 60)

  if (error || !data?.signedUrl) return null

  const dataUrl = await imageUrlToDataUrl(data.signedUrl)
  return dataUrl || data.signedUrl
}

async function imageUrlToDataUrl(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Unable to read image data.'))
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export { getCommitteeStatusClass, getCommitteeStatusLabel, getCommitteeTypeLabel }
