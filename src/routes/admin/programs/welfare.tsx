// src/routes/admin/programs/welfare.tsx
import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { AdminShell } from '../../../components/admin/AdminShell'
import {
  ArrowRight,
  BadgeIndianRupee,
  Download,
  Filter,
  HandHeart,
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
  formatWelfareMoney,
  getWelfareCasePriorityClass,
  getWelfareCasePriorityLabel,
  getWelfareCommitteeDecisionClass,
  getWelfareCommitteeDecisionLabel,
  getWelfarePaymentStatusLabel,
  getWelfareStatusClass,
  getWelfareStatusLabel,
  isWelfareEmergency,
  sortWelfareCasesByPriority,
  type WelfareApplicationDetails,
} from '../../../lib/programs/welfare'
import {
  filterRowsByAreaAccess,
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from '../../../lib/area-permissions'

export const Route = createFileRoute('/admin/programs/welfare')({
  component: AdminWelfareRoute,
})

type WelfareApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  relationship_to_member: string
  phone: string
  district: string | null
  taluka: string | null
  details: WelfareApplicationDetails | null
  status: string
  assigned_admin_id: string | null
  admin_remarks: string | null
  approved_amount: number | null
  submitted_at: string
  created_at: string
}

type UserRoleRow = { role: string }
type AssignmentRow = { id: string; can_view: boolean | null }

const statusOptions = ['all', 'submitted', 'under_review', 'need_more_info', 'approved', 'rejected', 'paid_completed', 'completed']
const priorityOptions = ['all', 'emergency', 'urgent', 'normal']
const paymentOptions = ['all', 'not_started', 'pending', 'approved', 'partially_released', 'released', 'completed']
const committeeOptions = ['all', 'pending', 'recommended', 'not_recommended', 'approved', 'rejected', 'deferred']

function AdminWelfareRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const normalizedPathname = pathname.replace(/\/+$/, '')

  if (normalizedPathname === '/admin/programs/welfare') {
    return <AdminWelfareApplicationsPage />
  }

  return <Outlet />
}

