import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgeCheck,
  BadgeIndianRupee,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  FileText,
  HandHeart,
  HeartPulse,
  KeyRound,
  ListChecks,
  MapPin,
  Network,
  Newspaper,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

type AdminRoleName =
  | 'admin'
  | 'super_admin'
  | 'membership_admin'
  | 'education_admin'
  | 'health_admin'
  | 'employment_admin'
  | 'ration_admin'
  | 'welfare_admin'
  | 'finance_admin'

type AdminModuleKey =
  | 'membership'
  | 'education'
  | 'health'
  | 'welfare'
  | 'employment'
  | 'finance'
  | 'cms'
  | 'media'
  | 'reports'
  | 'roles'
  | 'area-permissions'
  | 'audit-logs'
  | 'committees'

type AdminRouteTo =
  | '/admin/programs/education'
  | '/admin/programs/health'
  | '/admin/programs/welfare'
  | '/admin/programs/employment'
  | '/admin/finance'
  | '/admin/cms'
  | '/admin/news'
  | '/admin/reports'
  | '/admin/roles'
  | '/admin/area-permissions'
  | '/admin/audit-logs'
  | '/admin/committees'

type ModuleCardConfig = {
  key: AdminModuleKey
  title: string
  description: string
  to?: AdminRouteTo
  actionLabel: string
  icon: LucideIcon
  tone:
    | 'membership'
    | 'education'
    | 'health'
    | 'welfare'
    | 'employment'
    | 'finance'
    | 'cms'
    | 'media'
    | 'reports'
    | 'roles'
    | 'area'
    | 'audit'
    | 'committees'
  metric?: string
  metricLabel?: string
  badgeLabel?: string
  comingSoon?: boolean
}

type MembershipStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  cards: number
}

