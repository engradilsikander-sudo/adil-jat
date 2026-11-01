import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { AdminShell } from '../../components/admin/AdminShell'
import { ArrowRight, CheckCircle2, Network, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  committeeStatusOptions,
  committeeTypeOptions,
  createCommittee,
  currentUserCanManageCommittees,
  fetchCommitteesForAdmin,
  formatCommitteeDate,
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  getCommitteeTypeLabel,
  type CommitteeRecord,
  type CommitteeStatus,
  type CommitteeType,
} from '../../lib/committees'

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

export const Route = createFileRoute('/admin/committees')({
  component: AdminCommitteesPage,
})

type FormState = {
  committeeType: CommitteeType
  name: string
  division: string
  district: string
  taluka: string
  tenureStart: string
  tenureEnd: string
  status: CommitteeStatus
  publicDisplay: boolean
  notes: string
}

const emptyForm: FormState = {
  committeeType: 'central',
  name: '',
  division: '',
  district: '',
  taluka: '',
  tenureStart: '',
  tenureEnd: '',
  status: 'active',
  publicDisplay: true,
  notes: '',
}

function AdminCommitteesPage() {
  const { copy } = useAdminManagementCopy('committees')
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'

  const [committees, setCommittees] = useState<CommitteeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | CommitteeType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | CommitteeStatus>('all')
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (normalizedPathname !== '/admin/committees') return
    void loadCommittees()
  }, [normalizedPathname])

  async function loadCommittees() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageCommittees()
      if (!allowed) {
        setMessage('Only admin or super admin can manage organization levels and designations.')
        setCommittees([])
        return
      }

      setCommittees(await fetchCommitteesForAdmin())
    } catch (err) {
      setMessage(getErrorMessage(err, 'Failed to load organization level units. Please confirm the organization/designation migration and RLS grants are applied.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!form.name.trim()) {
        throw new Error('Unit name is required.')
      }

      if (form.committeeType === 'divisional' && !form.division.trim()) {
        throw new Error('Division is required for divisional level unit.')
      }

      if (form.committeeType === 'district' && !form.district.trim()) {
        throw new Error('District is required for district level unit.')
      }

      if (form.committeeType === 'taluka' && (!form.district.trim() || !form.taluka.trim())) {
        throw new Error('District and taluka are required for taluka level unit.')
      }

      const id = await createCommittee({
        committee_type: form.committeeType,
        name: form.name.trim(),
        division: form.committeeType === 'divisional' ? form.division.trim() : null,
        district:
          form.committeeType === 'district' || form.committeeType === 'taluka'
            ? form.district.trim()
            : null,
        taluka: form.committeeType === 'taluka' ? form.taluka.trim() : null,
        tenure_start: form.tenureStart || null,
        tenure_end: form.tenureEnd || null,
        status: form.status,
        public_display: form.publicDisplay,
        notes: form.notes.trim() || null,
      })

      setForm(emptyForm)
      await navigate({ to: '/admin/committees/$id', params: { id } })
    } catch (err) {
      setMessage(getErrorMessage(err, 'Failed to create level unit.'))
    } finally {
      setSaving(false)
    }
  }

  const filteredCommittees = useMemo(() => {
    const query = search.trim().toLowerCase()

    return committees.filter((committee) => {
      const matchesType = typeFilter === 'all' || committee.committee_type === typeFilter
      const matchesStatus = statusFilter === 'all' || committee.status === statusFilter
      const matchesSearch =
        query.length === 0 ||
        [committee.name, committee.division ?? '', committee.district ?? '', committee.taluka ?? '', committee.notes ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesType && matchesStatus && matchesSearch
    })
  }, [committees, search, statusFilter, typeFilter])

  const stats = useMemo(() => {
    return committees.reduce(
      (acc, committee) => {
        acc.total += 1
        acc[committee.committee_type] += 1
        if (committee.status === 'active') acc.active += 1
        return acc
      },
      { total: 0, central: 0, central_advisory: 0, provincial: 0, divisional: 0, district: 0, taluka: 0, active: 0 },
    )
  }, [committees])

  if (normalizedPathname !== '/admin/committees') {
    return <Outlet />
  }

  return (
    <AdminShell title="Organization Levels" subtitle="Manage level units used for designation assignment.">
      <div className="admin-nested-page">
      <div className="page-wrap space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                  {copy.page.badge}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {copy.page.title}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {copy.page.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to="/admin/designations" className="secondary-btn no-underline">
                  {copy.page.manageDesignations}
                </Link>
                <button type="button" onClick={() => void loadCommittees()} className="secondary-btn">
                  <RefreshCw size={16} /> {copy.common.refresh}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
          <SummaryCard label={copy.page.totalCommittees} value={stats.total} />
          <SummaryCard label={copy.page.central} value={stats.central} />
          <SummaryCard label={copy.page.centralAdvisory} value={stats.central_advisory} />
          <SummaryCard label={copy.page.provincial} value={stats.provincial} />
          <SummaryCard label={copy.page.divisional} value={stats.divisional} />
          <SummaryCard label={copy.page.district} value={stats.district} />
          <SummaryCard label={copy.page.taluka} value={stats.taluka} />
          <SummaryCard label={copy.page.active} value={stats.active} tone="emerald" />
        </section>

        {message ? <StateCard message={message} tone="error" /> : null}

        <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <Plus size={22} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">{copy.page.createCommittee}</h2>
                <p className="text-sm text-slate-500">{copy.page.createCommitteeText}</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label={copy.page.committeeType}>
                <select
                  value={form.committeeType}
                  onChange={(event) => {
                    const committeeType = event.target.value as CommitteeType
                    setForm((current) => ({
                      ...current,
                      committeeType,
                      division: committeeType === 'divisional' ? current.division : '',
                      district:
                        committeeType === 'district' || committeeType === 'taluka'
                          ? current.district
                          : '',
                      taluka: committeeType === 'taluka' ? current.taluka : '',
                    }))
                  }}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {committeeTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <Field label={copy.page.committeeName}>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Central Executive Committee" />
              </Field>

              {form.committeeType === 'central' || form.committeeType === 'central_advisory' || form.committeeType === 'provincial' ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-900">
                  {form.committeeType === 'central'
                    ? 'Central Executive Committee covers Sindh / Central level, so no area field is required.'
                    : form.committeeType === 'central_advisory'
                      ? 'Central Advisory Committee covers Sindh / Central advisory level, so no area field is required.'
                      : 'Provincial level covers Sindh / Provincial level, so no district or taluka field is required.'}
                </div>
              ) : null}

              {form.committeeType === 'divisional' ? (
                <Field label={copy.page.division}>
                  <input
                    value={form.division}
                    onChange={(event) => setForm((current) => ({ ...current, division: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Mirpurkhas Division"
                  />
                </Field>
              ) : null}

              {form.committeeType === 'district' || form.committeeType === 'taluka' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Field label={copy.page.district}>
                    <input value={form.district} onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Umerkot" />
                  </Field>

                  {form.committeeType === 'taluka' ? (
                    <Field label={copy.page.taluka}>
                      <input value={form.taluka} onChange={(event) => setForm((current) => ({ ...current, taluka: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Kunri" />
                    </Field>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Field label={copy.page.tenureStart}>
                  <input type="date" value={form.tenureStart} onChange={(event) => setForm((current) => ({ ...current, tenureStart: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                </Field>

                <Field label={copy.page.tenureEnd}>
                  <input type="date" value={form.tenureEnd} onChange={(event) => setForm((current) => ({ ...current, tenureEnd: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                </Field>
              </div>

              <Field label="Status">
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CommitteeStatus }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                  {committeeStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.publicDisplay} onChange={(event) => setForm((current) => ({ ...current, publicDisplay: event.target.checked }))} />
                Show this level unit publicly later
              </label>

              <Field label="Notes">
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 min-h-[96px] py-3" placeholder="Internal notes or appointment details" />
              </Field>

              <button type="submit" disabled={saving} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? 'Creating...' : copy.page.createCommittee}
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Level Units</h2>
                <p className="mt-1 text-sm text-slate-500">Showing {filteredCommittees.length} of {committees.length} level units.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:w-[560px]">
                <div className="relative sm:col-span-3 lg:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 pl-10" placeholder="Search..." />
                </div>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | CommitteeType)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                  <option value="all">All levels</option>
                  {committeeTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | CommitteeStatus)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                  <option value="all">All status</option>
                  {committeeStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? <StateCard message={copy.page.loading} /> : null}

            {!loading && filteredCommittees.length === 0 ? (
              <StateCard message={copy.page.empty} />
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              {filteredCommittees.map((committee) => (
                <article key={committee.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lime-50 text-lime-800">
                        <Network size={22} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-950">{committee.name}</h3>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{getCommitteeTypeLabel(committee.committee_type)}</p>
                      </div>
                    </div>

                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getCommitteeStatusClass(committee.status)}`}>
                      {getCommitteeStatusLabel(committee.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {committee.committee_type === 'divisional' ? (
                      <Info label={copy.page.division} value={committee.division ?? 'N/A'} />
                    ) : null}
                    {committee.committee_type === 'district' || committee.committee_type === 'taluka' ? (
                      <Info label={copy.page.district} value={committee.district ?? 'N/A'} />
                    ) : null}
                    {committee.committee_type === 'taluka' ? (
                      <Info label={copy.page.taluka} value={committee.taluka ?? 'N/A'} />
                    ) : null}
                    {committee.committee_type === 'central' || committee.committee_type === 'central_advisory' || committee.committee_type === 'provincial' ? (
                      <Info
                        label="Area"
                        value={
                          committee.committee_type === 'central'
                            ? 'Sindh / Central Executive Committee'
                            : committee.committee_type === 'central_advisory'
                              ? 'Sindh / Central Advisory Committee'
                              : 'Sindh / Provincial'
                        }
                      />
                    ) : null}
                    <Info label="Tenure" value={`${formatCommitteeDate(committee.tenure_start)} → ${formatCommitteeDate(committee.tenure_end)}`} />
                    <Info label="Members" value={String(committee.member_count ?? 0)} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to="/admin/committees/$id" params={{ id: committee.id }} className="jas-dark-action-link inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black no-underline">
                      Manage Unit <ArrowRight size={15} />
                    </Link>
                    {committee.public_display ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 ring-1 ring-emerald-100">
                        <CheckCircle2 size={15} /> Public later
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </div>
    </AdminShell>
  )
}

function SummaryCard({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone === 'emerald' ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-950'}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}


function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message

  if (typeof err === 'object' && err !== null) {
    const maybeError = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)

    if (parts.length > 0) return parts.join(' — ')
  }

  return fallback
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  )
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div className={`rounded-2xl p-5 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
      {tone === 'error' ? <ShieldAlert className="mr-2 inline h-4 w-4" /> : null}
      {message}
    </div>
  )
}
