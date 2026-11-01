import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Globe2, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react'
import { getMemberAccountItems, programItems, programTranslationKeys, publicPageItems, publicPageTranslationKeys, type NavItem } from '../../config/navigation'
import { useAuthRole } from '../../hooks/useAuthRole'
import { APP_LANGUAGES, useI18n, type TranslationKey } from '../../lib/i18n'
import { journeyCopy } from '../../lib/member-journey'
import { useHeaderData } from '../../hooks/useHeaderData'
import { headerDataCopy } from '../../lib/header-data-copy'

type OpenMenu = 'programs' | 'organization' | 'language' | 'account' | null
const copy = {
  en: { governance: 'Governance', community: 'Community', navigation: 'Main navigation', open: 'Open navigation', close: 'Close navigation', account: 'Member account', member: 'Member', memberNo: 'Membership number', holders: 'Office bearers across organization levels', join: 'Join JAS' },
  ur: { governance: 'نظم و نسق', community: 'برادری', navigation: 'مرکزی مینو', open: 'مینو کھولیں', close: 'مینو بند کریں', account: 'رکن کا اکاؤنٹ', member: 'رکن', memberNo: 'رکنیت نمبر', holders: 'تنظیمی سطحوں کے عہدیداران', join: 'رکن بنیں' },
  sd: { governance: 'انتظام', community: 'برادري', navigation: 'مکيه مينيو', open: 'مينيو کوليو', close: 'مينيو بند ڪريو', account: 'ميمبر جو اڪائونٽ', member: 'ميمبر', memberNo: 'ميمبرشپ نمبر', holders: 'تنظيمي سطحن جا عهديدار', join: 'ميمبر ٿيو' },
}

