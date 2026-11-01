import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, GraduationCap, HeartPulse, HandHeart, BriefcaseBusiness, ShieldCheck } from 'lucide-react'
import { LanguageSwitcher, useI18n } from '../lib/i18n'
import { useHomeCopy } from '../lib/home-i18n'

export const Route = createFileRoute('/')({ component: HomePage })

const welcome = {
  en: {
    title: 'One community.', accent: 'A stronger tomorrow.',
    description: 'Your JAS membership, digital card and community support—all in one place.',
    login: 'Login', signup: 'Create account', welcome: 'Welcome to JAS',
    account: 'Your membership starts here',
    help: 'Already a member? Login to manage your membership. New here? Create an account to get started.',
    note: 'Membership is free. No payment or receipt is required. Applications are reviewed by JAS.',
    programs: 'Supporting our community', about: 'About JAS', contact: 'Contact',
    footer: 'Jatt Alliance Sindh · Membership & community support',
  },
  ur: {
    title: 'ایک برادری۔', accent: 'ایک بہتر کل۔',
    description: 'آپ کی جٹ الائنس سندھ کی رکنیت، ڈیجیٹل کارڈ اور فلاحی سہولیات — ایک ہی جگہ۔',
    login: 'لاگ اِن', signup: 'اکاؤنٹ بنائیں', welcome: 'جٹ الائنس سندھ میں خوش آمدید',
    account: 'آپ کی رکنیت کا سفر یہاں سے شروع ہوتا ہے',
    help: 'پہلے سے اکاؤنٹ ہے؟ اپنی رکنیت کے لیے لاگ اِن کریں۔ نئے صارف اکاؤنٹ بنا کر آغاز کریں۔',
    note: 'رکنیت مفت ہے۔ ادائیگی یا رسید درکار نہیں۔ درخواست کے جائزے کے بعد رکنیت کی تصدیق ہوگی۔',
    programs: 'اپنی برادری کی خدمت', about: 'ہمارے بارے میں', contact: 'رابطہ',
    footer: 'جٹ الائنس سندھ · رکنیت اور فلاحی سہولیات',
  },
  sd: {
    title: 'هڪ برادري۔', accent: 'هڪ بهتر سڀاڻي۔',
    description: 'توهان جي جٽ الائنس سنڌ جي ميمبرشپ، ڊجيٽل ڪارڊ ۽ فلاحي سهولتون — هڪ ئي هنڌ۔',
    login: 'لاگ اِن', signup: 'اڪائونٽ ٺاهيو', welcome: 'جٽ الائنس سنڌ ۾ ڀليڪار',
    account: 'توهان جي ميمبرشپ جي شروعات هتان ٿئي ٿي',
    help: 'اڳ ۾ اڪائونٽ آهي؟ پنهنجي ميمبرشپ لاءِ لاگ اِن ٿيو. نوان صارف اڪائونٽ ٺاهي شروعات ڪن۔',
    note: 'ميمبرشپ مفت آهي. ادائيگي يا رسيد گهربل ناهي. درخواست جي جائزي کان پوءِ ميمبرشپ جي تصديق ٿيندي۔',
    programs: 'پنهنجي برادري جي خدمت', about: 'اسان بابت', contact: 'رابطو',
    footer: 'جٽ الائنس سنڌ · ميمبرشپ ۽ فلاحي سهولتون',
  },
}

function HomePage() {
  const { language, direction } = useI18n()
  const { copy } = useHomeCopy()
  const text = welcome[language]
  const programs = [
    { to: '/programs/education', icon: GraduationCap, text: copy.programs.education.title },
    { to: '/programs/health', icon: HeartPulse, text: copy.programs.health.title },
    { to: '/programs/welfare', icon: HandHeart, text: copy.programs.welfare.title },
    { to: '/programs/employment', icon: BriefcaseBusiness, text: copy.programs.employment.title },
  ] as const

  return (
    <div className="welcome-page" dir={direction}>
      <header className="welcome-header">
        <Link to="/" className="welcome-brand" aria-label="Jatt Alliance Sindh">
          <img src="/jas/logo.jpeg" width="52" height="52" alt="" />
          <span><strong>Jatt Alliance Sindh</strong></span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="welcome-main">
        <section className="welcome-intro" aria-labelledby="welcome-heading">
          <span className="welcome-eyebrow"><ShieldCheck size={16} aria-hidden="true" />{text.welcome}</span>
          <h1 id="welcome-heading">{text.title}<span>{text.accent}</span></h1>
          <p className="welcome-tagline" lang="en" dir="ltr">Education Health Dignity</p>
          <p>{text.description}</p>
          <div className="welcome-links">
            <Link to="/about">{text.about}<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/contact">{text.contact}</Link>
          </div>
        </section>
        <section className="welcome-account" aria-labelledby="account-heading">
          <span className="welcome-account-label">{copy.portalBadge}</span>
          <h2 id="account-heading">{text.account}</h2>
          <p>{text.help}</p>
          <Link className="primary-btn welcome-action" to="/login">{text.login}<ArrowRight size={19} aria-hidden="true" /></Link>
          <Link className="secondary-btn welcome-action" to="/signup">{text.signup}</Link>
          <div className="welcome-note"><ShieldCheck size={18} aria-hidden="true" /><p>{text.note}</p></div>
        </section>
        <section className="welcome-programs" aria-labelledby="programs-heading">
          <h2 id="programs-heading">{text.programs}</h2>
          <div className="welcome-program-grid">
            {programs.map(({ to, icon: Icon, text: title }) => (
              <Link key={to} to={to}><Icon size={22} aria-hidden="true" /><span>{title}</span><ArrowRight size={16} aria-hidden="true" /></Link>
            ))}
          </div>
        </section>
      </main>
      <footer className="welcome-footer"><span>{text.footer}</span><Link to="/contact">{text.contact}</Link></footer>
    </div>
  )
}
