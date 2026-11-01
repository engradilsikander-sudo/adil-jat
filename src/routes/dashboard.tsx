import { journeyCopy } from '../lib/member-journey'
import { FreeMembershipNotice } from '../components/FreeMembershipNotice'
// src/routes/dashboard.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileHeart,
  HandHeart,
  HeartPulse,
  IdCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Trophy,
  User,
  UserRoundPen,
  Users,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { formatDonationMoney, getDonationPurposeLabel } from '../lib/donations'
import { useI18n, type TranslationKey } from '../lib/i18n'
import {
  getNotificationTone,
  getProgramApplyPath,
  getProgramPath,
  getProgramSingularLabel,
  getProgramStatusClass,
  getProgramStatusLabel,
  type UserNotification,
} from '../lib/notifications'
import { MemberNavigation } from '../components/layout/MemberNavigation'
import { supabase } from '../lib/supabase/client'
import {
  formatDisplayDate as formatDate,
  maskCnic,
  maskMobile,
} from '../lib/shared/formatters'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type MemberStatus = 'pending' | 'approved' | 'rejected'

type Member = {
  id: string
  user_id: string
  member_no: string | null
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  profession: string | null
  caste_branch: string | null
  photo_url: string | null
  status: MemberStatus
  rejection_reason: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
}

type ProgramApplication = {
  id: string
  application_no: string | null
  program_key: string
  status: string
  applicant_name: string
  membership_no: string
  district: string | null
  taluka: string | null
  approved_amount: number | null
  admin_remarks: string | null
  created_at: string
  submitted_at: string
  updated_at: string
}

type FinanceDonation = {
  id: string
  donation_no: string | null
  amount: number
  purpose: string
  status: string
  approved_at: string | null
  created_at: string
}

type DashboardData = {
  member: Member | null
  photoSignedUrl: string | null
  applications: ProgramApplication[]
  donations: FinanceDonation[]
  donorRank: number | null
  notifications: UserNotification[]
}

const programOrder = ['education', 'health', 'welfare', 'employment']


const dashboardProgramLabelKeys: Record<string, TranslationKey> = {
  education: 'dashboard.program.education',
  health: 'dashboard.program.health',
  welfare: 'dashboard.program.welfare',
  employment: 'dashboard.program.employment',
}

function getLocalizedProgramLabel(
  programKey: string,
  t: (key: TranslationKey) => string,
) {
  return t(dashboardProgramLabelKeys[programKey] ?? 'dashboard.program.education')
}

function getLocalizedMemberStatusLabel(
  status: MemberStatus,
  t: (key: TranslationKey) => string,
) {
  switch (status) {
    case 'approved':
      return t('dashboard.status.approved')
    case 'rejected':
      return t('dashboard.status.rejected')
    default:
      return t('dashboard.status.pending')
  }
}

function DashboardPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()
  const [loading, setLoading] = useState(true)
  const [secondaryLoading, setSecondaryLoading] = useState(false)
  const [, setRefreshing] = useState(false)
  const [showSensitive, setShowSensitive] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DashboardData>({
    member: null,
    photoSignedUrl: null,
    applications: [],
    donations: [],
    donorRank: null,
    notifications: [],
  })

  useEffect(() => {
    void loadDashboard()
  }, [])

  async function loadDashboard(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false
    if (silent) setRefreshing(true)
    else setLoading(true)

    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await navigate({ to: '/login', replace: true })
      return
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(
        [
          'id',
          'user_id',
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
          'rejection_reason',
          'approved_at',
          'created_at',
          'updated_at',
          'address',
          'date_of_birth',
          'gender',
          'education',
          'blood_group',
          'emergency_contact_name',
          'emergency_contact_relation',
          'emergency_contact_mobile',
          'declaration_accepted',
        ].join(', '),
      )
      .eq('user_id', user.id)
      .maybeSingle()
      .returns<Member | null>()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      setRefreshing(false)
      setSecondaryLoading(false)
      return
    }

    const photoSignedUrl = await loadMemberPhoto(memberData?.photo_url)

    setData((current) => ({
      ...current,
      member: memberData,
      photoSignedUrl,
      applications: silent ? current.applications : [],
      donations: silent ? current.donations : [],
      notifications: silent ? current.notifications : [],
      donorRank: null,
    }))

    setLoading(false)
    setRefreshing(false)

    if (!memberData) {
      setSecondaryLoading(false)
      return
    }

    setSecondaryLoading(true)

    const [applications, donations, notifications] = await Promise.all([
      loadProgramApplications(user.id),
      loadDonations(user.id),
      loadNotifications(user.id),
    ])

    setData((current) => ({
      ...current,
      applications,
      donations,
      notifications,
      donorRank: null,
    }))

    setSecondaryLoading(false)
  }

  const member = data.member
  const summaries = useMemo(() => {
    const byProgram = programOrder.map((programKey) => {
      const items = data.applications.filter(
        (item) => item.program_key === programKey,
      )
      const latest = [...items].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      )[0]

      return {
        programKey,
        total: items.length,
        latest,
      }
    })

    const approvedDonations = data.donations.filter(
      (item) => item.status === 'approved',
    )
    const totalDonated = approvedDonations.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    )
    const pendingDonations = data.donations.filter(
      (item) => item.status === 'pending',
    ).length

    return {
      byProgram,
      totalDonated,
      donationCount: approvedDonations.length,
      pendingDonations,
      unreadNotifications: data.notifications.filter((item) => !item.is_read)
        .length,
    }
  }, [data.applications, data.donations, data.notifications])

  if (loading) {
    return (
      <main dir={direction} className="dashboard-page min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:py-10">
        <div className="page-wrap rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {t('dashboard.loading')}
          </div>
        </div>
      </main>
    )
  }

  if (!member) {
    return (
      <main dir={direction} className="dashboard-page min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:py-10">
        <div className="page-wrap rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-amber-700" />
          <h1 className="mt-4 text-3xl font-black text-slate-950">
            {t('dashboard.noMember.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
            {t('dashboard.noMember.description')}
          </p>
          <FreeMembershipNotice />
          <Link to="/register" className="primary-btn mt-6">
            {t('dashboard.noMember.cta')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main dir={direction} className="dashboard-page min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:py-10">
      <div className="dashboard-wrap page-wrap space-y-6 sm:space-y-8">
        <MemberNavigation />
        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="dashboard-hero overflow-hidden rounded-[1.5rem] border border-emerald-900/10 bg-white shadow-sm sm:rounded-[2rem]">
          <div className="dashboard-hero-inner bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-5 text-white sm:p-6 md:p-8">
            <div className="dashboard-hero-grid grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <div className="dashboard-kicker inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                  <LayoutIcon />
                  {t('dashboard.unified')}
                </div>

                <h1 className="dashboard-title mt-5 text-2xl font-black leading-tight sm:text-3xl md:text-5xl">
                  {t('dashboard.welcome')}, <span dir="auto">{member.full_name}</span>
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                  {t('dashboard.subtitle')}
                </p>

                <div className="dashboard-info-chips mt-5 flex flex-wrap gap-2">
                  <InfoChip icon={<IdCard className="h-4 w-4" />}>
                    <span dir="ltr">{member.member_no || t('dashboard.memberIdPending')}</span>
                  </InfoChip>
                  <InfoChip icon={<MapPin className="h-4 w-4" />}>
                    {member.taluka
                      ? `${member.district} / ${member.taluka}`
                      : member.district}
                  </InfoChip>
                  <InfoChip icon={<CalendarDays className="h-4 w-4" />}>
                    {t('dashboard.joined')} <span dir="ltr">{formatDate(member.created_at)}</span>
                  </InfoChip>
                </div>
              </div>

              <div className="dashboard-profile-card rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur sm:p-5">
                <div className="dashboard-profile-row flex items-center gap-3 sm:gap-4">
                  {data.photoSignedUrl ? (
                    <img
                      src={data.photoSignedUrl}
                      alt={member.full_name}
                      className="h-20 w-20 rounded-3xl border-2 border-amber-300 object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-amber-300 bg-white/10">
                      <User className="h-8 w-8 text-white/60" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">
                      {member.full_name}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/65">
                      {t('dashboard.father')}: <span dir="auto">{member.father_name}</span>
                    </p>
                    <StatusBadge status={member.status} />
                  </div>
                </div>

                <div className="dashboard-mini-grid mt-5 grid grid-cols-2 gap-3">
                  <MiniMetric
                    label={t('dashboard.notifications')}
                    value={secondaryLoading ? '…' : summaries.unreadNotifications}
                  />
                  <MiniMetric
                    label={t('dashboard.donorRank')}
                    value={data.donorRank ? `#${data.donorRank}` : '-'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-overview-grid grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:p-6">
            <OverviewCard
              label={t('dashboard.membership')}
              value={getLocalizedMemberStatusLabel(member.status, t)}
              icon={<ShieldCheck className="h-5 w-5" />}
              tone="emerald"
            />
            <OverviewCard
              label={t('signup.fee.label')}
              value={t('membership.freeLabel')}
              icon={<CreditCard className="h-5 w-5" />}
              tone="amber"
            />
            <OverviewCard
              label={t('dashboard.programsSubmitted')}
              value={secondaryLoading ? '…' : data.applications.length}
              icon={<BookOpenCheck className="h-5 w-5" />}
              tone="amber"
            />
            <OverviewCard
              label={t('dashboard.totalDonated')}
              value={secondaryLoading ? '…' : formatDonationMoney(summaries.totalDonated)}
              icon={<BadgeIndianRupee className="h-5 w-5" />}
              tone="emerald"
            />
            <OverviewCard
              label={t('dashboard.pendingDonations')}
              value={secondaryLoading ? '…' : summaries.pendingDonations}
              icon={<Trophy className="h-5 w-5" />}
              tone="slate"
            />
          </div>
        </section>

        <section className="dashboard-content-grid grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <section className="dashboard-card rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    {t('dashboard.myActivity')}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {t('dashboard.programSummary')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('dashboard.programSummaryDesc')}
                  </p>
                  {secondaryLoading ? (
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('dashboard.loading')}
                    </p>
                  ) : null}
                </div>
                <Link to="/notifications" className="secondary-btn">
                  <Bell className="h-4 w-4" />
                  {t('dashboard.viewUpdates')}
                </Link>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {summaries.byProgram.map((item) => (
                  <ProgramSummaryCard key={item.programKey} item={item} />
                ))}
              </div>
            </section>

            <section className="dashboard-card rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    {t('dashboard.memberProfile')}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {t('dashboard.personalInfo')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {t('dashboard.maskedDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSensitive((value) => !value)}
                  className="secondary-btn"
                >
                  {showSensitive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showSensitive ? t('dashboard.hideSensitive') : t('dashboard.showSensitive')}
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoBox label={t('dashboard.fullName')} value={member.full_name} />
                <InfoBox label={t('dashboard.fatherName')} value={member.father_name} />
                <InfoBox
                  label={t('dashboard.cnic')}
                  value={showSensitive ? member.cnic : maskCnic(member.cnic)}
                />
                <InfoBox
                  label={t('dashboard.mobile')}
                  value={showSensitive ? member.mobile : maskMobile(member.mobile)}
                />
                <InfoBox label={t('dashboard.district')} value={member.district} />
                <InfoBox label={t('dashboard.taluka')} value={member.taluka || t('dashboard.notProvided')} />
                <InfoBox
                  label={t('dashboard.profession')}
                  value={member.profession || t('dashboard.notProvided')}
                />
                <InfoBox
                  label={t('dashboard.education')}
                  value={member.education || t('dashboard.notProvided')}
                />
                <InfoBox
                  label={t('dashboard.bloodGroup')}
                  value={member.blood_group || t('dashboard.notProvided')}
                />
              </div>
            </section>
          </div>

          <aside className="dashboard-sidebar space-y-5">
            <QuickActions member={member} />
            <FreeMembershipNotice />
            <DonationPanel
              totalDonated={summaries.totalDonated}
              donationCount={summaries.donationCount}
              donorRank={data.donorRank}
              latestDonation={data.donations[0]}
              loading={secondaryLoading}
            />
            <NotificationsPreview notifications={data.notifications} />
          </aside>
        </section>
      </div>
    </main>
  )
}

function LayoutIcon() {
  return <Users className="h-4 w-4" />
}

function InfoChip({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85">
      {icon}
      {children}
    </span>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}

function OverviewCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string | number
  icon: ReactNode
  tone: 'emerald' | 'amber' | 'slate'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-800'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-slate-50 text-slate-800'

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </article>
  )
}

function ProgramSummaryCard({
  item,
}: {
  item: { programKey: string; total: number; latest?: ProgramApplication }
}) {
  const { t } = useI18n()
  const Icon = getProgramIcon(item.programKey)
  const latest = item.latest

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950">
              {getLocalizedProgramLabel(item.programKey, t)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {item.total} {t('dashboard.programsSubmitted').toLowerCase()}
            </p>
          </div>
        </div>

        {latest ? (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${getProgramStatusClass(
              latest.status,
            )}`}
          >
            {getProgramStatusLabel(latest.status)}
          </span>
        ) : null}
      </div>

      {latest ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
          <p className="font-black text-slate-950">
            {latest.application_no || getProgramSingularLabel(item.programKey)}
          </p>
          <p className="mt-1 text-slate-500">
            {t('dashboard.updated')} <span dir="ltr">{formatDate(latest.updated_at || latest.created_at)}</span>
          </p>
          {latest.approved_amount ? (
            <p className="mt-1 font-bold text-emerald-800">
              {t('dashboard.approvedAmount')}: {formatDonationMoney(latest.approved_amount)}
            </p>
          ) : null}
          <a
            href={`${getProgramPath(item.programKey)}/${latest.id}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline"
          >
            {t('dashboard.viewUpdates')}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-600">{t('dashboard.noApplication')}</p>
          <a
            href={getProgramApplyPath(item.programKey)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline"
          >
            {t('dashboard.applyNow')}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </article>
  )
}


function QuickActions({ member }: { member: Member }) {
  const { t, language } = useI18n()
  const canEditApplication =
    member.status === 'pending' || member.status === 'rejected'

  return (
    <section className="dashboard-quick-actions rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        {t('dashboard.quickActions')}
      </p>
      <h2 className="mt-2 text-xl font-black text-slate-950">{t('dashboard.nextSteps')}</h2>
      <div className="mt-5 grid gap-3">
        {member.status === 'approved' ? (
          <>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold leading-6 text-emerald-800">
              {t('dashboard.applicationLocked')}
            </div>

            <Link to="/card" className="primary-btn w-full">
              <CreditCard className="h-4 w-4" />
              {t('dashboard.openDigitalCard')}
            </Link>
            <Link to="/profile-update" className="secondary-btn w-full">
              <UserRoundPen className="h-4 w-4" />
              {t('dashboard.requestProfileUpdate')}
            </Link>
          </>
        ) : canEditApplication ? (
          <>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
              {t('dashboard.applicationEditable')}
            </div>

            <Link to="/register" className="primary-btn w-full">
              <IdCard className="h-4 w-4" />
              {member.status === 'pending' ? journeyCopy[language].view : journeyCopy[language].revise}
            </Link>
          </>
        ) : (
          <Link to="/register" className="primary-btn w-full">
            <IdCard className="h-4 w-4" />
            {t('dashboard.noMember.cta')}
          </Link>
        )}
        <Link to="/donate" className="secondary-btn w-full">
          <BadgeIndianRupee className="h-4 w-4" />
          {t('dashboard.submitDonation')}
        </Link>
        <Link to="/donors" className="secondary-btn w-full">
          <Trophy className="h-4 w-4" />
          {t('dashboard.viewDonors')}
        </Link>
      </div>
    </section>
  )
}

function DonationPanel({
  totalDonated,
  donationCount,
  donorRank,
  latestDonation,
  loading,
}: {
  totalDonated: number
  donationCount: number
  donorRank: number | null
  latestDonation?: FinanceDonation
  loading?: boolean
}) {
  const { t } = useI18n()

  return (
    <section className="dashboard-donation-panel rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        {t('dashboard.myDonations')}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">
        {loading ? '…' : formatDonationMoney(totalDonated)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
            {t('dashboard.approved')}
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {loading ? '…' : donationCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
            {t('dashboard.rank')}
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {loading ? '…' : donorRank ? `#${donorRank}` : '-'}
          </p>
        </div>
      </div>
      {latestDonation ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          {t('dashboard.latest')}: {latestDonation.donation_no || t('dashboard.myDonations')} ·{' '}
          {getDonationPurposeLabel(latestDonation.purpose)} ·{' '}
          {getProgramStatusLabel(latestDonation.status)}
        </p>
      ) : (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
          {t('dashboard.noDonationRank')}
        </p>
      )}
    </section>
  )
}

function NotificationsPreview({
  notifications,
}: {
  notifications: UserNotification[]
}) {
  const { t } = useI18n()

  return (
    <section className="dashboard-notifications-panel rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            {t('dashboard.recentUpdates')}
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {t('dashboard.notifications')}
          </h2>
        </div>
        <Link to="/notifications" className="text-sm font-black text-emerald-800">
          {t('dashboard.viewAll')}
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.slice(0, 4).map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-3 ${getNotificationTone(
              item.category,
            )}`}
          >
            <p className="text-sm font-black">{item.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 opacity-80">
              {item.message}
            </p>
          </article>
        ))}
        {!notifications.length ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            {t('dashboard.noNotifications')}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-info-box rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useI18n()
  const config = {
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-red-200 bg-red-50 text-red-800',
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
  } satisfies Record<MemberStatus, string>

  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${config[status]}`}
    >
      {status === 'approved' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : status === 'rejected' ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <BadgeCheck className="h-3.5 w-3.5" />
      )}
      {getLocalizedMemberStatusLabel(status, t)}
    </span>
  )
}

async function loadProgramApplications(userId: string) {
  const { data, error } = await supabase
    .from('program_applications')
    .select(
      'id, application_no, program_key, status, applicant_name, membership_no, district, taluka, approved_amount, admin_remarks, created_at, submitted_at, updated_at',
    )
    .eq('applicant_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<ProgramApplication[]>()

  if (error) return []
  return data || []
}

async function loadDonations(userId: string) {
  const { data, error } = await supabase
    .from('finance_donations')
    .select('id, donation_no, amount, purpose, status, approved_at, created_at')
    .eq('donor_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<FinanceDonation[]>()

  if (error) return []
  return data || []
}

async function loadNotifications(userId: string) {
  const client = supabase as unknown as {
    from: (table: 'notifications') => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => {
            limit: (count: number) => Promise<{
              data: UserNotification[] | null
              error: Error | null
            }>
          }
        }
      }
    }
  }

  const { data, error } = await client
    .from('notifications')
    .select(
      'id, user_id, title, message, category, related_type, related_id, action_url, is_read, read_at, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) return []
  return data || []
}


async function loadMemberPhoto(photoUrl?: string | null) {
  if (!photoUrl) return null

  const { data, error } = await supabase.storage
    .from('member-photos')
    .createSignedUrl(photoUrl, 60 * 60)

  if (error) return null
  return data?.signedUrl ?? null
}


function getProgramIcon(programKey: string) {
  switch (programKey) {
    case 'education':
      return BookOpenCheck
    case 'health':
      return HeartPulse
    case 'welfare':
      return HandHeart
    case 'employment':
      return BriefcaseBusiness
    default:
      return FileHeart
  }
}


