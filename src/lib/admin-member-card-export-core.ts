import type { AdminAreaAccessContext } from './area-permissions'
import type { MemberCardCsvSource } from './admin-member-card-csv'
import { MEMBER_CARD_VERSION } from './member-card-config'

export type MemberCardExportStatusFilter =
  | 'all'
  | MemberCardCsvSource['status']
export type MemberCardExportDateFilter = 'all' | 'today' | '7d' | '30d'
export type MemberCardExportSortBy = 'newest' | 'oldest' | 'name' | 'district'

export type FetchMembersForCardCsvOptions = {
  statusFilter: MemberCardExportStatusFilter
  districtFilter: string
  talukaFilter: string
  dateFilter: MemberCardExportDateFilter
  sortBy: MemberCardExportSortBy
  search: string
  areaAccess: AdminAreaAccessContext
}

export type MemberCardExportAuditInput = FetchMembersForCardCsvOptions & {
  recordCount: number
  fileName: string
}

export type MemberCardExportPageFetcher = (
  from: number,
  to: number,
) => Promise<MemberCardCsvSource[]>

export const MEMBER_CARD_EXPORT_PAGE_SIZE = 1000

export async function collectMemberCardExportPages(
  fetchPage: MemberCardExportPageFetcher,
  pageSize = MEMBER_CARD_EXPORT_PAGE_SIZE,
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error('Member card export page size must be a positive integer.')
  }

  const allMembers: MemberCardCsvSource[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const page = await fetchPage(from, to)
    allMembers.push(...page)

    if (page.length < pageSize) break
    from += pageSize
  }

  return allMembers
}

export function sanitizeMemberCardExportSearch(search: string) {
  return search
    .trim()
    .replace(/[%,]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

export function buildMemberCardExportSearchFilter(search: string) {
  const value = sanitizeMemberCardExportSearch(search)
  if (!value) return ''

  const pattern = `%${value}%`

  return [
    `full_name.ilike.${pattern}`,
    `cnic.ilike.${pattern}`,
    `mobile.ilike.${pattern}`,
    `district.ilike.${pattern}`,
    `taluka.ilike.${pattern}`,
    `member_no.ilike.${pattern}`,
  ].join(',')
}

export function getMemberCardExportDateStart(
  filter: MemberCardExportDateFilter,
  now = new Date(),
) {
  if (filter === 'all') return null

  const date = new Date(now)

  if (filter === 'today') {
    date.setHours(0, 0, 0, 0)
  } else if (filter === '7d') {
    date.setDate(date.getDate() - 7)
  } else {
    date.setDate(date.getDate() - 30)
  }

  return date.toISOString()
}

export function buildMemberCardExportFileName(now = new Date()) {
  return `jas-member-card-data-full-${now.toISOString().slice(0, 10)}.csv`
}

export function buildMemberCardExportAuditMetadata(
  input: MemberCardExportAuditInput,
) {
  const sanitizedSearch = sanitizeMemberCardExportSearch(input.search)

  return {
    recordCount: input.recordCount,
    fileName: input.fileName,
    cardVersion: MEMBER_CARD_VERSION,
    areaScope: input.areaAccess.summary || 'All permitted membership records',
    filters: {
      status: input.statusFilter,
      district: input.districtFilter,
      taluka: input.talukaFilter,
      date: input.dateFilter,
      sort: input.sortBy,
      searchApplied: sanitizedSearch.length > 0,
      searchLength: sanitizedSearch.length,
      restrictedAreaAccess: input.areaAccess.isRestricted,
    },
  }
}
