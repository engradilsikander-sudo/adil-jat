import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  BadgeCheck,
  Download,
  Filter,
  IdCard,
  ImageOff,
  ListChecks,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import {
  formatDisplayDate as formatDate,
  maskCnic,
  maskMobile,
} from '../../lib/shared/formatters'

export type AdminMemberStatus = 'pending' | 'approved' | 'rejected'
export type AdminStatusFilter = 'all' | AdminMemberStatus
export type AdminDateFilter = 'all' | 'today' | '7d' | '30d'
export type AdminSortBy = 'newest' | 'oldest' | 'name' | 'district'

export type AdminMemberListItem = {
  id: string
  full_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  photo_url: string | null
  status: AdminMemberStatus
  member_no: string | null
  created_at: string
}

export type AdminMemberStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  cards: number
}

type AdminMemberStatsGridProps = {
  stats: AdminMemberStats
  statusFilter: AdminStatusFilter
  onStatusFilterChange: (value: AdminStatusFilter) => void
}

type AdminMemberManagementProps = {
  members: AdminMemberListItem[]
  filteredMembers: AdminMemberListItem[]
  photoUrls: Record<string, string>
  showSensitive: boolean
  hasActiveFilters: boolean
  statusFilter: AdminStatusFilter
  districtFilter: string
  districtOptions: string[]
  talukaFilter: string
  talukaOptions: string[]
  dateFilter: AdminDateFilter
  sortBy: AdminSortBy
  search: string
  onStatusFilterChange: (value: AdminStatusFilter) => void
  onDistrictFilterChange: (value: string) => void
  onTalukaFilterChange: (value: string) => void
  onDateFilterChange: (value: AdminDateFilter) => void
  onSortChange: (value: AdminSortBy) => void
  onSearchChange: (value: string) => void
  onResetFilters: () => void
  onExportCsv: () => void
}

export function AdminMemberStatsGrid({
  stats,
  statusFilter,
  onStatusFilterChange,
}: AdminMemberStatsGridProps) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
      <StatCard
        label="Total Members"
        value={stats.total}
        tone="slate"
        icon={<Users className="h-5 w-5" />}
        active={statusFilter === 'all'}
        onClick={() => onStatusFilterChange('all')}
      />
      <StatCard
        label="Pending Review"
        value={stats.pending}
        tone="amber"
        icon={<ListChecks className="h-5 w-5" />}
        active={statusFilter === 'pending'}
        onClick={() => onStatusFilterChange('pending')}
      />
      <StatCard
        label="Approved"
        value={stats.approved}
        tone="emerald"
        icon={<UserCheck className="h-5 w-5" />}
        active={statusFilter === 'approved'}
        onClick={() => onStatusFilterChange('approved')}
      />
      <StatCard
        label="Rejected"
        value={stats.rejected}
        tone="red"
        icon={<XCircle className="h-5 w-5" />}
        active={statusFilter === 'rejected'}
        onClick={() => onStatusFilterChange('rejected')}
      />
      <StatCard
        label="Cards Issued"
        value={stats.cards}
        tone="gold"
        icon={<IdCard className="h-5 w-5" />}
        active={false}
        onClick={() => onStatusFilterChange('approved')}
      />
    </div>
  )
}

