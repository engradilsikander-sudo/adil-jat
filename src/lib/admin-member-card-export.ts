import { filterRowsByAreaAccess } from './area-permissions'
import type { MemberCardCsvSource } from './admin-member-card-csv'
import {
  buildMemberCardExportAuditMetadata,
  buildMemberCardExportSearchFilter,
  collectMemberCardExportPages,
  getMemberCardExportDateStart,
  type FetchMembersForCardCsvOptions,
  type MemberCardExportAuditInput,
} from './admin-member-card-export-core'
import { supabase } from './supabase/client'

export {
  buildMemberCardExportAuditMetadata,
  buildMemberCardExportFileName,
  buildMemberCardExportSearchFilter,
  collectMemberCardExportPages,
  getMemberCardExportDateStart,
  sanitizeMemberCardExportSearch,
  MEMBER_CARD_EXPORT_PAGE_SIZE,
} from './admin-member-card-export-core'
export type {
  FetchMembersForCardCsvOptions,
  MemberCardExportAuditInput,
  MemberCardExportDateFilter,
  MemberCardExportSortBy,
  MemberCardExportStatusFilter,
} from './admin-member-card-export-core'

const MEMBER_CARD_EXPORT_FIELDS = [
  'id',
  'member_no',
  'full_name',
  'father_name',
  'cnic',
  'mobile',
  'district',
  'taluka',
  'profession',
  'caste_branch',
  'photo_url',
  'status',
  'approved_at',
  'address',
  'date_of_birth',
  'gender',
  'education',
  'blood_group',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_mobile',
  'declaration_accepted',
  'created_at',
].join(', ')

export async function fetchMembersForCardCsv(
  options: FetchMembersForCardCsvOptions,
) {
  const members = await collectMemberCardExportPages(async (from, to) => {
    let query = supabase.from('members').select(MEMBER_CARD_EXPORT_FIELDS)

    if (options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter)
    }

    if (options.districtFilter !== 'all') {
      query = query.eq('district', options.districtFilter)
    }

    if (options.talukaFilter !== 'all') {
      query = query.eq('taluka', options.talukaFilter)
    }

    const dateStart = getMemberCardExportDateStart(options.dateFilter)
    if (dateStart) {
      query = query.gte('created_at', dateStart)
    }

    const searchFilter = buildMemberCardExportSearchFilter(options.search)
    if (searchFilter) {
      query = query.or(searchFilter)
    }

    if (options.sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true })
    } else if (options.sortBy === 'name') {
      query = query
        .order('full_name', { ascending: true })
        .order('created_at', { ascending: false })
    } else if (options.sortBy === 'district') {
      query = query
        .order('district', { ascending: true })
        .order('taluka', { ascending: true })
        .order('created_at', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
      .range(from, to)
      .returns<MemberCardCsvSource[]>()

    if (error) throw error
    return data ?? []
  })

  return filterRowsByAreaAccess(members, options.areaAccess)
}

export async function logMemberCardCsvExportAudit(
  input: MemberCardExportAuditInput,
) {
  const metadata = buildMemberCardExportAuditMetadata(input)
  const { data, error } = await supabase.rpc(
    'log_member_card_csv_export' as never,
    {
      _record_count: metadata.recordCount,
      _filters: metadata.filters,
      _area_scope: metadata.areaScope,
      _file_name: metadata.fileName,
      _card_version: metadata.cardVersion,
    } as never,
  )

  if (error) {
    throw new Error(
      `CSV export was blocked because its audit log could not be recorded: ${error.message}`,
    )
  }

  return data as unknown as string
}
