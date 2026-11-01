import { Link } from '@tanstack/react-router'
import { LayoutDashboard, IdCard, Bell, UserRoundPen } from 'lucide-react'
import { useI18n } from '../../lib/i18n'

export function MemberNavigation() {
  const { t, language } = useI18n()
  const profileLabel = { en: 'Update profile', ur: 'پروفائل کی تبدیلی', sd: 'پروفائل جي تبديلي' }[language]
  const items = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/card', label: t('nav.digitalCard'), icon: IdCard },
    { to: '/notifications', label: t('nav.updates'), icon: Bell },
    { to: '/profile-update', label: profileLabel, icon: UserRoundPen },
  ] as const
  return (
    <nav className="member-navigation" aria-label={t('nav.dashboard')}>
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} activeOptions={{ exact: true }} activeProps={{ className: 'is-active', 'aria-current': 'page' }}>
          <Icon size={18} aria-hidden="true" /><span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
