import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Award,
  CalendarDays,
  IdCard,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  designationHolderLevelOrder,
  fetchPublicDesignationHolders,
  formatDesignationHolderTenure,
  getDesignationHolderInitials,
  getDesignationHolderLevelLabel,
  getDesignationHolderLocation,
  getDesignationHolderSearchText,
  type DesignationHolderLevel,
  type PublicDesignationHolderRecord,
} from '../lib/designation-holders'
import { useI18n, type AppLanguage } from '../lib/i18n'

export const Route = createFileRoute('/designation-holders')({
  component: DesignationHoldersPage,
})

type HolderFilter = 'all' | DesignationHolderLevel

type PageCopy = {
  eyebrow: string
  title: string
  description: string
  ctaJoin: string
  ctaCommittees: string
  publicDirectory: string
  publicDirectoryText: string
  totalHolders: string
  activeLevels: string
  cec: string
  centralAdvisory: string
  provincial: string
  divisional: string
  district: string
  taluka: string
  searchPlaceholder: string
  allLevels: string
  loading: string
  empty: string
  holderName: string
  designation: string
  level: string
  location: string
  memberId: string
  tenure: string
  committee: string
  notDisclosed: string
  listed: string
  activeDesignationHolders: string
  orderedBy: string
  noPhoto: string
}

const copyByLanguage: Record<AppLanguage, PageCopy> = {
  en: {
    eyebrow: 'JAS public leadership directory',
    title: 'Designation Holders',
    description:
      'Members can see the officially assigned JAS designation holders with their name, photo, level and designation in the correct organization order.',
    ctaJoin: 'Become a Member',
    ctaCommittees: 'View Committees',
    publicDirectory: 'Public designation record',
    publicDirectoryText:
      'Only active holders from public active committees are shown here. The order follows CEC, Central Advisory, Provincial, Divisional, District and Taluka levels.',
    totalHolders: 'Designation Holders',
    activeLevels: 'Active Levels',
    cec: 'CEC',
    centralAdvisory: 'Advisory',
    provincial: 'Provincial',
    divisional: 'Divisional',
    district: 'District',
    taluka: 'Taluka',
    searchPlaceholder: 'Search by name, designation, district, taluka or member ID...',
    allLevels: 'All Levels',
    loading: 'Loading designation holders...',
    empty: 'No designation holders are public yet. Add active committee members from Admin > Committees and enable public display for that committee.',
    holderName: 'Name',
    designation: 'Designation',
    level: 'Level',
    location: 'Area / Jurisdiction',
    memberId: 'Member ID',
    tenure: 'Tenure',
    committee: 'Committee',
    notDisclosed: 'Not disclosed',
    listed: 'listed',
    activeDesignationHolders: 'active designation holders',
    orderedBy: 'Ordered by official JAS hierarchy',
    noPhoto: 'Photo not available',
  },
  ur: {
    eyebrow: 'JAS عوامی قیادت ڈائریکٹری',
    title: 'عہدیداران / Designation Holders',
    description:
      'ممبرز یہاں JAS کے باقاعدہ assigned عہدیداران کا نام، تصویر، لیول اور عہدہ درست تنظیمی ترتیب میں دیکھ سکتے ہیں۔',
    ctaJoin: 'ممبر بنیں',
    ctaCommittees: 'کمیٹیاں دیکھیں',
    publicDirectory: 'عوامی عہدہ ریکارڈ',
    publicDirectoryText:
      'یہاں صرف active public committees کے active designation holders show ہوتے ہیں۔ ترتیب CEC، Central Advisory، Provincial، Divisional، District اور Taluka ہے۔',
    totalHolders: 'عہدیداران',
    activeLevels: 'Active Levels',
    cec: 'CEC',
    centralAdvisory: 'Advisory',
    provincial: 'Provincial',
    divisional: 'Divisional',
    district: 'District',
    taluka: 'Taluka',
    searchPlaceholder: 'نام، عہدہ، ضلع، تعلقہ یا ممبر ID سے search کریں...',
    allLevels: 'All Levels',
    loading: 'Designation holders load ہو رہے ہیں...',
    empty: 'ابھی کوئی public designation holder موجود نہیں۔ Admin > Committees سے active member add کریں اور committee public display enable کریں۔',
    holderName: 'Name',
    designation: 'Designation',
    level: 'Level',
    location: 'Area / Jurisdiction',
    memberId: 'Member ID',
    tenure: 'Tenure',
    committee: 'Committee',
    notDisclosed: 'Not disclosed',
    listed: 'listed',
    activeDesignationHolders: 'active designation holders',
    orderedBy: 'Official JAS hierarchy کے مطابق ترتیب',
    noPhoto: 'Photo not available',
  },
  sd: {
    eyebrow: 'JAS عوامي قيادت ڊائريڪٽري',
    title: 'عهديدار / Designation Holders',
    description:
      'ميمبر هتي JAS جي assigned عهديدارن جو نالو، تصوير، ليول ۽ عھدو صحيح تنظيمي ترتيب ۾ ڏسي سگهن ٿا.',
    ctaJoin: 'ميمبر ٿيو',
    ctaCommittees: 'ڪميٽيون ڏسو',
    publicDirectory: 'عوامي عھدو رڪارڊ',
    publicDirectoryText:
      'هتي صرف active public committees جا active designation holders show ٿين ٿا. ترتيب CEC، Central Advisory، Provincial، Divisional، District ۽ Taluka آهي.',
    totalHolders: 'عهديدار',
    activeLevels: 'Active Levels',
    cec: 'CEC',
    centralAdvisory: 'Advisory',
    provincial: 'Provincial',
    divisional: 'Divisional',
    district: 'District',
    taluka: 'Taluka',
    searchPlaceholder: 'نالو، عھدو، ضلعو، تعلقو يا ميمبر ID سان search ڪريو...',
    allLevels: 'All Levels',
    loading: 'Designation holders load ٿي رهيا آهن...',
    empty: 'اڃا تائين ڪو public designation holder موجود ناهي. Admin > Committees مان active member add ڪريو ۽ committee public display enable ڪريو.',
    holderName: 'Name',
    designation: 'Designation',
    level: 'Level',
    location: 'Area / Jurisdiction',
    memberId: 'Member ID',
    tenure: 'Tenure',
    committee: 'Committee',
    notDisclosed: 'Not disclosed',
    listed: 'listed',
    activeDesignationHolders: 'active designation holders',
    orderedBy: 'Official JAS hierarchy مطابق ترتيب',
    noPhoto: 'Photo not available',
  },
}

