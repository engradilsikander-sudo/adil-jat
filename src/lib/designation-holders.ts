import { supabase } from './supabase/client'
import { formatTenure, getInitials } from './committees-public'

export const designationHolderLevelOrder = [
  'central',
  'central_advisory',
  'provincial',
  'divisional',
  'district',
  'taluka',
] as const

export type DesignationHolderLevel = (typeof designationHolderLevelOrder)[number]

export type PublicDesignationHolderRecord = {
  public_key: string
  member_no: string | null
  full_name: string
  father_name: string | null
  photo_url: string | null
  photo_signed_url?: string | null
  level: DesignationHolderLevel
  level_label: string
  designation_title: string
  committee_name: string
  division: string | null
  district: string | null
  taluka: string | null
  tenure_start: string | null
  tenure_end: string | null
  sort_order: number
  assigned_at: string
}

export function getDesignationHolderLevelLabel(level: string | null | undefined) {
  switch (level) {
    case 'central':
      return 'CEC'
    case 'central_advisory':
      return 'Advisory'
    case 'provincial':
      return 'Provincial'
    case 'divisional':
      return 'Divisional'
    case 'district':
      return 'District'
    case 'taluka':
      return 'Taluka'
    default:
      return 'Level'
  }
}

export function getDesignationHolderLevelRank(level: string | null | undefined) {
  const index = designationHolderLevelOrder.indexOf(level as DesignationHolderLevel)
  return index >= 0 ? index + 1 : designationHolderLevelOrder.length + 1
}

export function getDesignationHolderLocation(holder: Pick<PublicDesignationHolderRecord, 'level' | 'division' | 'district' | 'taluka'>) {
  if (holder.level === 'central') return 'Sindh / Central Executive Committee'
  if (holder.level === 'central_advisory') return 'Sindh / Central Advisory Committee'
  if (holder.level === 'provincial') return 'Sindh / Provincial'
  if (holder.level === 'divisional') return holder.division || 'Division not set'
  if (holder.level === 'district') return holder.district || 'District not set'
  return [holder.taluka, holder.district].filter(Boolean).join(', ') || 'Taluka not set'
}

export function getDesignationHolderSearchText(holder: PublicDesignationHolderRecord) {
  return [
    holder.full_name,
    holder.father_name,
    holder.designation_title,
    holder.level_label,
    holder.committee_name,
    holder.member_no,
    holder.division,
    holder.district,
    holder.taluka,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function sortDesignationHolders(holders: PublicDesignationHolderRecord[]) {
  return [...holders].sort((a, b) => {
    const levelRank = getDesignationHolderLevelRank(a.level) - getDesignationHolderLevelRank(b.level)
    if (levelRank !== 0) return levelRank

    const areaRank = getDesignationHolderLocation(a).localeCompare(getDesignationHolderLocation(b))
    if (areaRank !== 0) return areaRank

    const sortOrderRank = (a.sort_order ?? 999) - (b.sort_order ?? 999)
    if (sortOrderRank !== 0) return sortOrderRank

    return a.full_name.localeCompare(b.full_name)
  })
}

export function formatDesignationHolderTenure(holder: Pick<PublicDesignationHolderRecord, 'tenure_start' | 'tenure_end'>) {
  return formatTenure(holder.tenure_start, holder.tenure_end)
}

export function getDesignationHolderInitials(name: string | null | undefined) {
  return getInitials(name)
}

export async function fetchPublicDesignationHolders() {
  const rpcResult = await supabase.rpc('get_public_designation_holders' as never)

  if (rpcResult.error) {
    throw rpcResult.error
  }

  const rows = (rpcResult.data ?? []) as unknown as PublicDesignationHolderRecord[]
  return attachSignedPhotoUrls(sortDesignationHolders(rows))
}

async function attachSignedPhotoUrls(holders: PublicDesignationHolderRecord[]) {
  const withPhotos = await Promise.all(
    holders.map(async (holder) => ({
      ...holder,
      photo_signed_url: await createPhotoSignedUrl(holder.photo_url),
    })),
  )

  return withPhotos
}

async function createPhotoSignedUrl(path: string | null | undefined) {
  if (!path) return null

  const { data, error } = await supabase.storage
    .from('member-photos')
    .createSignedUrl(path, 60 * 60)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
