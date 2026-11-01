import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  MapPin,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import { useLocalizedProgramCopy } from '../../lib/program-page-i18n'

export const Route = createFileRoute('/programs/employment')({
  component: EmploymentProgramPage,
})

const copy = {
  en: {
    badge: 'Employment Program',
    title: 'Youth employment, CV database and skills placement support.',
    description:
      'JAS Employment Program helps verified members register as job seekers, upload CVs, list skills, request training and connect with employment committee review.',
    applyCta: 'Register as Job Seeker',
    myApplicationsCta: 'My Employment Profile',
    includesEyebrow: 'Phase 1 Includes',
    includes: [
      { text: 'CV upload and document review', icon: FileText },
      { text: 'Preferred job location and salary', icon: MapPin },
      { text: 'Skills, education and experience data', icon: Upload },
      { text: 'Restricted admin CV database', icon: ShieldCheck },
    ],
    supportEyebrow: 'Employment Support',
    supportTitle: 'How the employment module helps',
    benefits: [
      {
        title: 'Verified Job Seeker Profile',
        text: 'Approved JAS members can submit education, skills, experience and employment preferences.',
        icon: Users,
      },
      {
        title: 'CV Database for Admins',
        text: 'Employment admins can search candidates by skill, education, district, taluka and job status.',
        icon: Search,
      },
      {
        title: 'Skills & Training Interest',
        text: 'Candidates can request skill development support for computer, language, technical and vocational training.',
        icon: GraduationCap,
      },
      {
        title: 'Placement Notes',
        text: 'Admins can shortlist candidates, add interview notes and track placed/unemployed status.',
        icon: BadgeCheck,
      },
    ],
  },
  ur: {
    badge: 'روزگار پروگرام',
    title: 'نوجوانوں کے روزگار، CV ڈیٹابیس اور اسکلز پلیسمنٹ سپورٹ۔',
    description:
      'جے اے ایس ایمپلائمنٹ پروگرام تصدیق شدہ ممبران کو جاب سیکر کے طور پر رجسٹر، CV اپلوڈ، اسکلز درج، ٹریننگ درخواست اور ایمپلائمنٹ کمیٹی جائزے سے منسلک کرتا ہے۔',
    applyCta: 'جاب سیکر کے طور پر رجسٹر کریں',
    myApplicationsCta: 'میرا روزگار پروفائل',
    includesEyebrow: 'فیز 1 میں شامل',
    includes: [
      { text: 'CV اپلوڈ اور دستاویزات جائزہ', icon: FileText },
      { text: 'ترجیحی جاب لوکیشن اور تنخواہ', icon: MapPin },
      { text: 'اسکلز، تعلیم اور تجربہ ڈیٹا', icon: Upload },
      { text: 'محدود ایڈمن CV ڈیٹابیس', icon: ShieldCheck },
    ],
    supportEyebrow: 'روزگار سپورٹ',
    supportTitle: 'ایمپلائمنٹ ماڈیول کیسے مدد کرتا ہے',
    benefits: [
      {
        title: 'تصدیق شدہ جاب سیکر پروفائل',
        text: 'منظور شدہ JAS ممبران اپنی تعلیم، اسکلز، تجربہ اور روزگار ترجیحات جمع کرا سکتے ہیں۔',
        icon: Users,
      },
      {
        title: 'ایڈمنز کے لیے CV ڈیٹابیس',
        text: 'ایمپلائمنٹ ایڈمن امیدواروں کو اسکل، تعلیم، ضلع، تعلقہ اور جاب اسٹیٹس سے سرچ کر سکتے ہیں۔',
        icon: Search,
      },
      {
        title: 'اسکلز اور ٹریننگ دلچسپی',
        text: 'امیدوار کمپیوٹر، زبان، ٹیکنیکل اور ووکیشنل ٹریننگ کے لیے اسکل ڈیولپمنٹ سپورٹ طلب کر سکتے ہیں۔',
        icon: GraduationCap,
      },
      {
        title: 'پلیسمنٹ نوٹس',
        text: 'ایڈمن امیدوار شارٹ لسٹ، انٹرویو نوٹس اور پلیسڈ/ان ایمپلائیڈ اسٹیٹس ٹریک کر سکتے ہیں۔',
        icon: BadgeCheck,
      },
    ],
  },
  sd: {
    badge: 'روزگار پروگرام',
    title: 'نوجوانن جي روزگار، CV ڊيٽابيس ۽ مهارتن جي پليسمينٽ سپورٽ.',
    description:
      'JAS ايمپلائمنٽ پروگرام تصديق ٿيل ميمبرن کي جاب سيڪر طور رجسٽر، CV اپلوڊ، مهارتون درج، ٽريننگ درخواست ۽ ايمپلائمنٽ ڪميٽي جائزي سان ڳنڍي ٿو.',
    applyCta: 'جاب سيڪر طور رجسٽر ٿيو',
    myApplicationsCta: 'منهنجو روزگار پروفائل',
    includesEyebrow: 'فيس 1 ۾ شامل',
    includes: [
      { text: 'CV اپلوڊ ۽ دستاويز جائزو', icon: FileText },
      { text: 'پسنديده جاب جڳهه ۽ پگهار', icon: MapPin },
      { text: 'مهارتن، تعليم ۽ تجربي جو ڊيٽا', icon: Upload },
      { text: 'محدود ايڊمن CV ڊيٽابيس', icon: ShieldCheck },
    ],
    supportEyebrow: 'روزگار سپورٽ',
    supportTitle: 'ايمپلائمنٽ ماڊيول ڪيئن مدد ڪري ٿو',
    benefits: [
      {
        title: 'تصديق ٿيل جاب سيڪر پروفائل',
        text: 'منظور ٿيل JAS ميمبر تعليم، مهارتون، تجربو ۽ روزگار ترجيحات جمع ڪرائي سگهن ٿا.',
        icon: Users,
      },
      {
        title: 'ايڊمنز لاءِ CV ڊيٽابيس',
        text: 'ايمپلائمنٽ ايڊمن اميدوارن کي مهارت، تعليم، ضلع، تعلقي ۽ جاب اسٽيٽس سان سرچ ڪري سگهن ٿا.',
        icon: Search,
      },
      {
        title: 'مهارتن ۽ ٽريننگ دلچسپي',
        text: 'اميدوار ڪمپيوٽر، ٻولي، ٽيڪنيڪل ۽ ووڪيشنل ٽريننگ لاءِ مهارتن جي ترقي سپورٽ طلب ڪري سگهن ٿا.',
        icon: GraduationCap,
      },
      {
        title: 'پليسمينٽ نوٽس',
        text: 'ايڊمن اميدوار شارٽ لسٽ، انٽرويو نوٽس ۽ پليسڊ/بيروزگار اسٽيٽس ٽريڪ ڪري سگهن ٿا.',
        icon: BadgeCheck,
      },
    ],
  },
} as const

