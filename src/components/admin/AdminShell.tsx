import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'
import { useI18n } from '../../lib/i18n'
import '../../styles/admin-accessibility.css'
import '../../styles/admin-sidebar-accordion.css'

// Preference affects layout only, never authorization. Restore after SSR hydration.
const SIDEBAR_PREFERENCE_KEY = 'jas_admin_sidebar_collapsed_v1'

const labels = {
  en: { admin: 'Admin Panel', subtitle: 'Manage membership, programs and organization records.', nav: 'Navigation', open: 'Open admin menu', close: 'Close admin menu' },
  ur: { admin: 'ایڈمن پینل', subtitle: 'رکنیت، پروگراموں اور تنظیمی ریکارڈ کا انتظام۔', nav: 'مینو', open: 'ایڈمن مینو کھولیں', close: 'ایڈمن مینو بند کریں' },
  sd: { admin: 'ايڊمن پينل', subtitle: 'ميمبرشپ، پروگرامن ۽ تنظيمي رڪارڊ جو انتظام۔', nav: 'مينيو', open: 'ايڊمن مينيو کوليو', close: 'ايڊمن مينيو بند ڪريو' },
}

export function AdminShell({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(true)
  const { language, direction } = useI18n()
  const copy = labels[language]

  useEffect(() => {
    try {
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === '1')
    } catch {
      // Private browsing/disabled storage: the toggle still works in memory.
    }
  }, [])

  function toggleSidebarCollapsed() {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { window.localStorage.setItem(SIDEBAR_PREFERENCE_KEY, next ? '1' : '0') } catch { /* optional preference */ }
  }

  function closeMenu(options?: { navigating?: boolean }) {
    restoreFocus.current = !options?.navigating
    setMobileOpen(false)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !mobileOpen) return
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const media = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (media.matches) closeMenu({ navigating: true }) }
    media.addEventListener('change', closeOnDesktop)
    return () => {
      media.removeEventListener('change', closeOnDesktop)
      dialog.close()
      document.body.style.overflow = overflow
      if (restoreFocus.current && menuButtonRef.current?.isConnected) {
        menuButtonRef.current.focus()
      }
    }
  }, [mobileOpen])

  return (
    <main className="admin-shell px-3 py-6 sm:px-4 sm:py-8" dir={direction}>
      <div className={`admin-shell-wrap${sidebarCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
        <section className="admin-shell-content">
          <div className="admin-mobile-bar">
            <div><p className="admin-mobile-eyebrow">JAS</p><h1>{title ?? copy.admin}</h1><p>{subtitle ?? copy.subtitle}</p></div>
            <button ref={menuButtonRef} type="button" onClick={() => { restoreFocus.current = true; setMobileOpen(true) }} className="admin-mobile-menu-btn" aria-label={copy.open} aria-expanded={mobileOpen} aria-haspopup="dialog" aria-controls={mobileOpen ? 'jas-admin-navigation-dialog' : undefined}>
              <Menu size={20} />
            </button>
          </div>
          {children}
        </section>
      </div>
      {mobileOpen ? (
        <dialog id="jas-admin-navigation-dialog" ref={dialogRef} className="admin-dialog" aria-labelledby="admin-navigation-title" onCancel={() => closeMenu()}>
          <div className="admin-mobile-drawer-backdrop" aria-hidden="true" onClick={() => closeMenu()} />
          <div className="admin-mobile-drawer-panel">
            <div className="admin-mobile-drawer-header">
              <div><p>{copy.admin}</p><h2 id="admin-navigation-title">{copy.nav}</h2></div>
              <button type="button" onClick={() => closeMenu()} className="admin-mobile-drawer-close" aria-label={copy.close} autoFocus><X size={20} /></button>
            </div>
            <div className="admin-mobile-drawer-scroll"><AdminSidebar mobile onNavigate={() => closeMenu({ navigating: true })} /></div>
          </div>
        </dialog>
      ) : null}
    </main>
  )
}