export function AdminProgramShortcuts({
  roles,
  stats,
}: {
  roles: readonly AdminRoleName[]
  stats: MembershipStats
}) {
  const cards: ModuleCardConfig[] = [
    {
      key: 'membership',
      title: 'Membership',
      description:
        'Review member registrations, approve or reject applications, and open QR-based digital membership cards.',
      actionLabel: 'Current Page',
      icon: ShieldCheck,
      tone: 'membership',
      metric: String(stats.pending),
      metricLabel: 'Pending',
    },
    {
      key: 'education',
      title: 'Education',
      description:
        'Manage scholarship, fee support, documents, review notes and approved education support amounts.',
      to: '/admin/programs/education',
      actionLabel: 'Open Education',
      icon: BookOpenCheck,
      tone: 'education',
    },
    {
      key: 'health',
      title: 'Health',
      description:
        'Review medical help, emergency treatment, hospital estimates, prescriptions and committee decisions.',
      to: '/admin/programs/health',
      actionLabel: 'Open Health',
      icon: HeartPulse,
      tone: 'health',
    },
    {
      key: 'welfare',
      title: 'Welfare',
      description:
        'Manage financial help, ration, widow/orphan, emergency, legal and family support cases.',
      to: '/admin/programs/welfare',
      actionLabel: 'Open Welfare',
      icon: HandHeart,
      tone: 'welfare',
    },
    {
      key: 'employment',
      title: 'Employment',
      description:
        'Review job seeker profiles, CV uploads, skills, training interests, shortlists and placements.',
      to: '/admin/programs/employment',
      actionLabel: 'Open Employment',
      icon: BriefcaseBusiness,
      tone: 'employment',
    },
    {
      key: 'finance',
      title: 'Finance',
      description:
        'Track donations, expenses, approvals, receipts, available balance and finance audit logs.',
      to: '/admin/finance',
      actionLabel: 'Open Finance',
      icon: BadgeIndianRupee,
      tone: 'finance',
    },
    {
      key: 'cms',
      title: 'Public Website CMS',
      description:
        'Update public pages such as About, Vision & Mission, Manifesto, Constitution, CWC and Contact.',
      to: '/admin/cms',
      actionLabel: 'Open CMS',
      icon: FileText,
      tone: 'cms',
    },
    {
      key: 'media',
      title: 'News & Media',
      description:
        'Create and publish news, announcements, gallery items and public event notices.',
      to: '/admin/news',
      actionLabel: 'Open News Admin',
      icon: Newspaper,
      tone: 'media',
    },
    {
      key: 'reports',
      title: 'Reports Center',
      description:
        'View organization-wide summaries for members, programs, finance, districts and monthly activity.',
      to: '/admin/reports',
      actionLabel: 'Open Reports',
      icon: BarChart3,
      tone: 'reports',
      badgeLabel: 'Admin',
    },
    {
      key: 'roles',
      title: 'Roles & Permissions',
      description:
        'Assign or remove admin roles, review user access and protect super admin controls.',
      to: '/admin/roles',
      actionLabel: 'Manage Roles',
      icon: KeyRound,
      tone: 'roles',
      badgeLabel: 'Super Admin',
    },
    {
      key: 'area-permissions',
      title: 'Area Permissions',
      description:
        'Assign district, taluka and All Sindh access for module admins after giving them roles.',
      to: '/admin/area-permissions',
      actionLabel: 'Manage Area Access',
      icon: MapPin,
      tone: 'area',
      badgeLabel: 'Super Admin',
    },
    {
      key: 'audit-logs',
      title: 'Audit Logs',
      description:
        'Review sensitive admin activity, role changes, area access updates, finance edits and committee actions.',
      to: '/admin/audit-logs',
      actionLabel: 'Open Audit Logs',
      icon: ListChecks,
      tone: 'audit',
      badgeLabel: 'Super Admin',
    },
    {
      key: 'committees',
      title: 'Organization Levels & Designations',
      description:
        'Manage organization level units, designations and assignment records.',
      to: '/admin/committees',
      actionLabel: 'Open Levels',
      icon: Network,
      tone: 'committees',
      badgeLabel: 'Phase 1',
    },
  ]

  const visibleCards = cards.filter((card) => canAccessAdminModule(roles, card.key))
  const isSuperAdmin = roles.includes('super_admin')
  const accessLabel = isSuperAdmin
    ? 'Super admin control layer active'
    : roles.includes('admin')
      ? 'Central admin operations access'
      : 'Role-based module access'

  return (
    <section className="rounded-[2rem] bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Admin Modules
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Control center shortcuts
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Open the authorized modules for membership, programs, finance,
            public website content, reports and system access management.
          </p>
        </div>

        <div className="space-y-2">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
            {visibleCards.length} module{visibleCards.length === 1 ? '' : 's'} available
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
            {accessLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {visibleCards.map((card) => (
          <AdminModuleCard key={card.key} card={card} />
        ))}
      </div>
    </section>
  )
}


function canAccessAdminModule(
  roles: readonly AdminRoleName[],
  moduleKey: AdminModuleKey,
) {
  if (roles.includes('super_admin')) {
    return true
  }

  if (moduleKey === 'roles' || moduleKey === 'area-permissions' || moduleKey === 'audit-logs') {
    return false
  }

  if (roles.includes('admin')) {
    return true
  }

  const roleByModule: Partial<Record<AdminModuleKey, AdminRoleName>> = {
    membership: 'membership_admin',
    education: 'education_admin',
    health: 'health_admin',
    welfare: 'welfare_admin',
    employment: 'employment_admin',
    finance: 'finance_admin',
  }

  const requiredRole = roleByModule[moduleKey]

  return requiredRole ? roles.includes(requiredRole) : false
}

function AdminModuleCard({ card }: { card: ModuleCardConfig }) {
  const Icon = card.icon
  const tone = getModuleTone(card.tone)

  return (
    <article
      className={`group flex min-h-[270px] flex-col overflow-hidden rounded-[1.6rem] border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${tone.card}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 ${tone.icon}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        {card.metric ? (
          <div className="min-w-[76px] rounded-2xl bg-white/85 px-3 py-2 text-center shadow-sm ring-1 ring-black/5 backdrop-blur">
            <p className="text-xl font-black leading-none text-slate-950">
              {card.metric}
            </p>
            <p className="mt-1 text-[0.62rem] font-black uppercase tracking-wide text-slate-500">
              {card.metricLabel}
            </p>
          </div>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em] ${tone.badge}`}
          >
            {card.badgeLabel ?? 'Module'}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-2xl font-black tracking-tight text-slate-950">
          {card.title}
        </h3>

        <p className="mt-3 text-[0.95rem] leading-7 text-slate-600">
          {card.description}
        </p>
      </div>

      <div className="mt-6">
        {card.to ? (
          <Link
            to={card.to}
            className={`inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black !text-white no-underline shadow-sm transition ${tone.action}`}
            style={{ color: '#ffffff' }}
          >
            {card.actionLabel}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        ) : card.comingSoon ? (
          <div className="inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm">
            {card.actionLabel}
          </div>
        ) : (
          <div className="inline-flex min-h-[2.85rem] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-black text-white shadow-sm">
            {card.actionLabel}
            <CheckMini />
          </div>
        )}
      </div>
    </article>
  )
}

function getModuleTone(tone: ModuleCardConfig['tone']) {
  const tones: Record<
    ModuleCardConfig['tone'],
    {
      card: string
      icon: string
      badge: string
      action: string
    }
  > = {
    membership: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
      icon: 'bg-emerald-100 text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800',
      action: 'bg-emerald-800 !text-white hover:bg-emerald-900 hover:!text-white',
    },
    education: {
      card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white',
      icon: 'bg-amber-100 text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
      action: 'bg-slate-950 !text-white hover:bg-amber-900 hover:!text-white',
    },
    health: {
      card: 'border-red-200 bg-gradient-to-br from-red-50 via-white to-white',
      icon: 'bg-red-100 text-red-800',
      badge: 'bg-red-100 text-red-800',
      action: 'bg-slate-950 !text-white hover:bg-red-900 hover:!text-white',
    },
    welfare: {
      card: 'border-orange-200 bg-gradient-to-br from-orange-50 via-white to-white',
      icon: 'bg-orange-100 text-orange-800',
      badge: 'bg-orange-100 text-orange-800',
      action: 'bg-slate-950 !text-white hover:bg-orange-900 hover:!text-white',
    },
    employment: {
      card: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white',
      icon: 'bg-sky-100 text-sky-800',
      badge: 'bg-sky-100 text-sky-800',
      action: 'bg-slate-950 !text-white hover:bg-sky-900 hover:!text-white',
    },
    finance: {
      card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
      icon: 'bg-emerald-100 text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800',
      action: 'bg-slate-950 !text-white hover:bg-emerald-900 hover:!text-white',
    },
    cms: {
      card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white',
      icon: 'bg-violet-100 text-violet-800',
      badge: 'bg-violet-100 text-violet-800',
      action: 'bg-slate-950 !text-white hover:bg-violet-900 hover:!text-white',
    },
    media: {
      card: 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white',
      icon: 'bg-cyan-100 text-cyan-800',
      badge: 'bg-cyan-100 text-cyan-800',
      action: 'bg-slate-950 !text-white hover:bg-cyan-900 hover:!text-white',
    },
    reports: {
      card: 'border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white',
      icon: 'bg-indigo-100 text-indigo-800',
      badge: 'bg-indigo-100 text-indigo-800',
      action: 'bg-slate-950 !text-white hover:bg-indigo-900 hover:!text-white',
    },
    roles: {
      card: 'border-slate-300 bg-gradient-to-br from-slate-50 via-white to-white',
      icon: 'bg-slate-900 text-white',
      badge: 'bg-slate-900 text-white',
      action: 'bg-slate-950 !text-white hover:bg-slate-800 hover:!text-white',
    },
    area: {
      card: 'border-teal-200 bg-gradient-to-br from-teal-50 via-white to-white',
      icon: 'bg-teal-100 text-teal-800',
      badge: 'bg-teal-100 text-teal-800',
      action: 'bg-slate-950 !text-white hover:bg-teal-900 hover:!text-white',
    },
    audit: {
      card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-white',
      icon: 'bg-rose-100 text-rose-800',
      badge: 'bg-rose-100 text-rose-800',
      action: 'bg-slate-950 !text-white hover:bg-rose-900 hover:!text-white',
    },
    committees: {
      card: 'border-lime-200 bg-gradient-to-br from-lime-50 via-white to-white',
      icon: 'bg-lime-100 text-lime-800',
      badge: 'bg-lime-100 text-lime-800',
      action: 'bg-slate-950 !text-white hover:bg-lime-900 hover:!text-white',
    },
  }

  return tones[tone]
}

function CheckMini() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
      <BadgeCheck className="h-3.5 w-3.5" />
    </span>
  )
}