export function Header({ compact: _compact }: { compact: boolean }) {
  const { language, direction, setLanguage, t } = useI18n()
  const text = copy[language]
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { authLoading, logoutLoading, isLoggedIn, isAdmin, accountInitial, accountEmail, accountUserId, logout } = useAuthRole()
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerData = useHeaderData(isLoggedIn ? accountUserId : '')
  const dataText = headerDataCopy[language]
  const headerRef = useRef<HTMLElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const unreadCount = headerData.count
  const currentProfile = headerData.profile
  const dashboardPath = isAdmin ? '/admin' : '/dashboard'
  const dashboardLabel = isAdmin ? t('nav.adminPanel') : t('nav.dashboard')
  const active = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`)
  const close = () => { setOpenMenu(null); setDrawerOpen(false) }
  const toggle = (menu: Exclude<OpenMenu, null>, button: HTMLButtonElement) => {
    triggerRef.current = button
    setOpenMenu((value) => value === menu ? null : menu)
  }

  useEffect(() => { setOpenMenu(null); setDrawerOpen(false) }, [pathname])
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    if (!openMenu) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) setOpenMenu(null)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpenMenu(null); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [openMenu])
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)')
    const resize = () => { setOpenMenu(null); setDrawerOpen(false) }
    media.addEventListener('change', resize)
    return () => media.removeEventListener('change', resize)
  }, [])
  useEffect(() => {
    const dialog = dialogRef.current
    if (!drawerOpen || !dialog) return
    setOpenMenu(null)
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previous }
  }, [drawerOpen])

  const programs = useMemo(() => programItems.map((item) => ({ ...item, label: t(`program.${programTranslationKeys[item.to]}.label` as TranslationKey), description: t(`program.${programTranslationKeys[item.to]}.description` as TranslationKey) })), [t])
  const pages = useMemo(() => publicPageItems.map((item) => ({ ...item, label: t(`public.${publicPageTranslationKeys[item.to]}.label` as TranslationKey), description: t(`public.${publicPageTranslationKeys[item.to]}.description` as TranslationKey) })), [t])
  const groups = [
    { title: t('nav.organization'), items: pages.filter((item) => ['/about', '/vision-mission', '/manifesto', '/constitution'].includes(item.to)) },
    { title: text.governance, items: [...pages.filter((item) => ['/cwc', '/committees'].includes(item.to)), { to: '/designation-holders', label: t('nav.designationHolders'), description: text.holders, icon: <Users size={17} /> }] },
    { title: text.community, items: pages.filter((item) => ['/gallery', '/events', '/contact'].includes(item.to)) },
  ]
  const memberItems = getMemberAccountItems({ dashboard: t('nav.dashboard'), digitalCard: t('nav.digitalCard'), updates: t('nav.updates'), donors: t('nav.donors'), register: t('nav.register') }, unreadCount)
  const journeyItems = memberItems.filter((item) => !['/register', '/card'].includes(item.to) || (headerData.profileReady && !headerData.profileError)).filter((item) => item.to !== '/card' || currentProfile?.status === 'approved').filter((item) => item.to !== '/register' || currentProfile?.status !== 'approved').map((item) => item.to === '/register' ? { ...item, label: currentProfile?.status === 'pending' ? journeyCopy[language].view : currentProfile?.status === 'rejected' ? journeyCopy[language].revise : currentProfile ? item.label : journeyCopy[language].apply } : item)
  const accountItems: NavItem[] = isAdmin ? [{ to: '/admin', label: t('nav.adminPanel'), icon: <ShieldCheck size={17} /> }, ...journeyItems.filter((item) => item.to !== '/dashboard')] : journeyItems
  const chooseLanguage = (next: typeof language) => { setLanguage(next); setOpenMenu(null); if (!drawerOpen) triggerRef.current?.focus() }
  async function handleLogout() { if (await logout()) { close(); await navigate({ to: '/login', replace: true }) } }

  function brand() {
    return <Link to="/" className="jas-nav-brand" onClick={close}><img src="/jas/logo.jpeg" alt="" width={46} height={46} /><span><strong>{t('brand.name')}</strong><small lang="en" dir="ltr">Education · Health · Dignity</small></span></Link>
  }
  function routeLink(to: string, label: string, className = 'jas-nav-link') {
    return <Link to={to} onClick={close} className={`${className}${active(to) ? ' is-active' : ''}`} aria-current={active(to) ? 'page' : undefined}>{label}</Link>
  }
  function disclosure(menu: 'programs' | 'organization', label: string, isActive: boolean) {
    return <button type="button" className={`jas-nav-link${isActive ? ' is-active' : ''}`} aria-expanded={openMenu === menu} aria-controls={`jas-nav-${menu}`} onClick={(event) => toggle(menu, event.currentTarget)}>{label}<ChevronDown size={14} aria-hidden="true" /></button>
  }
  function itemLink(item: NavItem & { description?: string }) {
    return <Link key={item.to} to={item.to} onClick={close} className={`jas-menu-link${active(item.to) ? ' is-active' : ''}`} aria-current={active(item.to) ? 'page' : undefined}><span className="jas-menu-icon" aria-hidden="true">{item.icon}</span><span className="jas-menu-copy"><strong>{item.label}</strong>{item.description ? <small title={item.description}>{item.description}</small> : null}</span>{Boolean(item.badgeCount) && <span className="jas-count">{item.badgeCount! > 99 ? '99+' : item.badgeCount}</span>}</Link>
  }
  function identity() {
    return <div className="jas-profile-summary">{!headerData.profileReady && !headerData.profileError ? <small role="status">{dataText.loading}</small> : null}{headerData.profileError || headerData.countError ? <div role="status"><small>{headerData.profileError ? dataText.profileError : dataText.countError}</small><button type="button" className="jas-language-option" onClick={headerData.retry}>{dataText.retry}</button></div> : null}<strong dir="auto">{currentProfile?.name || accountEmail || text.account}</strong>{currentProfile?.memberNo ? <span dir="ltr" aria-label={text.memberNo}>{currentProfile.memberNo}</span> : null}<small>{isAdmin ? t('nav.adminPanel') : text.member}</small></div>
  }
  function languageOptions() {
    return APP_LANGUAGES.map((option) => <button key={option.code} type="button" className="jas-language-option" lang={option.code} onClick={() => chooseLanguage(option.code)} aria-pressed={language === option.code}><span>{option.nativeLabel}</span>{language === option.code ? <Check size={16} aria-hidden="true" /> : null}</button>)
  }

  return (
    <header ref={headerRef} className={`jas-header${scrolled ? ' has-shadow' : ''}`} dir={direction} onBlur={(event) => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null) }}>
      <div className="jas-header-inner">
        {brand()}
        <nav className="jas-desktop-nav" aria-label={text.navigation}>
          {routeLink('/', t('nav.home'))}
          {disclosure('programs', t('nav.programs'), active('/programs'))}
          {disclosure('organization', t('nav.organization'), groups.some((group) => group.items.some((item) => active(item.to))))}
          {routeLink('/news', t('nav.news'))}
          {routeLink('/donate', t('nav.donate'))}
        </nav>
        <div className="jas-header-actions">
          <div className="jas-desktop-control jas-language">
            <button type="button" className="jas-language-trigger" aria-label={t('language.switchTo')} aria-expanded={openMenu === 'language'} aria-controls="jas-nav-languages" onClick={(event) => toggle('language', event.currentTarget)}><Globe2 size={17} aria-hidden="true" /><span>{language.toUpperCase()}</span><ChevronDown size={13} aria-hidden="true" /></button>
            {openMenu === 'language' ? <div id="jas-nav-languages" className="jas-popover jas-language-options">{languageOptions()}</div> : null}
          </div>
          {authLoading ? <span className="jas-auth-loading" aria-label={t('authPage.common.checkingSession')} /> : isLoggedIn ? <>
            {routeLink(dashboardPath, dashboardLabel, 'jas-nav-cta jas-desktop-control')}
            <div className="jas-account">
              <button type="button" className="jas-avatar" aria-label={t('account.open')} aria-expanded={openMenu === 'account'} aria-controls="jas-nav-account" onClick={(event) => toggle('account', event.currentTarget)}>{(currentProfile?.name.trim().charAt(0) || accountInitial).toUpperCase()}{unreadCount > 0 ? <span className="jas-avatar-count">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}</button>
              {openMenu === 'account' ? <div id="jas-nav-account" className="jas-popover jas-account-panel">{identity()}{accountItems.map(itemLink)}<button type="button" className="jas-nav-logout" disabled={logoutLoading} onClick={() => void handleLogout()}><LogOut size={17} />{logoutLoading ? t('auth.loggingOut') : t('auth.logout')}</button></div> : null}
            </div>
          </> : <div className="jas-auth-links jas-desktop-control">{routeLink('/login', t('auth.login'))}{routeLink('/signup', text.join, 'jas-nav-cta')}</div>}
          <button type="button" className="jas-mobile-toggle" aria-label={text.open} aria-expanded={drawerOpen} aria-controls="jas-nav-drawer" onClick={() => setDrawerOpen(true)}><Menu size={23} /></button>
        </div>
        {openMenu === 'programs' ? <div id="jas-nav-programs" className="jas-popover jas-mega-menu jas-program-menu">{programs.map(itemLink)}</div> : null}
        {openMenu === 'organization' ? <div id="jas-nav-organization" className="jas-popover jas-mega-menu">{groups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map(itemLink)}</section>)}</div> : null}
      </div>
      {drawerOpen ? <dialog ref={dialogRef} id="jas-nav-drawer" className="jas-nav-dialog" aria-label={text.navigation} onCancel={() => setDrawerOpen(false)}>
        <button type="button" className="jas-drawer-backdrop" tabIndex={-1} aria-label={text.close} onClick={() => setDrawerOpen(false)} />
        <div className="jas-drawer-panel">
          <div className="jas-drawer-heading">{brand()}<button type="button" className="jas-close" autoFocus aria-label={text.close} onClick={() => setDrawerOpen(false)}><X size={23} /></button></div>
          <nav className="jas-drawer-links" aria-label={text.navigation}>
            {routeLink('/', t('nav.home'))}
            <details><summary>{t('nav.programs')}<ChevronDown size={16} /></summary><div>{programs.map(itemLink)}</div></details>
            <details><summary>{t('nav.organization')}<ChevronDown size={16} /></summary><div>{groups.map((group) => <section key={group.title}><h2>{group.title}</h2>{group.items.map(itemLink)}</section>)}</div></details>
            {routeLink('/news', t('nav.news'))}{routeLink('/donate', t('nav.donate'))}
          </nav>
          <section className="jas-drawer-languages" aria-label={t('language.label')}><h2>{t('language.label')}</h2>{languageOptions()}</section>
          {isLoggedIn ? <section className="jas-drawer-account">{identity()}{accountItems.map(itemLink)}<button type="button" className="jas-nav-logout" disabled={logoutLoading} onClick={() => void handleLogout()}><LogOut size={17} />{logoutLoading ? t('auth.loggingOut') : t('auth.logout')}</button></section> : !authLoading ? <div className="jas-drawer-auth">{routeLink('/login', t('auth.login'))}{routeLink('/signup', text.join, 'jas-nav-cta')}</div> : null}
        </div>
      </dialog> : null}
    </header>
  )
}