function DesignationHoldersPage() {
  const { language } = useI18n()
  const copy = copyByLanguage[language]
  const [holders, setHolders] = useState<PublicDesignationHolderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<HolderFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function loadHolders() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPublicDesignationHolders()
        if (!cancelled) setHolders(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load designation holders.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadHolders()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredHolders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return holders.filter((holder) => {
      const matchesLevel = filter === 'all' || holder.level === filter
      const matchesSearch = query.length === 0 || getDesignationHolderSearchText(holder).includes(query)
      return matchesLevel && matchesSearch
    })
  }, [filter, holders, search])

  const groupedHolders = useMemo(() => {
    return designationHolderLevelOrder
      .map((level) => ({
        level,
        holders: filteredHolders.filter((holder) => holder.level === level),
      }))
      .filter((group) => group.holders.length > 0)
  }, [filteredHolders])

  const stats = useMemo(() => {
    const activeLevels = new Set(holders.map((holder) => holder.level)).size
    return { total: holders.length, activeLevels }
  }, [holders])

  return (
    <main className="px-3 py-8 sm:px-4 sm:py-12" dir="ltr">
      <div className="page-wrap space-y-7">
        <section className="overflow-hidden rounded-[2.2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_50%,#ecf6ef)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="section-eyebrow mb-3">{copy.eyebrow}</p>
              <h1 className="max-w-4xl text-[clamp(2.4rem,5.4vw,5rem)] font-black leading-[0.96] tracking-[-0.06em] text-slate-950">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                {copy.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/signup" className="primary-btn no-underline">
                  {copy.ctaJoin}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/committees" className="secondary-btn no-underline">
                  {copy.ctaCommittees}
                </Link>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-emerald-900/10 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <Award size={25} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">{copy.publicDirectory}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{copy.publicDirectoryText}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {designationHolderLevelOrder.map((level) => (
                  <span key={level} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-800 ring-1 ring-emerald-100">
                    {getLocalizedLevelLabel(level, copy)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label={copy.totalHolders} value={stats.total} />
          <StatCard label={copy.activeLevels} value={stats.activeLevels} />
          <StatCard label={copy.cec} value={holders.filter((holder) => holder.level === 'central').length} />
          <StatCard label={copy.centralAdvisory} value={holders.filter((holder) => holder.level === 'central_advisory').length} />
          <StatCard label={copy.district} value={holders.filter((holder) => holder.level === 'district').length} />
          <StatCard label={copy.taluka} value={holders.filter((holder) => holder.level === 'taluka').length} />
        </section>

        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder={copy.searchPlaceholder}
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as HolderFilter)}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">{copy.allLevels}</option>
              {designationHolderLevelOrder.map((level) => (
                <option key={level} value={level}>{getLocalizedLevelLabel(level, copy)}</option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <StateCard message={copy.loading} />
        ) : error ? (
          <StateCard message={error} tone="error" />
        ) : filteredHolders.length === 0 ? (
          <StateCard message={copy.empty} />
        ) : (
          <div className="space-y-8">
            {groupedHolders.map((group) => (
              <section key={group.level} className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="section-eyebrow mb-2">{copy.orderedBy}</p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      {getLocalizedLevelLabel(group.level, copy)} {copy.activeDesignationHolders}
                    </h2>
                  </div>
                  <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                    {group.holders.length} {copy.listed}
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.holders.map((holder) => (
                    <DesignationHolderCard key={holder.public_key} holder={holder} copy={copy} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function DesignationHolderCard({ holder, copy }: { holder: PublicDesignationHolderRecord; copy: PageCopy }) {
  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(12,71,49,0.10),rgba(196,145,44,0.14))]" />
      <div className="relative flex items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.4rem] bg-emerald-950 shadow-sm ring-4 ring-white">
          {holder.photo_signed_url ? (
            <img
              src={holder.photo_signed_url}
              alt={`${holder.full_name} profile`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-black text-[#f2d48f]" title={copy.noPhoto}>
              {getDesignationHolderInitials(holder.full_name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[0.67rem] font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
              {getDesignationHolderLevelLabel(holder.level)}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[0.67rem] font-black uppercase tracking-wide text-amber-800 ring-1 ring-amber-100">
              Active
            </span>
          </div>
          <h3 className="mt-3 text-xl font-black leading-tight text-slate-950">{holder.full_name}</h3>
          {holder.father_name ? (
            <p className="mt-1 text-sm font-semibold text-slate-500">Father: {holder.father_name}</p>
          ) : null}
        </div>
      </div>

      <div className="relative mt-6 space-y-3 text-sm">
        <InfoLine icon={<Award size={15} />} label={copy.designation} value={holder.designation_title} />
        <InfoLine icon={<ShieldCheck size={15} />} label={copy.level} value={getDesignationHolderLevelLabel(holder.level)} />
        <InfoLine icon={<MapPin size={15} />} label={copy.location} value={getDesignationHolderLocation(holder)} />
        <InfoLine icon={<Users size={15} />} label={copy.committee} value={holder.committee_name} />
        <InfoLine icon={<IdCard size={15} />} label={copy.memberId} value={holder.member_no || copy.notDisclosed} />
        <InfoLine icon={<CalendarDays size={15} />} label={copy.tenure} value={formatDesignationHolderTenure(holder)} />
      </div>
    </article>
  )
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <span className="mt-0.5 text-emerald-700">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[0.68rem] font-black uppercase tracking-wide text-slate-500">{label}</span>
        <span className="mt-0.5 block break-words font-bold text-slate-900">{value}</span>
      </span>
    </div>
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
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  )
}

function getLocalizedLevelLabel(level: DesignationHolderLevel, copy: PageCopy) {
  switch (level) {
    case 'central':
      return copy.cec
    case 'central_advisory':
      return copy.centralAdvisory
    case 'provincial':
      return copy.provincial
    case 'divisional':
      return copy.divisional
    case 'district':
      return copy.district
    case 'taluka':
      return copy.taluka
    default:
      return getDesignationHolderLevelLabel(level)
  }
}
