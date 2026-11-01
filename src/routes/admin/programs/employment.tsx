import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { AdminShell } from '../../../components/admin/AdminShell'
import {
  ArrowRight,
  BriefcaseBusiness,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase/client'
import { useAdminProgramsCopy } from '../../../lib/admin-programs-i18n'
import {
  formatSkills,
  getCurrentEmploymentStatusLabel,
  getEmploymentStatusClass,
  getEmploymentStatusLabel,
  getShortlistStatusLabel,
  type EmploymentApplicationDetails,
} from '../../../lib/programs/employment'
import {
  filterRowsByAreaAccess,
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from '../../../lib/area-permissions'

export const Route = createFileRoute('/admin/programs/employment')({
  component: AdminEmploymentRoute,
})

type EmploymentApplicationListItem = {
  id: string
  application_no: string | null
  applicant_name: string
  membership_no: string
  phone: string
  district: string | null
  taluka: string | null
  details: EmploymentApplicationDetails | null
  status: string
  assigned_admin_id: string | null
  admin_remarks: string | null
  submitted_at: string
  created_at: string
}

const statusOptions = ['all', 'submitted', 'under_review', 'need_more_info', 'approved', 'rejected', 'paid_completed', 'completed']

function AdminEmploymentRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const normalizedPathname = pathname.replace(/\/+$/, '')

  if (normalizedPathname === '/admin/programs/employment') {
    return <AdminEmploymentApplicationsPage />
  }

  return <Outlet />
}

function AdminEmploymentApplicationsPage() {
  const { copy } = useAdminProgramsCopy('employment')
  const [applications, setApplications] = useState<EmploymentApplicationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [, setAreaNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [talukaFilter, setTalukaFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { void loadApplications() }, [])

  async function ensureAccess() {
    return loadCurrentAdminAreaAccess('employment', 'view', {
      requiredRoles: ['admin', 'super_admin', 'employment_admin'],
    })
  }

  async function loadApplications() {
    setLoading(true)
    setMessage('')
    setAreaNotice('')

    const access = await ensureAccess()
    if (!access.ok) {
      setMessage(access.message)
      setApplications([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('program_applications')
      .select('id, application_no, applicant_name, membership_no, phone, district, taluka, details, status, assigned_admin_id, admin_remarks, submitted_at, created_at')
      .eq('program_key', 'employment')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      setApplications([])
    } else {
      const scopedApplications = filterRowsByAreaAccess(
        (data || []) as unknown as EmploymentApplicationListItem[],
        access,
      )

      setApplications(scopedApplications)
      setAreaNotice(getAreaAccessSummaryText(access))
    }

    setLoading(false)
  }

  const districtOptions = useMemo(() => uniqueOptions(applications.map((item) => item.district)), [applications])
  const talukaOptions = useMemo(() => {
    const scoped = districtFilter === 'all' ? applications : applications.filter((item) => normalize(item.district) === districtFilter)
    return uniqueOptions(scoped.map((item) => item.taluka))
  }, [applications, districtFilter])

  const filteredApplications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const skill = skillFilter.trim().toLowerCase()

    return applications.filter((item) => {
      const details = item.details || {}
      const skillsText = formatSkills(details.skills).toLowerCase()
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesDistrict = districtFilter === 'all' || normalize(item.district) === districtFilter
      const matchesTaluka = talukaFilter === 'all' || normalize(item.taluka) === talukaFilter
      const matchesSkill = !skill || skillsText.includes(skill)
      const matchesSearch = !q || [
        item.application_no,
        item.applicant_name,
        item.membership_no,
        item.phone,
        item.district,
        item.taluka,
        details.education_level,
        details.field_of_study,
        details.preferred_job_location,
        details.expected_salary,
        details.current_employment_status,
        details.shortlist_status,
        skillsText,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q))

      return matchesStatus && matchesDistrict && matchesTaluka && matchesSkill && matchesSearch
    }).sort((a, b) => {
      const aPlaced = a.details?.shortlist_status === 'placed' ? 1 : 0
      const bPlaced = b.details?.shortlist_status === 'placed' ? 1 : 0
      if (aPlaced !== bPlaced) return bPlaced - aPlaced
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [applications, districtFilter, searchTerm, skillFilter, statusFilter, talukaFilter])

  const stats = useMemo(() => ({
    total: applications.length,
    filtered: filteredApplications.length,
    underReview: applications.filter((item) => item.status === 'under_review').length,
    shortlisted: applications.filter((item) => item.details?.shortlist_status === 'shortlisted' || item.status === 'approved').length,
    placed: applications.filter((item) => item.details?.shortlist_status === 'placed' || item.status === 'paid_completed').length,
  }), [applications, filteredApplications.length])

  function resetFilters() {
    setStatusFilter('all')
    setDistrictFilter('all')
    setTalukaFilter('all')
    setSkillFilter('')
    setSearchTerm('')
  }

  function exportCsv() {
    const headers = ['serial','application_no','status','applicant_name','membership_no','phone','district','taluka','education','skills','preferred_location','expected_salary','current_status','shortlist_status','submitted_at'] as const
    const rows = filteredApplications.map((item, index) => {
      const details = item.details || {}
      return {
        serial: index + 1,
        application_no: item.application_no || '',
        status: getEmploymentStatusLabel(item.status),
        applicant_name: item.applicant_name,
        membership_no: item.membership_no,
        phone: item.phone,
        district: item.district || '',
        taluka: item.taluka || '',
        education: details.education_level || '',
        skills: formatSkills(details.skills),
        preferred_location: details.preferred_job_location || '',
        expected_salary: details.expected_salary || '',
        current_status: getCurrentEmploymentStatusLabel(details.current_employment_status),
        shortlist_status: getShortlistStatusLabel(details.shortlist_status),
        submitted_at: item.created_at ? new Date(item.created_at).toLocaleString() : '',
      }
    })
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jas-employment-candidates-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell title="Employment Program" subtitle="Review employment support, skills, shortlist and placement applications.">
      <div className="admin-nested-page admin-program-admin-page">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <Link to="/admin" className="inline-flex items-center text-sm font-bold text-emerald-300 no-underline hover:text-emerald-200">{copy.common.backToAdmin}</Link>
          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <BriefcaseBusiness className="h-4 w-4 text-emerald-300" /> {copy.program.adminBadge}
              </div>
              <h1 className="mt-5 text-4xl font-black md:text-6xl">{copy.program.listTitle}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">{copy.program.listSubtitle}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button type="button" onClick={exportCsv} disabled={loading || filteredApplications.length === 0} className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20 disabled:opacity-60"><Download className="mr-2 h-4 w-4" /> {copy.common.exportCsv}</button>
              <button type="button" onClick={loadApplications} disabled={loading} className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {copy.common.refresh}</button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard title={copy.common.total} value={stats.total} icon={<Users className="h-5 w-5" />} />
            <StatCard title={copy.common.filtered} value={stats.filtered} icon={<Filter className="h-5 w-5" />} />
            <StatCard title={copy.common.underReview} value={stats.underReview} icon={<ShieldAlert className="h-5 w-5" />} />
            <StatCard title={copy.common.shortlisted} value={stats.shortlisted} icon={<UserCheck className="h-5 w-5" />} />
            <StatCard title={copy.common.placed} value={stats.placed} icon={<BriefcaseBusiness className="h-5 w-5" />} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_180px_180px_180px_180px_auto]">
              <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={copy.program.searchPlaceholder} className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-semibold outline-none focus:border-emerald-500" /></label>
              <input value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} placeholder={copy.program.skillFilter} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-emerald-500" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-emerald-500">{statusOptions.map((status) => <option key={status} value={status}>{status === 'all' ? copy.common.allStatuses : getEmploymentStatusLabel(status)}</option>)}</select>
              <select value={districtFilter} onChange={(event) => { setDistrictFilter(event.target.value); setTalukaFilter('all') }} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-emerald-500"><option value="all">{copy.common.allDistricts}</option>{districtOptions.map((district) => <option key={district.value} value={district.value}>{district.label}</option>)}</select>
              <select value={talukaFilter} onChange={(event) => setTalukaFilter(event.target.value)} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none focus:border-emerald-500"><option value="all">{copy.common.allTalukas}</option>{talukaOptions.map((taluka) => <option key={taluka.value} value={taluka.value}>{taluka.label}</option>)}</select>
              <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"><XCircle className="mr-2 h-4 w-4" /> Reset</button>
            </div>
          </div>

          {loading ? <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div> : message ? <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm">{message}</div> : filteredApplications.length === 0 ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">No employment profiles found.</div> : <div className="grid gap-5">{filteredApplications.map((item) => <CandidateCard key={item.id} item={item} />)}</div>}
        </div>
      </section>
    </div>
    </AdminShell>
  )
}

function CandidateCard({ item }: { item: EmploymentApplicationListItem }) {
  const { copy } = useAdminProgramsCopy('employment')
  const details = item.details || {}
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.application_no || 'Candidate'}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getEmploymentStatusClass(item.status)}`}>{getEmploymentStatusLabel(item.status)}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{getShortlistStatusLabel(details.shortlist_status)}</span>
            <span className={item.assigned_admin_id ? 'rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600'}>{item.assigned_admin_id ? 'Reviewer Assigned' : 'Unassigned'}</span>
          </div>
          <div><h2 className="text-2xl font-black text-slate-950">{item.applicant_name}</h2><p className="mt-1 text-sm font-semibold text-slate-500">Membership No: {item.membership_no}</p></div>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <p><strong>Phone:</strong> {item.phone}</p><p><strong>District:</strong> {item.district || '-'}</p><p><strong>Taluka:</strong> {item.taluka || '-'}</p>
            <p><strong>Education:</strong> {details.education_level || '-'}</p><p><strong>Skills:</strong> {formatSkills(details.skills)}</p><p><strong>Location:</strong> {details.preferred_job_location || '-'}</p>
            <p><strong>Salary:</strong> {details.expected_salary || '-'}</p><p><strong>Current:</strong> {getCurrentEmploymentStatusLabel(details.current_employment_status)}</p><p><strong>Submitted:</strong> {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          {item.admin_remarks ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><strong>Admin Remarks:</strong> {item.admin_remarks}</div> : null}
        </div>
        <div className="flex flex-col justify-end gap-4 lg:min-w-[190px] lg:items-end">
          <Link to="/admin/programs/employment/$id" params={{ id: item.id }} className="jas-dark-action-link inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black no-underline transition">{copy.common.review} <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      </div>
    </article>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">{icon}</div><p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">{title}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p></div>
}

function uniqueOptions(values: Array<string | null>) { const map = new Map<string,string>(); for (const value of values) { const label=value?.trim(); if(!label) continue; const normalized=normalize(label); if(!map.has(normalized)) map.set(normalized,label)} return Array.from(map.entries()).map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label)) }
function normalize(value?: string | null) { return value?.trim().toLowerCase() || '' }
function csvCell(value: string | number) { return `"${String(value).replace(/"/g, '""')}"` }