function EmploymentProgramPage() {
  const { copy: t, textDir, textAlignClass, arrowClass } =
    useLocalizedProgramCopy(copy)

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="relative overflow-hidden bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_34%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black ${textAlignClass}`} dir={textDir}>
            <BriefcaseBusiness className="h-4 w-4 text-emerald-300" />
            {t.badge}
          </div>

          <div className="mt-7 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-end">
            <div className={textAlignClass} dir={textDir}>
              <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                {t.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
                {t.description}
              </p>

              <div className={`mt-8 flex flex-wrap gap-3 ${textDir === 'rtl' ? 'justify-end' : ''}`}>
                <Link
                  to="/programs/employment/apply"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 font-black text-slate-950 no-underline transition hover:bg-emerald-300"
                >
                  {t.applyCta}
                  <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                </Link>
                <Link
                  to="/programs/employment/my-applications"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-black text-white no-underline transition hover:bg-white/20"
                >
                  {t.myApplicationsCta}
                </Link>
              </div>
            </div>

            <div className={`rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur ${textAlignClass}`} dir={textDir}>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-200">
                {t.includesEyebrow}
              </p>
              <div className="mt-5 space-y-4 text-sm font-semibold text-white/80">
                {t.includes.map((item) => {
                  const Icon = item.icon
                  return (
                    <Info
                      key={item.text}
                      icon={<Icon className="h-4 w-4" />}
                      text={item.text}
                      textDir={textDir}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${textAlignClass}`} dir={textDir}>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
                {t.supportEyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
                {t.supportTitle}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {t.benefits.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.title}
                  className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${textAlignClass}`}
                  dir={textDir}
                >
                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ${textDir === 'rtl' ? 'mr-auto' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.text}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

function Info({
  icon,
  text,
  textDir,
}: {
  icon: ReactNode
  text: string
  textDir: 'ltr' | 'rtl'
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3" dir={textDir}>
      <span className="text-emerald-200">{icon}</span>
      {text}
    </div>
  )
}