function AdminWelfareApplicationsPage() {
  const { copy } = useAdminProgramsCopy('welfare')
  const [applications, setApplications] = useState<WelfareApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [areaNotice, setAreaNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [talukaFilter, setTalukaFilter] = useState('all')
  const [emergencyFilter, setEmergencyFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [committeeFilter, setCommitteeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    void loadApplications()
  }, [])

  async function loadApplications() {
    setLoading(true)
    setMessage('')
    setAreaNotice('')

    const access = await ensureWelfareAdminAccess()

    if (!access.ok) {
      setMessage(access.message)
      setApplications([])
      setLoading(false)
      return
    }

    const areaAccess = await loadCurrentAdminAreaAccess('welfare', 'view', {
      requiredRoles: ['admin', 'super_admin', 'welfare_admin', 'ration_admin'],
    })

    if (!areaAccess.ok) {
      setMessage(areaAccess.message)
      setApplications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, relationship_to_member, phone, district, taluka, details, status, assigned_admin_id, admin_remarks, approved_amount, submitted_at, created_at')
      .eq('program_key', 'welfare')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setApplications([])
      setLoading(false)
      return
    }

    const scopedApplications = filterRowsByAreaAccess(
      (data || []) as unknown as WelfareApplicationListItem[],
      areaAccess,
    )

    setApplications(scopedApplications)
    setAreaNotice(getAreaAccessSummaryText(areaAccess))
    setLoading(false)
  }

  const districtOptions = useMemo(() => getUniqueOptions(applications.map((item) => item.district)), [applications])

  const talukaOptions = useMemo(() => {
    const scopedApplications = districtFilter === 'all' ? applications : applications.filter((item) => normalizeValue(item.district) === districtFilter)
    return getUniqueOptions(scopedApplications.map((item) => item.taluka))
  }, [applications, districtFilter])

  useEffect(() => {
    if (talukaFilter !== 'all' && !talukaOptions.some((item) => item.value === talukaFilter)) {
      setTalukaFilter('all')
    }
  }, [talukaFilter, talukaOptions])

  const filteredApplications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()

    const filtered = applications.filter((item) => {
      const details = item.details || {}
      const priority = details.case_priority || (isWelfareEmergency(details) ? 'emergency' : 'normal')
      const payment = details.payment_status || 'not_started'
      const committee = details.welfare_committee_decision || 'pending'

      const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter
      const matchesDistrict = districtFilter === 'all' ? true : normalizeValue(item.district) === districtFilter
      const matchesTaluka = talukaFilter === 'all' ? true : normalizeValue(item.taluka) === talukaFilter
      const matchesEmergency = emergencyFilter === 'all' ? true : emergencyFilter === 'emergency' ? isWelfareEmergency(details) : !isWelfareEmergency(details)
      const matchesPriority = priorityFilter === 'all' ? true : priority === priorityFilter
      const matchesPayment = paymentFilter === 'all' ? true : payment === paymentFilter
      const matchesCommittee = committeeFilter === 'all' ? true : committee === committeeFilter
      const matchesSearch = q
        ? [item.application_no, item.applicant_name, item.membership_no, item.phone, item.district, item.taluka, details.case_type, details.reason, details.required_amount, details.welfare_committee_members]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        : true

      return matchesStatus && matchesDistrict && matchesTaluka && matchesEmergency && matchesPriority && matchesPayment && matchesCommittee && matchesSearch
    })

    return sortWelfareCasesByPriority(filtered)
  }, [applications, committeeFilter, districtFilter, emergencyFilter, paymentFilter, priorityFilter, searchTerm, statusFilter, talukaFilter])

  const stats = useMemo(() => ({
    total: applications.length,
    filtered: filteredApplications.length,
    newCases: applications.filter((item) => item.status === 'submitted').length,
    underReview: applications.filter((item) => item.status === 'under_review').length,
    approved: applications.filter((item) => item.status === 'approved').length,
    released: applications.filter((item) => ['paid_completed', 'completed'].includes(item.status)).length,
    emergency: applications.filter((item) => isWelfareEmergency(item.details)).length,
  }), [applications, filteredApplications.length])

  function resetFilters() {
    setStatusFilter('all')
    setDistrictFilter('all')
    setTalukaFilter('all')
    setEmergencyFilter('all')
    setPriorityFilter('all')
    setPaymentFilter('all')
    setCommitteeFilter('all')
    setSearchTerm('')
  }

  return (
    <AdminShell title="Welfare Program" subtitle="Review welfare cases, committee decisions and support status.">
      <div className="admin-nested-page admin-program-admin-page">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <Link to="/admin" className="inline-flex items-center text-sm font-bold text-amber-300 no-underline hover:text-amber-200">{copy.common.backToAdmin}</Link>
          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <HandHeart className="h-4 w-4 text-amber-300" /> {copy.program.adminBadge}
              </div>
              <h1 className="mt-5 text-4xl font-black md:text-6xl">{copy.program.listTitle}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">{copy.program.listSubtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button type="button" onClick={() => exportWelfareCsv(filteredApplications)} disabled={loading || filteredApplications.length === 0} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">
                <Download className="mr-2 h-4 w-4" /> {copy.common.exportCsv}
              </button>
              <button type="button" onClick={loadApplications} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} {copy.common.refresh}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-4 md:grid-cols-7">
            <StatCard title={copy.common.total} value={stats.total} icon={<HandHeart className="h-5 w-5" />} />
            <StatCard title={copy.common.filtered} value={stats.filtered} icon={<Filter className="h-5 w-5" />} />
            <StatCard title={copy.common.new} value={stats.newCases} icon={<ShieldCheck className="h-5 w-5" />} />
            <StatCard title={copy.common.verify} value={stats.underReview} icon={<UserCheck className="h-5 w-5" />} />
            <StatCard title={copy.common.approved} value={stats.approved} icon={<BadgeIndianRupee className="h-5 w-5" />} />
            <StatCard title={copy.common.released} value={stats.released} icon={<BadgeIndianRupee className="h-5 w-5" />} />
            <StatCard title={copy.common.emergency} value={stats.emergency} icon={<ShieldCheck className="h-5 w-5" />} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_170px_170px_170px_150px_150px_170px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={copy.program.searchPlaceholder} className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-semibold outline-none transition focus:border-amber-500" />
              </label>
              <Select value={statusFilter} onChange={setStatusFilter} options={statusOptions.map((status) => ({ value: status, label: status === 'all' ? copy.common.allStatuses : getWelfareStatusLabel(status) }))} />
              <Select value={districtFilter} onChange={setDistrictFilter} options={[{ value: 'all', label: copy.common.allDistricts }, ...districtOptions]} />
              <Select value={talukaFilter} onChange={setTalukaFilter} options={[{ value: 'all', label: copy.common.allTalukas }, ...talukaOptions]} />
              <Select value={emergencyFilter} onChange={setEmergencyFilter} options={[{ value: 'all', label: 'All Cases' }, { value: 'emergency', label: 'Emergency' }, { value: 'normal', label: 'Normal' }]} />
              <Select value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions.map((value) => ({ value, label: value === 'all' ? 'Priority' : value }))} />
              <Select value={paymentFilter} onChange={setPaymentFilter} options={paymentOptions.map((value) => ({ value, label: value === 'all' ? 'Fund Status' : getWelfarePaymentStatusLabel(value) }))} />
              <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50"><XCircle className="mr-2 h-4 w-4" /> Reset</button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Select value={committeeFilter} onChange={setCommitteeFilter} options={committeeOptions.map((value) => ({ value, label: value === 'all' ? 'Committee Decision' : getWelfareCommitteeDecisionLabel(value) }))} />
            </div>
          </div>


          {areaNotice ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800">
              {areaNotice}
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm"><Loader2 className="h-10 w-10 animate-spin text-amber-500" /></div>
          ) : message ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm"><h2 className="text-2xl font-black">Unable to load welfare cases</h2><p className="mt-3 font-semibold">{message}</p></div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h2 className="text-2xl font-black text-slate-950">No welfare cases found</h2><p className="mx-auto mt-3 max-w-2xl text-slate-600">Selected filters ke according koi case nahi mila.</p></div>
          ) : (
            <div className="grid gap-5">{filteredApplications.map((item) => <ApplicationListCard key={item.id} item={item} />)}</div>
          )}
        </div>
      </section>
    </div>
    </AdminShell>
  )
}

