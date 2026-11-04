import { supabase } from './supabase/client'
import { getMemberCardExportDateStart, sanitizeMemberCardExportSearch } from './admin-member-card-export-core'
import type { MemberCardExportDateFilter, MemberCardExportSortBy, MemberCardExportStatusFilter } from './admin-member-card-export-core'

/** Directory queries intentionally do not reuse CSV pagination: pagination and
 * area filtering must happen together inside PostgreSQL before counting. */
export type AdminDirectoryMember = {
  id: string
  full_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  photo_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  member_no: string | null
  created_at: string
}

export type AdminDirectoryStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  cards: number
}

export type AdminDirectoryLocation = { district: string; taluka: string | null }
export type AdminDirectorySummary = {
  stats: AdminDirectoryStats
  locations: AdminDirectoryLocation[]
}
export type AdminDirectoryPage = { rows: AdminDirectoryMember[]; total: number }
export type AdminDirectoryFilters = {
  status: MemberCardExportStatusFilter
  district: string
  taluka: string
  date: MemberCardExportDateFilter
  search: string
  sort: MemberCardExportSortBy
  page: number
}

export const ADMIN_DIRECTORY_PAGE_SIZE = 50

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Unexpected membership directory response. Check the UX.6 database migration.')
  }
  return value as Record<string, unknown>
}

function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('Invalid membership count returned by the database.')
  }
  return value as number
}

export function parseAdminDirectorySummary(data: unknown): AdminDirectorySummary {
  const raw = record(data)
  const stats = record(raw.stats)
  if (!Array.isArray(raw.locations)) {
    throw new Error('Invalid membership location facets returned by the database.')
  }
  return {
    stats: {
      total: count(stats.total),
      pending: count(stats.pending),
      approved: count(stats.approved),
      rejected: count(stats.rejected),
      cards: count(stats.cards),
    },
    locations: raw.locations.map((location) => {
      const item = record(location)
      if (typeof item.district !== 'string' || !item.district.trim() ||
          (item.taluka !== null && typeof item.taluka !== 'string')) {
        throw new Error('Invalid membership location returned by the database.')
      }
      return { district: item.district, taluka: item.taluka as string | null }
    }),
  }
}

export function parseAdminDirectoryPage(data: unknown): AdminDirectoryPage {
  const raw = record(data)
  if (!Array.isArray(raw.rows)) {
    throw new Error('Invalid membership directory page returned by the database.')
  }
  const total = count(raw.total)
  if (raw.rows.length > ADMIN_DIRECTORY_PAGE_SIZE || raw.rows.length > total) {
    throw new Error('Inconsistent membership directory page returned by the database.')
  }
  const rows = raw.rows.map((value) => {
    const row = record(value)
    if (typeof row.id !== 'string' || typeof row.full_name !== 'string' ||
        typeof row.district !== 'string' || typeof row.created_at !== 'string' ||
        !['pending', 'approved', 'rejected'].includes(String(row.status))) {
      throw new Error('Invalid membership directory member returned by the database.')
    }
    return row as unknown as AdminDirectoryMember
  })
  return { rows, total }
}

export async function fetchAdminDirectorySummary(): Promise<AdminDirectorySummary> {
  const { data, error } = await supabase.rpc('membership_admin_directory_summary' as never)
  if (error) throw error
  return parseAdminDirectorySummary(data)
}

export async function fetchAdminDirectoryPage(filters: AdminDirectoryFilters): Promise<AdminDirectoryPage> {
  if (!Number.isSafeInteger(filters.page) || filters.page < 0) {
    throw new Error('Invalid membership directory page requested.')
  }
  const { data, error } = await supabase.rpc('membership_admin_directory_page' as never, {
    _status: filters.status,
    _district: filters.district,
    _taluka: filters.taluka,
    _created_from: getMemberCardExportDateStart(filters.date),
    _search: sanitizeMemberCardExportSearch(filters.search),
    _sort: filters.sort,
    _page: filters.page,
    _page_size: ADMIN_DIRECTORY_PAGE_SIZE,
  } as never)
  if (error) throw error
  return parseAdminDirectoryPage(data)
}
