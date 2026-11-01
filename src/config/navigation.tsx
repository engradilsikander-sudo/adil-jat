import type { ReactNode } from 'react'
import {
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  GraduationCap,
  HandHeart,
  HeartPulse,
  IdCard,
  Images,
  Landmark,
  Network,
  ScrollText,
  ShieldCheck,
  Trophy,
  UserPlus,
} from 'lucide-react'

export type NavItem = {
  to: string
  label: string
  icon: ReactNode
  badgeCount?: number
}

export type ProgramItem = NavItem & { description: string }
export type PublicPageItem = NavItem & { description: string }
export type HeaderMenuKey = 'programs' | 'more' | 'account' | null

export const adminRoleNames = [
  'admin',
  'super_admin',
  'membership_admin',
  'education_admin',
  'health_admin',
  'employment_admin',
  'ration_admin',
  'welfare_admin',
  'finance_admin',
] as const

export const publicPageItems: PublicPageItem[] = [
  {
    to: '/about',
    label: 'About JAS',
    icon: <ShieldCheck size={16} />,
    description: 'Introduction, purpose and community platform overview',
  },
  {
    to: '/vision-mission',
    label: 'Vision & Mission',
    icon: <Landmark size={16} />,
    description: 'JAS vision, mission and service direction',
  },
  {
    to: '/manifesto',
    label: 'Manifesto / Manshoor',
    icon: <ScrollText size={16} />,
    description: 'Core manifesto points and public commitment',
  },
  {
    to: '/constitution',
    label: 'Constitution',
    icon: <BookOpenText size={16} />,
    description: 'Rules, structure and constitutional framework',
  },
  {
    to: '/cwc',
    label: 'Central Working Committee',
    icon: <FileText size={16} />,
    description: 'Central cabinet and top-level governing body',
  },
  {
    to: '/committees',
    label: 'Committees',
    icon: <Network size={16} />,
    description: 'Central, divisional, district and taluka committee office bearers',
  },
  {
    to: '/gallery',
    label: 'Gallery',
    icon: <Images size={16} />,
    description: 'Program photos, meetings and community activity',
  },
  {
    to: '/events',
    label: 'Events',
    icon: <CalendarDays size={16} />,
    description: 'Upcoming events, meetings and public activities',
  },
  {
    to: '/contact',
    label: 'Contact',
    icon: <HandHeart size={16} />,
    description: 'Contact, WhatsApp and coordination details',
  },
]

export const programItems: ProgramItem[] = [
  {
    to: '/programs/education',
    label: 'Education Support',
    icon: <GraduationCap size={16} />,
    description: 'Scholarships, fee support and skills training',
  },
  {
    to: '/programs/health',
    label: 'Health Assistance',
    icon: <HeartPulse size={16} />,
    description: 'Medical help and emergency treatment cases',
  },
  {
    to: '/programs/welfare',
    label: 'Welfare Cases',
    icon: <HandHeart size={16} />,
    description: 'Financial, ration, orphan and emergency support',
  },
  {
    to: '/programs/employment',
    label: 'Employment Program',
    icon: <BriefcaseBusiness size={16} />,
    description: 'CV database, skills and placement support',
  },
]

export const publicPageTranslationKeys: Record<string, string> = {
  '/about': 'about',
  '/vision-mission': 'visionMission',
  '/manifesto': 'manifesto',
  '/constitution': 'constitution',
  '/cwc': 'cwc',
  '/committees': 'committees',
  '/gallery': 'gallery',
  '/events': 'events',
  '/contact': 'contact',
}

export const programTranslationKeys: Record<string, string> = {
  '/programs/education': 'education',
  '/programs/health': 'health',
  '/programs/welfare': 'welfare',
  '/programs/employment': 'employment',
}

export function getLoggedOutAccountItems(labels: { login: string; joinNow: string; register: string }) {
  return [
    { to: '/login', label: labels.login, icon: <UserPlus size={16} /> },
    { to: '/signup', label: labels.joinNow, icon: <IdCard size={16} /> },
    { to: '/register', label: labels.register, icon: <UserPlus size={16} /> },
  ] satisfies NavItem[]
}

export function getMemberAccountItems(
  labels: {
    dashboard: string
    digitalCard: string
    updates: string
    donors: string
    register: string
  },
  unreadNotificationCount = 0,
) {
  return [
    { to: '/dashboard', label: labels.dashboard, icon: <ShieldCheck size={16} /> },
    { to: '/card', label: labels.digitalCard, icon: <IdCard size={16} /> },
    {
      to: '/notifications',
      label: labels.updates,
      icon: <Bell size={16} />,
      badgeCount: unreadNotificationCount,
    },
    { to: '/donors', label: labels.donors, icon: <Trophy size={16} /> },
    { to: '/register', label: labels.register, icon: <UserPlus size={16} /> },
  ] satisfies NavItem[]
}

export function getAdminAccountItems(labels: {
  adminPanel: string
  members: string
  programs: string
  donations: string
  reports: string
}) {
  return [
    { to: '/admin', label: labels.adminPanel, icon: <ShieldCheck size={16} /> },
    { to: '/admin', label: labels.members, icon: <IdCard size={16} /> },
    { to: '/admin/programs/education', label: labels.programs, icon: <GraduationCap size={16} /> },
    { to: '/admin/finance', label: labels.donations, icon: <HandHeart size={16} /> },
    { to: '/admin/reports', label: labels.reports, icon: <FileText size={16} /> },
  ] satisfies NavItem[]
}