function ApplicationListCard({ item }: { item: WelfareApplicationListItem }) {
  const { copy } = useAdminProgramsCopy('welfare')
  const details = item.details || {}
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.application_no || 'Welfare Case'}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getWelfareStatusClass(item.status)}`}>{getWelfareStatusLabel(item.status)}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getWelfareCasePriorityClass(details)}`}>{getWelfareCasePriorityLabel(details)}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getWelfareCommitteeDecisionClass(details.welfare_committee_decision)}`}>{getWelfareCommitteeDecisionLabel(details.welfare_committee_decision)}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950">{item.applicant_name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Membership No: {item.membership_no}</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p><strong>Phone:</strong> {item.phone}</p>
            <p><strong>District:</strong> {item.district || '-'}</p>
            <p><strong>Taluka:</strong> {item.taluka || '-'}</p>
            <p><strong>Case Type:</strong> {details.case_type || '-'}</p>
            <p><strong>Required:</strong> {formatWelfareMoney(details.required_amount)}</p>
            <p><strong>Fund:</strong> {getWelfarePaymentStatusLabel(details.payment_status)}</p>
          </div>
          {item.admin_remarks ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Admin Remarks:</strong> {item.admin_remarks}</div> : null}
        </div>
        <div className="flex flex-col justify-between gap-4 lg:min-w-[190px] lg:items-end">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 lg:text-right"><p className="font-black text-slate-950">{new Date(item.created_at).toLocaleDateString()}</p><p className="mt-1">{item.approved_amount ? `Approved: Rs. ${Number(item.approved_amount)}` : 'Approval pending'}</p></div>
          <Link to="/admin/programs/welfare/$id" params={{ id: item.id }} className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black no-underline transition">{copy.common.review} <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">{icon}</div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p></div>
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
}

async function ensureWelfareAdminAccess(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { ok: false, message: 'Admin panel dekhne ke liye pehle login karen.' }

  const { data: roles, error: rolesError } = await supabase.from('user_roles').select('role').eq('user_id', user.id).returns<UserRoleRow[]>()
  if (rolesError) return { ok: false, message: rolesError.message }

  const hasGlobalAccess = (roles || []).some((item) => ['admin', 'super_admin', 'welfare_admin'].includes(item.role))
  if (hasGlobalAccess) return { ok: true }

  const { data: assignments, error: assignmentError } = await supabase.from('program_admin_assignments').select('id, can_view').eq('user_id', user.id).eq('program_key', 'welfare').eq('can_view', true).limit(1).returns<AssignmentRow[]>()
  if (assignmentError) return { ok: false, message: assignmentError.message }
  if (assignments?.length) return { ok: true }

  return { ok: false, message: 'Aap ke account ko welfare admin access nahi mila.' }
}

function getUniqueOptions(values: Array<string | null>) {
  const map = new Map<string, string>()
  for (const value of values) {
    const label = value?.trim()
    if (!label) continue
    const normalized = normalizeValue(label)
    if (!map.has(normalized)) map.set(normalized, label)
  }
  return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
}

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() || ''
}

function exportWelfareCsv(items: WelfareApplicationListItem[]) {
  const headers = ['serial', 'application_no', 'status', 'applicant_name', 'membership_no', 'phone', 'district', 'taluka', 'case_type', 'required_amount', 'approved_amount', 'fund_status', 'committee_decision', 'submitted_at', 'admin_remarks'] as const
  const rows = items.map((item, index) => {
    const details = item.details || {}
    return {
      serial: index + 1,
      application_no: item.application_no || '',
      status: getWelfareStatusLabel(item.status),
      applicant_name: item.applicant_name,
      membership_no: item.membership_no,
      phone: item.phone,
      district: item.district || '',
      taluka: item.taluka || '',
      case_type: details.case_type || '',
      required_amount: details.required_amount || '',
      approved_amount: item.approved_amount ?? '',
      fund_status: getWelfarePaymentStatusLabel(details.payment_status),
      committee_decision: getWelfareCommitteeDecisionLabel(details.welfare_committee_decision),
      submitted_at: item.submitted_at ? new Date(item.submitted_at).toLocaleString() : '',
      admin_remarks: item.admin_remarks || '',
    }
  })
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `jas-welfare-cases-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string | number) {
  const text = String(value)
  return `"${text.replace(/"/g, '""')}"`
}
