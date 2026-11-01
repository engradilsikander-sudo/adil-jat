import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, MapPin, Network, Search, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchPublicCommittees,
  formatTenure,
  getCommitteeLocation,
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  type PublicCommitteeRecord,
} from '../lib/committees-public'
import {
  getLocalizedCommitteeTypeLabel,
  usePublicPageCopy,
} from '../lib/public-page-i18n'

export const Route = createFileRoute('/committees')({
  component: PublicCommitteesPage,
})

type CommitteeFilter = 'all' | 'central' | 'central_advisory' | 'provincial' | 'divisional' | 'district' | 'taluka'

function PublicCommitteesPage() {
  const publicCopy = usePublicPageCopy()
  const [committees, setCommittees] = useState<PublicCommitteeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CommitteeFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function loadCommittees() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPublicCommittees()
        if (!cancelled) setCommittees(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load committees.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCommittees()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredCommittees = useMemo(() => {
    const query = search.trim().toLowerCase()

    return committees.filter((committee) => {
      const matchesType = filter === 'all' || String(committee.committee_type) === filter
      const matchesSearch =
        query.length === 0 ||
        [
          committee.name,
          ('division' in committee ? String(committee.division ?? '') : ''),
          committee.district ?? '',
          committee.taluka ?? '',
          committee.notes ?? '',
          getLocalizedCommitteeTypeLabel(committee.committee_type, publicCopy.committees),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesType && matchesSearch
    })
  }, [committees, filter, publicCopy.committees, search])

  const stats = useMemo(() => {
    return committees.reduce(
      (acc, committee) => {
        acc.total += 1
        const committeeType = String(committee.committee_type)
        if (committeeType === 'central') acc.central += 1
        if (committeeType === 'central_advisory') acc.centralAdvisory += 1
        if (committeeType === 'provincial') acc.provincial += 1
        if (committeeType === 'divisional') acc.divisional += 1
        if (committeeType === 'district') acc.district += 1
        if (committeeType === 'taluka') acc.taluka += 1
        acc.members += committee.member_count ?? 0
        return acc
      },
      { total: 0, central: 0, centralAdvisory: 0, provincial: 0, divisional: 0, district: 0, taluka: 0, members: 0 },
    )
  }, [committees])

  return (
    <main className="px-3 py-8 sm:px-4 sm:py-12" dir="ltr">
      <div className="page-wrap space-y-7">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_54%,#eaf5f7)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
              <p className="section-eyebrow mb-3">{publicCopy.committees.eyebrow}</p>
              <h1 className="max-w-4xl text-[clamp(2.4rem,5.4vw,5rem)] font-black leading-[0.96] tracking-[-0.06em] text-slate-950">
                {publicCopy.committees.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                {publicCopy.committees.description}
              </p>

              <div className={`mt-7 flex flex-wrap gap-3 ${publicCopy.isRtl ? 'justify-end' : ''}`}>
                <Link to="/signup" className="primary-btn no-underline">
                  {publicCopy.shared.becomeMember}
                  <ArrowRight className={`h-4 w-4 ${publicCopy.arrowClass}`} />
                </Link>
                <Link to="/contact" className="secondary-btn no-underline">
                  {publicCopy.shared.contact}
                </Link>
              </div>
            </div>

            <div className={`rounded-[1.8rem] border border-emerald-900/10 bg-white/80 p-5 shadow-sm backdrop-blur ${publicCopy.textAlignClass}`} dir={publicCopy.textDir}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ${publicCopy.isRtl ? 'mr-auto' : ''}`}>
                <Network size={25} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">{publicCopy.committees.hierarchy}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {publicCopy.committees.hierarchyText}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
          <StatCard label={publicCopy.committees.publicCommittees} value={stats.total} />
          <StatCard label={publicCopy.committees.central} value={stats.central} />
          <StatCard label={publicCopy.committees.centralAdvisory} value={stats.centralAdvisory} />
          <StatCard label={publicCopy.committees.provincial} value={stats.provincial} />
          <StatCard label={publicCopy.committees.divisional} value={stats.divisional} />
          <StatCard label={publicCopy.committees.district} value={stats.district} />
          <StatCard label={publicCopy.committees.taluka} value={stats.taluka} />
          <StatCard label={publicCopy.committees.officeBearers} value={stats.members} />
        </section>

        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder={publicCopy.committees.searchPlaceholder}
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as CommitteeFilter)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">{publicCopy.committees.allCommittees}</option>
              <option value="central">{publicCopy.committees.central}</option>
              <option value="central_advisory">{publicCopy.committees.centralAdvisory}</option>
              <option value="provincial">{publicCopy.committees.provincial}</option>
              <option value="divisional">{publicCopy.committees.divisional}</option>
              <option value="district">{publicCopy.committees.district}</option>
              <option value="taluka">{publicCopy.committees.taluka}</option>
            </select>
          </div>
        </section>

        {loading ? (
          <StateCard message={publicCopy.committees.loading} />
        ) : error ? (
          <StateCard message={error} tone="error" />
        ) : filteredCommittees.length === 0 ? (
          <StateCard message={publicCopy.committees.empty} />
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCommittees.map((committee) => (
              <CommitteeCard
                key={committee.id}
                committee={committee}
                labels={publicCopy.committees}
                arrowClass={publicCopy.arrowClass}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function CommitteeCard({
  committee,
  labels,
  arrowClass,
}: {
  committee: PublicCommitteeRecord
  labels: ReturnType<typeof usePublicPageCopy>['committees']
  arrowClass: string
}) {
  const memberCount = committee.member_count ?? 0

  return (
    <article className="flex min-h-[320px] flex-col rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <ShieldCheck size={23} />
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getCommitteeStatusClass(committee.status)}`}>
          {getCommitteeStatusLabel(committee.status)}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          {getLocalizedCommitteeTypeLabel(committee.committee_type, labels)}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{committee.name}</h2>

        <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
          <p className="flex items-center gap-2"><MapPin size={15} className="text-emerald-700" /> {getCommitteeLocation(committee)}</p>
          <p className="flex items-center gap-2"><CalendarDays size={15} className="text-emerald-700" /> {formatTenure(committee.tenure_start, committee.tenure_end)}</p>
          <p className="flex items-center gap-2"><Users size={15} className="text-emerald-700" /> {memberCount} {memberCount === 1 ? labels.officeBearerSingular : labels.officeBearerPlural}</p>
        </div>
      </div>

      <Link
        to="/committees/$id"
        params={{ id: committee.id }}
        className="jas-dark-action-link mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black no-underline"
      >
        {labels.viewCommittee}
        <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
      </Link>
    </article>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div className={`rounded-[1.5rem] p-5 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-600 ring-slate-200'}`}>
      {message}
    </div>
  )
}