export function AdminMemberManagement({
  members,
  filteredMembers,
  photoUrls,
  showSensitive,
  hasActiveFilters,
  statusFilter,
  districtFilter,
  districtOptions,
  talukaFilter,
  talukaOptions,
  dateFilter,
  sortBy,
  search,
  onStatusFilterChange,
  onDistrictFilterChange,
  onTalukaFilterChange,
  onDateFilterChange,
  onSortChange,
  onSearchChange,
  onResetFilters,
  onExportCsv,
}: AdminMemberManagementProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
            <Filter className="h-3.5 w-3.5" />
            Membership management
          </div>

          <h2 className="mt-3 text-lg font-black text-slate-950">
            Member Applications
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Showing {filteredMembers.length} of {members.length} members.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={filteredMembers.length === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export Full Card CSV
          </button>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px_160px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
            placeholder="Search name, CNIC, mobile, district..."
            aria-label="Search members"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            onStatusFilterChange(event.target.value as AdminStatusFilter)
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
          aria-label="Filter members by status"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={districtFilter}
          onChange={(event) => onDistrictFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
          aria-label="Filter members by district"
        >
          <option value="all">All districts</option>
          {districtOptions.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>

        <select
          value={talukaFilter}
          onChange={(event) => onTalukaFilterChange(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
          aria-label="Filter members by taluka"
        >
          <option value="all">All talukas</option>
          {talukaOptions.map((taluka) => (
            <option key={taluka} value={taluka}>
              {taluka}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(event) => onDateFilterChange(event.target.value as AdminDateFilter)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 md:text-sm"
          aria-label="Filter members by registration date"
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-500">
          CSV export includes full unmasked front/back card data. The
          on-screen table can remain masked.
        </p>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as AdminSortBy)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          aria-label="Sort members"
        >
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
          <option value="name">Sort: Name A-Z</option>
          <option value="district">Sort: District A-Z</option>
        </select>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {filteredMembers.map((member) => (
          <MobileMemberCard
            key={member.id}
            member={member}
            photoUrl={photoUrls[member.id]}
            showSensitive={showSensitive}
          />
        ))}

        {filteredMembers.length === 0 ? (
          <EmptyState
            title="No members found"
            message="Try changing the search text or filters."
          />
        ) : null}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">CNIC / Mobile</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Member No</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Digital Card</th>
              <th className="px-4 py-3 text-right">Application</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map((member) => (
              <tr
                key={member.id}
                className="bg-white transition hover:bg-slate-50/70"
              >
                <td className="px-4 py-3">
                  <MemberPhoto
                    src={photoUrls[member.id]}
                    alt={member.full_name}
                    className="h-12 w-12 rounded-xl object-cover object-top ring-1 ring-slate-200"
                    fallbackClassName="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                    fallbackText={<ImageOff className="h-4 w-4" />}
                  />
                </td>

                <td className="px-4 py-3">
                  <div className="font-bold text-slate-950">
                    {member.full_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {member.id.slice(0, 8)}...
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-700">
                  <div className="font-semibold">
                    {showSensitive ? member.cnic : maskCnic(member.cnic)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {showSensitive ? member.mobile : maskMobile(member.mobile)}
                  </div>
                </td>

                <td className="px-4 py-3 text-slate-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                    {member.district}
                  </div>
                  <div className="text-xs text-slate-500">
                    {member.taluka || 'No taluka'}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={member.status} />
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {member.member_no ? (
                    <span className="font-bold">{member.member_no}</span>
                  ) : (
                    <span className="text-slate-400">Not issued</span>
                  )}
                </td>

                <td className="px-4 py-3 text-slate-700">
                  {formatDate(member.created_at)}
                </td>

                <td className="px-4 py-3">
                  <CardAccess member={member} layout="desktop" />
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <ViewApplicationLink memberId={member.id} />
                  </div>
                </td>
              </tr>
            ))}

            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6">
                  <EmptyState
                    title="No members found"
                    message="Try changing the search text or filters."
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MobileMemberCard({
  member,
  photoUrl,
  showSensitive,
}: {
  member: AdminMemberListItem
  photoUrl?: string
  showSensitive: boolean
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <MemberPhoto
          src={photoUrl}
          alt={member.full_name}
          className="h-14 w-14 shrink-0 rounded-xl object-cover object-top ring-1 ring-slate-200"
          fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200"
          fallbackText={<ImageOff className="h-4 w-4" />}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="min-w-0 text-base font-black leading-tight text-slate-950">
              {member.full_name}
            </h2>

            <StatusBadge status={member.status} />
          </div>

          <p className="mt-1 break-all text-xs font-medium text-slate-500">
            CNIC: {showSensitive ? member.cnic : maskCnic(member.cnic)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Submitted: {formatDate(member.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-500">Location</p>
          <p className="mt-1 font-bold text-slate-950">{member.district}</p>
          <p className="text-xs text-slate-500">{member.taluka || 'No taluka'}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase text-slate-500">Member No</p>
          <p className="mt-1 break-all font-bold text-slate-950">
            {member.member_no ?? 'Not issued'}
          </p>
          <p className="text-xs text-slate-500">
            {showSensitive ? member.mobile : maskMobile(member.mobile)}
          </p>
        </div>
      </div>

      <CardAccess member={member} layout="mobile" />

      <div className="mt-4">
        <ViewApplicationLink memberId={member.id} fullWidth />
      </div>
    </article>
  )
}

function StatCard({
  label,
  value,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string
  value: number
  tone: 'slate' | 'amber' | 'emerald' | 'red' | 'gold'
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  const toneStyles: Record<
    'slate' | 'amber' | 'emerald' | 'red' | 'gold',
    string
  > = {
    slate: active
      ? 'border-slate-300 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50',
    amber: active
      ? 'border-amber-300 bg-amber-500 text-white'
      : 'border-amber-100 bg-amber-50 text-amber-900 hover:bg-amber-100',
    emerald: active
      ? 'border-emerald-300 bg-emerald-600 text-white'
      : 'border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    red: active
      ? 'border-red-300 bg-red-600 text-white'
      : 'border-red-100 bg-red-50 text-red-900 hover:bg-red-100',
    gold: 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-950 hover:from-amber-100 hover:to-yellow-100',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left shadow-sm transition ${toneStyles[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              active ? 'text-white/75' : 'opacity-70'
            }`}
          >
            {label}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>

        <span className={active ? 'text-white/80' : 'opacity-75'}>{icon}</span>
      </div>
    </button>
  )
}

function CardAccess({
  member,
  layout,
}: {
  member: AdminMemberListItem
  layout: 'mobile' | 'desktop'
}) {
  const isReady = canOpenMemberCard(member)

  if (isReady) {
    return (
      <div
        className={
          layout === 'mobile'
            ? 'mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-slate-950 via-slate-900 to-black p-3 shadow-sm'
            : 'min-w-[190px]'
        }
      >
        {layout === 'mobile' ? (
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              Digital Member Card
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Same card design as member dashboard.
            </p>
          </div>
        ) : null}

        <Link
          to="/admin/members/$id/card"
          params={{ id: member.id }}
          className={
            layout === 'mobile'
              ? 'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black !text-slate-950 no-underline shadow-sm transition hover:bg-amber-300 hover:!text-slate-950'
              : 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-bold !text-amber-900 no-underline shadow-sm transition hover:bg-amber-100 hover:!text-amber-950'
          }
          style={layout === 'mobile' ? { color: '#020617' } : undefined}
        >
          <IdCard className="h-4 w-4" />
          Open Same Member Card
        </Link>
      </div>
    )
  }

  const message =
    member.status !== 'approved'
      ? 'Card available after approval'
      : 'Member no not issued yet'

  return (
    <div
      className={
        layout === 'mobile'
          ? 'mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3'
          : 'min-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'
      }
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Digital Card
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">{message}</p>
    </div>
  )
}

function ViewApplicationLink({
  memberId,
  fullWidth = false,
}: {
  memberId: string
  fullWidth?: boolean
}) {
  return (
    <Link
      to="/admin/members/$id"
      params={{ id: memberId }}
      className={`jas-dark-action-link inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold no-underline shadow-sm transition ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <ShieldCheck className="h-4 w-4" />
      View Application
    </Link>
  )
}

function MemberPhoto({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackText,
}: {
  src?: string
  alt: string
  className: string
  fallbackClassName: string
  fallbackText: ReactNode
}) {
  if (!src) {
    return <div className={fallbackClassName}>{fallbackText}</div>
  }

  return <img src={src} alt={alt} className={className} />
}

function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-6 text-center ring-1 ring-slate-100">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: AdminMemberStatus }) {
  const config: Record<
    AdminMemberStatus,
    {
      icon: ReactNode
      className: string
      text: string
    }
  > = {
    pending: {
      icon: <ListChecks className="h-3.5 w-3.5" />,
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
      text: 'Pending',
    },
    approved: {
      icon: <BadgeCheck className="h-3.5 w-3.5" />,
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      text: 'Approved',
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: 'bg-red-50 text-red-700 ring-red-200',
      text: 'Rejected',
    },
  }

  const item = config[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${item.className}`}
    >
      {item.icon}
      {item.text}
    </span>
  )
}

function canOpenMemberCard(member: AdminMemberListItem) {
  return member.status === 'approved' && Boolean(member.member_no)
}
