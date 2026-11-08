import { BRAND } from '../../lib/branding'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useFinanceAccess } from '../../lib/use-finance-access'
import { useI18n, type AppLanguage } from '../../lib/i18n'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  BadgeIndianRupee,
  ChevronDown,
  ChevronRight,
  FileText,
  HandHeart,
  LayoutDashboard,
  LockKeyhole,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from 'lucide-react'
import {
  getVisibleAdminNavigationGroups,
  isActiveAdminNavigationItem,
  type AdminNavigationGroup,
  type AdminNavigationItem,
} from '../../config/admin-navigation'

// The six group icons remain visible in the collapsed desktop rail. They do
// not grant access: every group's children come from the UX.13 role policy.
const groupIcons = {
  Overview: <LayoutDashboard size={19} />,
  Membership: <Users size={19} />,
  Programs: <HandHeart size={19} />,
  Organization: <Network size={19} />,
  'Finance & Reports': <BadgeIndianRupee size={19} />,
  'Public CMS': <FileText size={19} />,
} as const

function activeGroupFor(pathname: string, groups: AdminNavigationGroup[]): string | null {
  return groups.find((group) =>
    group.items.some((item) => isActiveAdminNavigationItem(pathname, item)),
  )?.title ?? null
}

export function AdminSidebar({
  mobile = false,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  mobile?: boolean
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
}) {
  // Reuse the authoritative UX.13 database-backed gate. Do not read roles
  // from JWT metadata or cache authorization in the browser.
  const { allowed: superAdminAllowed } = useFinanceAccess()
  const { language } = useI18n()
  const translate = (value: string) => navLabel(value, language)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const groups = getVisibleAdminNavigationGroups(superAdminAllowed)
  const [openGroup, setOpenGroup] = useState<string | null>(
    () => activeGroupFor(pathname, groups) ?? groups[0]?.title ?? null,
  )
  const iconRail = !mobile && collapsed

  // Open the active group when navigating or the database permission changes.
  // User-triggered collapse of an accordion remains respected on this route.
  useEffect(() => {
    const nextGroups = getVisibleAdminNavigationGroups(superAdminAllowed)
    setOpenGroup(activeGroupFor(pathname, nextGroups) ?? nextGroups[0]?.title ?? null)
  }, [pathname, superAdminAllowed])

  function onGroupClick(title: string) {
    if (iconRail) {
      // Rail icon is a real button: expand the sidebar directly to this group.
      setOpenGroup(title)
      onToggleCollapsed?.()
      return
    }
    setOpenGroup((previous) => previous === title ? null : title)
  }

  return (
    <aside
      className={[
        'admin-sidebar',
        mobile && 'admin-sidebar-mobile',
        iconRail && 'is-collapsed',
      ].filter(Boolean).join(' ')}
      aria-label={translate('Navigation')}
    >
      {!mobile ? (
        <div className="admin-sidebar-brand">
          <span className="admin-sidebar-brand-icon">{BRAND.shortName}</span>
          {!iconRail ? (
            <span className="admin-sidebar-brand-copy">
              <strong>{BRAND.shortName} {translate('Admin Panel')}</strong>
              <small>{BRAND.shortName} {translate('Management Console')}</small>
            </span>
          ) : null}
          <button
            type="button"
            className="admin-sidebar-collapse-toggle"
            aria-label={translate(iconRail ? 'Expand sidebar' : 'Collapse sidebar')}
            title={translate(iconRail ? 'Expand sidebar' : 'Collapse sidebar')}
            onClick={onToggleCollapsed}
          >
            {iconRail ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        </div>
      ) : null}

      <nav className="admin-sidebar-nav" aria-label={translate('Navigation')}>
        {groups.map((group) => (
          <AdminSidebarGroup
            key={group.title}
            group={group}
            icon={groupIcons[group.title as keyof typeof groupIcons]}
            expanded={!iconRail && openGroup === group.title}
            active={group.items.some((item) => isActiveAdminNavigationItem(pathname, item))}
            iconRail={iconRail}
            pathname={pathname}
            onClick={() => onGroupClick(group.title)}
            onNavigate={onNavigate}
            translate={translate}
          />
        ))}
      </nav>
    </aside>
  )
}

function AdminSidebarGroup({
  group, icon, expanded, active, iconRail, pathname, onClick, onNavigate, translate,
}: {
  group: AdminNavigationGroup
  icon: ReactNode
  expanded: boolean
  active: boolean
  iconRail: boolean
  pathname: string
  onClick: () => void
  onNavigate?: () => void
  translate: (value: string) => string
}) {
  const groupId = useId()
  return (
    <section className={`admin-sidebar-group${active ? ' has-active-route' : ''}`}>
      <button
        type="button"
        className="admin-sidebar-group-trigger"
        aria-label={translate(group.title)}
        aria-expanded={expanded}
        aria-controls={groupId}
        title={iconRail ? translate(group.title) : undefined}
        onClick={onClick}
      >
        <span className="admin-sidebar-group-icon" aria-hidden="true">{icon}</span>
        {!iconRail ? <span className="admin-sidebar-group-heading">{translate(group.title)}</span> : null}
        {!iconRail ? (
          <ChevronDown size={16} className={`admin-sidebar-group-chevron${expanded ? ' is-open' : ''}`} aria-hidden="true" />
        ) : null}
      </button>
      <div id={groupId} className="admin-sidebar-group-items" hidden={!expanded}>
        {group.items.map((item) => (
          <AdminSidebarItem
            key={`${group.title}-${item.label}`}
            item={item}
            active={isActiveAdminNavigationItem(pathname, item)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  )
}

function AdminSidebarItem({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavigationItem
  active: boolean
  onNavigate?: () => void
}) {
  const { language } = useI18n()
  const translate = (value: string) => navLabel(value, language)
  const content = (
    <>
      <span className="admin-sidebar-item-icon">{item.icon}</span>
      <span className="admin-sidebar-item-label">{translate(item.label)}</span>
      {item.badge ? (
        <span className="admin-sidebar-item-badge">{translate(item.badge)}</span>
      ) : null}
      {item.disabled ? (
        <LockKeyhole className="admin-sidebar-item-lock" size={14} />
      ) : (
        <ChevronRight className="admin-sidebar-item-arrow" size={15} />
      )}
    </>
  )

  if (!item.to || item.disabled) {
    return (
      <button
        type="button"
        className="admin-sidebar-item is-disabled"
        title={`${translate(item.label)} · ${translate('Later')}`}
        disabled
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`admin-sidebar-item ${active ? 'is-active' : ''}`}
    >
      {content}
    </Link>
  )
}

const navTranslations: Record<string, readonly [string, string]> = {
  'Navigation': ['مینو', 'مينيو'],
  'Admin Panel': ['ایڈمن پینل', 'ايڊمن پينل'],
  'Management Console': ['انتظامی مرکز', 'انتظامي مرڪز'],
  'Collapse sidebar': ['سائیڈ بار سمیٹیں', 'سائڊ بار بند ڪريو'],
  'Expand sidebar': ['سائیڈ بار کھولیں', 'سائڊ بار کوليو'],
  'Overview': ['جائزہ', 'جائزو'],
  'Dashboard': ['ڈیش بورڈ', 'ڊيش بورڊ'],
  'Notification Center': ['اطلاعات کا مرکز', 'اطلاعن جو مرڪز'],
  'Membership': ['رکنیت', 'ميمبرشپ'],
  'Members': ['اراکین', 'ميمبر'],
  'Pending Applications': ['زیرِ جائزہ درخواستیں', 'زير جائزو درخواستون'],
  'Digital Cards': ['ڈیجیٹل کارڈز', 'ڊيجيٽل ڪارڊ'],
  'Profile Update Requests': ['پروفائل تبدیلی کی درخواستیں', 'پروفائل تبديلي جون درخواستون'],
  'Programs': ['پروگرام', 'پروگرام'],
  'Education': ['تعلیم', 'تعليم'],
  'Health': ['صحت', 'صحت'],
  'Welfare': ['فلاح و بہبود', 'ڀلائي'],
  'Employment': ['روزگار', 'روزگار'],
  'Program Appointments': ['پروگرام تقرریاں', 'پروگرام مقرريون'],
  'Organization': ['تنظیم', 'تنظيم'],
  'Organization Levels': ['تنظیمی سطحیں', 'تنظيمي سطحون'],
  'Designations': ['عہدے', 'عهدا'],
  'Roles': ['کردار', 'ڪردار'],
  'Area Permissions': ['علاقائی اختیارات', 'علائقائي اختيار'],
  'Elections': ['انتخابات', 'چونڊون'],
  'Finance & Reports': ['مالیات اور رپورٹس', 'ماليات ۽ رپورٽون'],
  'Finance': ['مالیات', 'ماليات'],
  'Reports': ['رپورٹس', 'رپورٽون'],
  'Audit Logs': ['آڈٹ ریکارڈ', 'آڊٽ رڪارڊ'],
  'Donations': ['عطیات', 'عطيا'],
  'Public CMS': ['عوامی مواد', 'عوامي مواد'],
  'CMS': ['مواد کا انتظام', 'مواد جو انتظام'],
  'News': ['خبریں', 'خبرون'],
  'Gallery': ['تصاویر', 'تصويرون'],
  'Events': ['تقریبات', 'تقريبون'],
  'Later': ['بعد میں', 'بعد ۾'],
  'Future': ['مستقبل میں', 'مستقبل ۾'],
  'Manual': ['دستی', 'دستي'],
}

function navLabel(value: string, language: AppLanguage) {
  if (language === 'en') return value
  return navTranslations[value]?.[language === 'ur' ? 0 : 1] ?? value
}
