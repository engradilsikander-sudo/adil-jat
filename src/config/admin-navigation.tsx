import type { ReactNode } from 'react'
import {
  BadgeIndianRupee,
  BarChart3,
  Bell,
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  FilePenLine,
  FileText,
  HandHeart,
  HeartPulse,
  Images,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Network,
  Newspaper,
  ShieldCheck,
  UserCog,
  Users,
  Vote,
} from 'lucide-react'

export type AdminNavigationRoute =
  | '/admin'
  | '/admin/profile-update-requests'
  | '/admin/notifications'
  | '/admin/programs/education'
  | '/admin/programs/health'
  | '/admin/programs/welfare'
  | '/admin/programs/employment'
  | '/admin/committees'
  | '/admin/designations'
  | '/admin/roles'
  | '/admin/area-permissions'
  | '/admin/finance'
  | '/admin/reports'
  | '/admin/audit-logs'
  | '/admin/cms'
  | '/admin/news'
  | '/admin/gallery'
  | '/admin/events'

export type AdminNavigationItem = {
  label: string
  to?: AdminNavigationRoute
  icon: ReactNode
  badge?: string
  disabled?: boolean
}

export type AdminNavigationGroup = {
  title: string
  items: AdminNavigationItem[]
}

/**
 * Navigation presentation only; RLS and server/RPC guards remain authoritative.
 * Uses the same database-backed Super Admin gate as Finance (R1.2).
 */
const superAdminOnlyRoutes: ReadonlySet<AdminNavigationRoute> = new Set<AdminNavigationRoute>([
  '/admin/finance',
  '/admin/roles',
  '/admin/area-permissions',
  '/admin/audit-logs',
])

export function getVisibleAdminNavigationGroups(superAdminAllowed: boolean): AdminNavigationGroup[] {
  return adminNavigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !item.to || !superAdminOnlyRoutes.has(item.to) || superAdminAllowed,
    ),
  })).filter((group) => group.items.length > 0)
}

function normalizeAdminPath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/**
 * The Dashboard, Members, Pending Applications and Digital Cards legacy links
 * all navigate to /admin. Only Dashboard may show aria-current on that path.
 * This is visual state, not a change to the existing destinations or workflows.
 */
export function isActiveAdminNavigationItem(pathname: string, item: AdminNavigationItem): boolean {
  if (item.disabled || !item.to) return false
  const current = normalizeAdminPath(pathname)
  const target = normalizeAdminPath(item.to)
  if (target === '/admin') return current === '/admin' && item.label === 'Dashboard'
  return current === target || current.startsWith(`${target}/`)
}

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        icon: <LayoutDashboard size={17} />,
      },
      {
        label: 'Notification Center',
        to: '/admin/notifications',
        icon: <BellRing size={17} />,
      },
    ],
  },
  {
    title: 'Membership',
    items: [
      {
        label: 'Members',
        to: '/admin',
        icon: <Users size={17} />,
      },
      {
        label: 'Pending Applications',
        to: '/admin',
        icon: <ListChecks size={17} />,
      },
      {
        label: 'Digital Cards',
        to: '/admin',
        icon: <ShieldCheck size={17} />,
      },
      {
        label: 'Profile Update Requests',
        to: '/admin/profile-update-requests',
        icon: <FilePenLine size={17} />,
      },
    ],
  },
  {
    title: 'Programs',
    items: [
      {
        label: 'Education',
        to: '/admin/programs/education',
        icon: <BookOpenCheck size={17} />,
      },
      {
        label: 'Health',
        to: '/admin/programs/health',
        icon: <HeartPulse size={17} />,
      },
      {
        label: 'Welfare',
        to: '/admin/programs/welfare',
        icon: <HandHeart size={17} />,
      },
      {
        label: 'Employment',
        to: '/admin/programs/employment',
        icon: <BriefcaseBusiness size={17} />,
      },
      {
        label: 'Program Appointments',
        icon: <UserCog size={17} />,
        badge: 'Later',
        disabled: true,
      },
    ],
  },
  {
    title: 'Organization',
    items: [
      {
        label: 'Organization Levels',
        to: '/admin/committees',
        icon: <Network size={17} />,
      },
      {
        label: 'Designations',
        to: '/admin/designations',
        icon: <ShieldCheck size={17} />,
      },
      {
        label: 'Roles',
        to: '/admin/roles',
        icon: <KeyRound size={17} />,
      },
      {
        label: 'Area Permissions',
        to: '/admin/area-permissions',
        icon: <MapPin size={17} />,
      },
      {
        label: 'Elections',
        icon: <Vote size={17} />,
        badge: 'Future',
        disabled: true,
      },
    ],
  },
  {
    title: 'Finance & Reports',
    items: [
      {
        label: 'Finance',
        to: '/admin/finance',
        icon: <BadgeIndianRupee size={17} />,
      },
      {
        label: 'Reports',
        to: '/admin/reports',
        icon: <BarChart3 size={17} />,
      },
      {
        label: 'Audit Logs',
        to: '/admin/audit-logs',
        icon: <ListChecks size={17} />,
      },
      {
        label: 'Donations',
        icon: <Bell size={17} />,
        badge: 'Manual',
        disabled: true,
      },
    ],
  },
  {
    title: 'Public CMS',
    items: [
      {
        label: 'CMS',
        to: '/admin/cms',
        icon: <FileText size={17} />,
      },
      {
        label: 'News',
        to: '/admin/news',
        icon: <Newspaper size={17} />,
      },
      {
        label: 'Gallery',
        to: '/admin/gallery',
        icon: <Images size={17} />,
      },
      {
        label: 'Events',
        to: '/admin/events',
        icon: <CalendarDays size={17} />,
      },
    ],
  },
]
