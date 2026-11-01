import {
  Link,
  Outlet,
  createFileRoute,
  useRouterState,
} from '@tanstack/react-router'
import { AdminShell } from '../../../components/admin/AdminShell'
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarDays,
  ClipboardList,
  Download,
  Filter,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useAdminProgramsCopy } from '../../../lib/admin-programs-i18n'
import {
  getEducationStatusClass,
  getEducationStatusLabel,
  type EducationApplicationDetails,
} from '../../../lib/programs/education'
import {
  filterRowsByAreaAccess,
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from '../../../lib/area-permissions'

export const Route = createFileRoute('/admin/programs/education')({
  component: AdminEducationRoute,
})

type EducationApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  relationship_to_member: string
  phone: string
  district: string | null
  taluka: string | null
  details: EducationApplicationDetails | null
  status: string
  assigned_admin_id: string | null
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  created_at: string
}

const statusOptions = [
  'all',
  'submitted',
  'under_review',
  'need_more_info',
  'approved',
  'rejected',
  'paid_completed',
  'completed',
]

function AdminEducationRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const normalizedPathname = pathname.replace(/\/+$/, '')

  if (normalizedPathname === '/admin/programs/education') {
    return <AdminEducationApplicationsPage />
  }

  return <Outlet />
}

function AdminEducationApplicationsPage() {
  const { copy } = useAdminProgramsCopy('education')
  const [applications, setApplications] = useState<
    EducationApplicationListItem[]
  >([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [areaNotice, setAreaNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [talukaFilter, setTalukaFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    setMessage('')
    setAreaNotice('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('Admin panel dekhne ke liye pehle login karen.')
      setApplications([])
      setLoading(false)
      return
    }


    const areaAccess = await loadCurrentAdminAreaAccess('education', 'view', {
      requiredRoles: ['admin', 'super_admin', 'education_admin'],
    })

    if (!areaAccess.ok) {
      setMessage(areaAccess.message)
      setApplications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select(
        'id, application_no, applicant_name, membership_no, relationship_to_member, phone, district, taluka, details, status, assigned_admin_id, admin_remarks, approved_amount, submitted_at, created_at',
      )
      .eq('program_key', 'education')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setApplications([])
      setLoading(false)
      return
    }

    const scopedApplications = filterRowsByAreaAccess(
      (data || []) as unknown as EducationApplicationListItem[],
      areaAccess,
    )

    setApplications(scopedApplications)
    setAreaNotice(getAreaAccessSummaryText(areaAccess))
    setLoading(false)
  }

  const districtOptions = useMemo(
    () => getUniqueOptions(applications.map((item) => item.district)),
    [applications],
  )

  const talukaOptions = useMemo(() => {
    const scopedApplications =
      districtFilter === 'all'
        ? applications
        : applications.filter(
            (item) => normalizeValue(item.district) === districtFilter,
          )

    return getUniqueOptions(scopedApplications.map((item) => item.taluka))
  }, [applications, districtFilter])

  useEffect(() => {
    if (
      talukaFilter !== 'all' &&
      !talukaOptions.some((item) => item.value === talukaFilter)
    ) {
      setTalukaFilter('all')
    }
  }, [talukaFilter, talukaOptions])

  const filteredApplications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    return applications.filter((item) => {
      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter

      const matchesDistrict =
        districtFilter === 'all'
          ? true
          : normalizeValue(item.district) === districtFilter

      const matchesTaluka =
        talukaFilter === 'all'
          ? true
          : normalizeValue(item.taluka) === talukaFilter

      const details = item.details || {}

      const matchesSearch = q
        ? [
            item.application_no,
            item.applicant_name,
            item.membership_no,
            item.phone,
            item.district,
            item.taluka,
            details.institute_name,
            details.class_degree,
            details.board_university,
            details.support_type,
            details.required_amount,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        : true

      return (
        matchesStatus && matchesDistrict && matchesTaluka && matchesSearch
      )
    })
  }, [applications, districtFilter, searchTerm, statusFilter, talukaFilter])

  const stats = useMemo(() => {
    return {
      total: applications.length,
      filtered: filteredApplications.length,
      submitted: applications.filter((item) => item.status === 'submitted')
        .length,
      underReview: applications.filter((item) => item.status === 'under_review')
        .length,
      approved: applications.filter((item) => item.status === 'approved').length,
      completed: applications.filter((item) =>
        ['paid_completed', 'completed'].includes(item.status),
      ).length,
    }
  }, [applications, filteredApplications.length])

  function resetFilters() {
    setStatusFilter('all')
    setDistrictFilter('all')
    setTalukaFilter('all')
    setSearchTerm('')
  }

  return (
    <AdminShell title="Education Program" subtitle="Review scholarship, fee support and education assistance applications.">
      <div className="admin-nested-page admin-program-admin-page">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm font-bold text-amber-300 no-underline hover:text-amber-200"
          >
            {copy.common.backToAdmin}
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <GraduationCap className="h-4 w-4 text-amber-300" />
                {copy.program.adminBadge}
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                {copy.program.listTitle}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Scholarship, fee support aur skills training applications ko
                district/taluka filters, CSV report, reviewer assignment aur
                document verification ke sath manage karen.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={() => exportEducationCsv(filteredApplications)}
                disabled={loading || filteredApplications.length === 0}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="mr-2 h-4 w-4" />
                {copy.common.exportCsv}
              </button>

              <button
                type="button"
                onClick={loadApplications}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >

          {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {copy.common.refresh}
              </button>
            </div>
          </div>
        </div>
      </section>

      {areaNotice ? (
        <section className="px-4 pt-6">
          <div className="mx-auto max-w-7xl">
            <div className="inline-flex max-w-full items-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-black text-amber-900 shadow-sm">
              {areaNotice}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-4 md:grid-cols-6">
            <StatCard
              title={copy.common.total}
              value={stats.total}
              icon={<ClipboardList className="h-5 w-5" />}
            />
            <StatCard
              title={copy.common.filtered}
              value={stats.filtered}
              icon={<Filter className="h-5 w-5" />}
            />
            <StatCard
              title={copy.common.submitted}
              value={stats.submitted}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatCard
              title={copy.common.underReview}
              value={stats.underReview}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <StatCard
              title={copy.common.approved}
              value={stats.approved}
              icon={<UserCheck className="h-5 w-5" />}
            />
            <StatCard
              title="Completed"
              value={stats.completed}
              icon={<BadgeIndianRupee className="h-5 w-5" />}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_220px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={copy.program.searchPlaceholder}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-semibold outline-none transition focus:border-amber-500"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all'
                      ? copy.common.allStatuses
                      : getEducationStatusLabel(status)}
                  </option>
                ))}
              </select>

              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
              >
                <option value="all">{copy.common.allDistricts}</option>
                {districtOptions.map((district) => (
                  <option key={district.value} value={district.value}>
                    {district.label}
                  </option>
                ))}
              </select>

              <select
                value={talukaFilter}
                onChange={(event) => setTalukaFilter(event.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
              >
                <option value="all">{copy.common.allTalukas}</option>
                {talukaOptions.map((taluka) => (
                  <option key={taluka.value} value={taluka.value}>
                    {taluka.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : message ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm">
              <h2 className="text-2xl font-black">Unable to load applications</h2>
              <p className="mt-3 font-semibold">{message}</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                No education applications found
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Selected status, district, taluka ya search ke according koi
                application nahi mili.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredApplications.map((item) => (
                <ApplicationListCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
    </AdminShell>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        {icon}
      </div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function ApplicationListCard({ item }: { item: EducationApplicationListItem }) {
  const { copy } = useAdminProgramsCopy('education')
  const details = item.details || {}

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {item.application_no || 'Application'}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getEducationStatusClass(
                item.status,
              )}`}
            >
              {getEducationStatusLabel(item.status)}
            </span>

            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {details.support_type || 'Education Support'}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${
                item.assigned_admin_id
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {item.assigned_admin_id ? 'Reviewer Assigned' : 'Unassigned'}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-950">
              {item.applicant_name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Membership No: {item.membership_no}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p>
              <strong>Phone:</strong> {item.phone}
            </p>
            <p>
              <strong>District:</strong> {item.district || '-'}
            </p>
            <p>
              <strong>Taluka:</strong> {item.taluka || '-'}
            </p>
            <p>
              <strong>Institute:</strong> {details.institute_name || '-'}
            </p>
            <p>
              <strong>Class/Degree:</strong> {details.class_degree || '-'}
            </p>
            <p>
              <strong>Required:</strong>{' '}
              {details.required_amount ? `Rs. ${details.required_amount}` : '-'}
            </p>
          </div>

          {item.admin_remarks ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>Admin Remarks:</strong> {item.admin_remarks}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col justify-between gap-4 lg:min-w-[190px] lg:items-end">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 lg:text-right">
            <p className="font-black text-slate-950">
              {new Date(item.created_at).toLocaleDateString()}
            </p>
            <p className="mt-1">
              {item.approved_amount
                ? `Approved: Rs. ${Number(item.approved_amount)}`
                : 'Approval pending'}
            </p>
          </div>

          <Link
            to="/admin/programs/education/$id"
            params={{ id: item.id }}
            aria-label={`{copy.common.review} ${item.applicant_name} education application`}
            className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black no-underline transition"
          >
            {copy.common.review}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function getUniqueOptions(values: Array<string | null>) {
  const map = new Map<string, string>()

  for (const value of values) {
    const label = value?.trim()
    if (!label) continue

    const normalized = normalizeValue(label)
    if (!map.has(normalized)) {
      map.set(normalized, label)
    }
  }

  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() || ''
}

function exportEducationCsv(items: EducationApplicationListItem[]) {
  const rows = items.map((item, index) => {
    const details = item.details || {}

    return {
      serial: index + 1,
      application_no: item.application_no || '',
      status: getEducationStatusLabel(item.status),
      applicant_name: item.applicant_name,
      membership_no: item.membership_no,
      phone: item.phone,
      district: item.district || '',
      taluka: item.taluka || '',
      institute_name: details.institute_name || '',
      class_degree: details.class_degree || '',
      board_university: details.board_university || '',
      support_type: details.support_type || '',
      required_amount: details.required_amount || '',
      approved_amount: item.approved_amount ?? '',
      submitted_at: item.submitted_at
        ? new Date(item.submitted_at).toLocaleString()
        : '',
      assigned_reviewer: item.assigned_admin_id ? 'Assigned' : 'Unassigned',
      admin_remarks: item.admin_remarks || '',
    }
  })

  const headers = [
    'serial',
    'application_no',
    'status',
    'applicant_name',
    'membership_no',
    'phone',
    'district',
    'taluka',
    'institute_name',
    'class_degree',
    'board_university',
    'support_type',
    'required_amount',
    'approved_amount',
    'submitted_at',
    'assigned_reviewer',
    'admin_remarks',
  ] as const

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(','),
    ),
  ].join('\n')

  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `jas-education-applications-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string | number) {
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}
