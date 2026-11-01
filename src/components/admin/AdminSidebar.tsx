import { useI18n, type AppLanguage } from '../../lib/i18n'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LockKeyhole } from 'lucide-react'
import { adminNavigationGroups, type AdminNavigationItem } from '../../config/admin-navigation'

function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

function isActivePath(currentPath: string, itemTo?: string) {
  if (!itemTo) return false

  const current = normalizePath(currentPath)
  const target = normalizePath(itemTo)

  if (target === '/admin') return current === '/admin'

  return current === target || current.startsWith(`${target}/`)
}

export function AdminSidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const { language } = useI18n()
  const translate = (value: string) => navLabel(value, language)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <aside
      className={mobile ? 'admin-sidebar admin-sidebar-mobile' : 'admin-sidebar'}
      aria-label={translate('Navigation')}
    >
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-brand-icon">JAS</span>
        <span>
          <strong>{translate('Admin Panel')}</strong>
          <small>{translate('Management Console')}</small>
        </span>
      </div>

      <nav className="admin-sidebar-nav">
        {adminNavigationGroups.map((group) => (
          <section key={group.title} className="admin-sidebar-group">
            <p className="admin-sidebar-group-title">{translate(group.title)}</p>

            <div className="admin-sidebar-group-items">
              {group.items.map((item) => (
                <AdminSidebarItem
                  key={`${group.title}-${item.label}`}
                  item={item}
                  active={isActivePath(pathname, item.to)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
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
  'Overview': ['جائزہ', 'جائزو'],
  'Dashboard': ['ڈیش بورڈ', 'ڊيش بورڊ'],
  'Notification Center': ['اطلاعات کا مرکز', 'اطلاعن جو مرڪز'],
  'Membership': ['رکنیت', 'ميمبرشپ'],
  'Members': ['اراکین', 'ميمبر'],
  'Pending Applications': ['زیرِ جائزہ درخواستیں', 'زير جائزو درخواستون'],
  'Digital Cards': ['ڈیجیٹل کارڈز', 'ڊجيٽل ڪارڊ'],
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
