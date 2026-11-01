import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, IdCard, MapPin, ShieldCheck } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  fetchPublicCommitteeDetails,
  formatTenure,
  getCommitteeLocation,
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  getInitials,
  type PublicCommitteeDetails,
  type PublicCommitteeMemberRecord,
} from '../../lib/committees-public'
import {
  getLocalizedCommitteeTypeLabel,
  usePublicPageCopy,
} from '../../lib/public-page-i18n'

export const Route = createFileRoute('/committees/$id')({
  component: PublicCommitteeDetailPage,
})

function PublicCommitteeDetailPage() {
  const { id } = Route.useParams()
  const publicCopy = usePublicPageCopy()
  const [committee, setCommittee] = useState<PublicCommitteeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCommittee() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPublicCommitteeDetails(id)
        if (!cancelled) setCommittee(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load committee.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadCommittee()

    return () => {
      cancelled = true
    }
  }, [id])

  const groupedMembers = useMemo(() => {
    if (!committee) return []

    const groups = new Map<string, PublicCommitteeMemberRecord[]>()
    committee.members.forEach((member) => {
      const status = member.status || 'active'
      groups.set(status, [...(groups.get(status) ?? []), member])
    })

    return [...groups.entries()]
  }, [committee])

  if (loading) {
    return <main className="page-wrap py-10"><StateCard message={publicCopy.shared.loading} /></main>
  }

  if (error) {
    return <main className="page-wrap py-10"><StateCard message={error} tone="error" /></main>
  }

  if (!committee) {
    return (
      <main className="page-wrap py-10">
        <StateCard message={publicCopy.committees.empty} />
      </main>
    )
  }

  return (
    <main className="px-3 py-8 sm:px-4 sm:py-12" dir="ltr">
      <div className="page-wrap space-y-7">
        <Link to="/committees" className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline">
          <ArrowLeft className={`h-4 w-4 ${publicCopy.iconBeforeClass}`} />
          {publicCopy.committees.backToCommittees}
        </Link>

        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_54%,#eaf5f7)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
              <p className="section-eyebrow mb-3">
                {getLocalizedCommitteeTypeLabel(committee.committee_type, publicCopy.committees)}
              </p>
              <h1 className="max-w-4xl text-[clamp(2.3rem,5vw,4.7rem)] font-black leading-[0.98] tracking-[-0.055em] text-slate-950">
                {committee.name}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-slate-600">
                {publicCopy.committees.officialRecord}
              </p>

              <div className={`mt-6 flex flex-wrap gap-2 text-sm font-bold text-slate-600 ${publicCopy.isRtl ? 'justify-end' : ''}`}>
                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getCommitteeStatusClass(committee.status)}`}>
                  {getCommitteeStatusLabel(committee.status)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  <MapPin size={14} className="text-emerald-700" /> {getCommitteeLocation(committee)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
                  <CalendarDays size={14} className="text-emerald-700" /> {formatTenure(committee.tenure_start, committee.tenure_end)}
                </span>
              </div>
            </div>

            <div className={`rounded-[1.8rem] border border-emerald-900/10 bg-white/80 p-5 shadow-sm backdrop-blur ${publicCopy.textAlignClass}`} dir={publicCopy.textDir}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ${publicCopy.isRtl ? 'mr-auto' : ''}`}>
                <ShieldCheck size={25} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">{publicCopy.committees.publicOfficeBearers}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {committee.members.length} {publicCopy.committees.activeOfficeBearers}
              </p>
            </div>
          </div>
        </section>

        {committee.members.length === 0 ? (
          <StateCard message={publicCopy.committees.noOfficeBearers} />
        ) : (
          groupedMembers.map(([status, members]) => (
            <section key={status} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
                  <p className="section-eyebrow mb-2">{publicCopy.committees.officeBearers}</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {getCommitteeStatusLabel(status)} {publicCopy.committees.members}
                  </h2>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                  {members.length} {publicCopy.committees.listed}
                </span>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {members.map((member) => (
                  <OfficeBearerCard
                    key={member.id}
                    member={member}
                    labels={publicCopy.committees}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  )
}

function OfficeBearerCard({
  member,
  labels,
}: {
  member: PublicCommitteeMemberRecord
  labels: ReturnType<typeof usePublicPageCopy>['committees']
}) {
  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-lg font-black text-[#f2d48f] shadow-sm">
          {getInitials(member.full_name_snapshot)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{member.designation_title}</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-slate-950">{member.full_name_snapshot}</h3>
          {member.father_name_snapshot ? (
            <p className="mt-1 text-sm font-semibold text-slate-500">{labels.father}: {member.father_name_snapshot}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <InfoLine icon={<IdCard size={15} />} label={labels.memberId} value={member.member_no_snapshot || labels.notDisclosed} />
        <InfoLine icon={<MapPin size={15} />} label={labels.location} value={[member.taluka_snapshot, member.district_snapshot].filter(Boolean).join(', ') || labels.sindh} />
        <InfoLine icon={<CalendarDays size={15} />} label={labels.tenure} value={formatTenure(member.tenure_start, member.tenure_end)} />
      </div>
    </article>
  )
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <span>
        <span className="block text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{label}</span>
        <span className="mt-0.5 block font-bold text-slate-900">{value}</span>
      </span>
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
