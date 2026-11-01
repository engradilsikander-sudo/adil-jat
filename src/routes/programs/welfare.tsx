// src/routes/programs/welfare.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  FileCheck2,
  HandHeart,
  Home,
  PackageCheck,
  Scale,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useLocalizedProgramCopy } from '../../lib/program-page-i18n'

export const Route = createFileRoute('/programs/welfare')({
  component: WelfareProgramPage,
})

const copy = {
  en: {
    badge: 'Welfare Case Management',
    title: 'JAS Welfare Support Cases',
    description:
      'A transparent case workflow for financial help, ration support, widow/orphan support, emergency help, marriage support, disaster relief, legal help and family support.',
    applyCta: 'Apply Now',
    myApplicationsCta: 'My Welfare Cases',
    workflowTitle: 'Professional Workflow',
    workflowSteps: [
      'Case submitted',
      'District/Taluka verification',
      'Documents checked',
      'Assigned to welfare committee',
      'Approval decision',
      'Fund/payment issued',
      'Case closed with report',
    ],
    features: [
      {
        title: 'Financial Help',
        text: 'Income crisis, urgent needs, family hardship and approved support amount tracking.',
        icon: BadgeIndianRupee,
      },
      {
        title: 'Ration & Emergency',
        text: 'Ration support, emergency relief and disaster response cases with priority queue.',
        icon: PackageCheck,
      },
      {
        title: 'Family Support',
        text: 'Widow, orphan, marriage, legal and family support cases with committee review.',
        icon: Users,
      },
    ],
    steps: [
      { label: 'Applicant details', icon: Home },
      { label: 'Documents upload', icon: FileCheck2 },
      { label: 'Verification', icon: ShieldCheck },
      { label: 'Committee decision', icon: Scale },
    ],
  },
  ur: {
    badge: 'ویلفیئر کیس مینجمنٹ',
    title: 'جے اے ایس ویلفیئر سپورٹ کیسز',
    description:
      'مالی مدد، راشن سپورٹ، بیوہ/یتیم سپورٹ، ایمرجنسی مدد، شادی سپورٹ، آفت ریلیف، قانونی مدد اور خاندانی سپورٹ کے لیے شفاف کیس ورک فلو۔',
    applyCta: 'ابھی درخواست دیں',
    myApplicationsCta: 'میرے ویلفیئر کیسز',
    workflowTitle: 'پروفیشنل ورک فلو',
    workflowSteps: [
      'کیس جمع ہوا',
      'ضلع/تعلقہ تصدیق',
      'دستاویزات چیک',
      'ویلفیئر کمیٹی کو اسائن',
      'منظوری کا فیصلہ',
      'فنڈ/ادائیگی جاری',
      'رپورٹ کے ساتھ کیس بند',
    ],
    features: [
      {
        title: 'مالی مدد',
        text: 'آمدنی کے بحران، فوری ضرورت، خاندانی مشکل اور منظور شدہ سپورٹ رقم کی ٹریکنگ۔',
        icon: BadgeIndianRupee,
      },
      {
        title: 'راشن اور ایمرجنسی',
        text: 'راشن سپورٹ، ایمرجنسی ریلیف اور آفت رسپانس کیسز ترجیحی قطار کے ساتھ۔',
        icon: PackageCheck,
      },
      {
        title: 'خاندانی سپورٹ',
        text: 'بیوہ، یتیم، شادی، قانونی اور خاندانی سپورٹ کیسز کمیٹی جائزے کے ساتھ۔',
        icon: Users,
      },
    ],
    steps: [
      { label: 'درخواست گزار کی تفصیل', icon: Home },
      { label: 'دستاویزات اپلوڈ', icon: FileCheck2 },
      { label: 'تصدیق', icon: ShieldCheck },
      { label: 'کمیٹی فیصلہ', icon: Scale },
    ],
  },
  sd: {
    badge: 'ويلفيئر ڪيس مينيجمينٽ',
    title: 'JAS ويلفيئر سپورٽ ڪيسز',
    description:
      'مالي مدد، راشن سپورٽ، بيواهه/يتيم سپورٽ، ايمرجنسي مدد، شادي سپورٽ، آفت رليف، قانوني مدد ۽ خانداني سپورٽ لاءِ شفاف ڪيس ورڪ فلو.',
    applyCta: 'هاڻي درخواست ڏيو',
    myApplicationsCta: 'منهنجا ويلفيئر ڪيس',
    workflowTitle: 'پروفيشنل ورڪ فلو',
    workflowSteps: [
      'ڪيس جمع ٿيو',
      'ضلع/تعلقي تصديق',
      'دستاويز چيڪ ٿيا',
      'ويلفيئر ڪميٽي کي اسائن',
      'منظوري جو فيصلو',
      'فنڊ/ادائيگي جاري',
      'رپورٽ سان ڪيس بند',
    ],
    features: [
      {
        title: 'مالي مدد',
        text: 'آمدني بحران، تڪڙيون ضرورتون، خانداني مشڪل ۽ منظور ٿيل سپورٽ رقم جي ٽريڪنگ.',
        icon: BadgeIndianRupee,
      },
      {
        title: 'راشن ۽ ايمرجنسي',
        text: 'راشن سپورٽ، ايمرجنسي رليف ۽ آفت رسپانس ڪيس ترجيحي قطار سان.',
        icon: PackageCheck,
      },
      {
        title: 'خانداني سپورٽ',
        text: 'بيواهه، يتيم، شادي، قانوني ۽ خانداني سپورٽ ڪيس ڪميٽي جائزي سان.',
        icon: Users,
      },
    ],
    steps: [
      { label: 'درخواست ڏيندڙ جا تفصيل', icon: Home },
      { label: 'دستاويز اپلوڊ', icon: FileCheck2 },
      { label: 'تصديق', icon: ShieldCheck },
      { label: 'ڪميٽي فيصلو', icon: Scale },
    ],
  },
} as const

function WelfareProgramPage() {
  const { copy: t, textDir, textAlignClass, arrowClass } =
    useLocalizedProgramCopy(copy)

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-16 text-white md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className={textAlignClass} dir={textDir}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
              <HandHeart className="h-4 w-4 text-amber-300" />
              {t.badge}
            </div>
            <h1 className="mt-5 text-4xl font-black md:text-6xl">
              {t.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              {t.description}
            </p>
            <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${textDir === 'rtl' ? 'sm:justify-end' : ''}`}>
              <Link to="/programs/welfare/apply" className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 no-underline transition hover:bg-amber-300">
                {t.applyCta}
                <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
              </Link>
              <Link to="/programs/welfare/my-applications" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-6 py-3 font-black text-white no-underline transition hover:bg-white/20">
                {t.myApplicationsCta}
              </Link>
            </div>
          </div>

          <div className={`rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur ${textAlignClass}`} dir={textDir}>
            <h2 className="text-2xl font-black">{t.workflowTitle}</h2>
            <div className="mt-5 grid gap-3 text-sm font-semibold text-white/80">
              {t.workflowSteps.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid gap-4 md:grid-cols-3">
            {t.features.map((feature) => {
              const Icon = feature.icon
              return (
                <FeatureCard
                  key={feature.title}
                  icon={<Icon />}
                  title={feature.title}
                  text={feature.text}
                  textDir={textDir}
                  textAlignClass={textAlignClass}
                />
              )
            })}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {t.steps.map((step) => {
                const Icon = step.icon
                return (
                  <MiniStep
                    key={step.label}
                    icon={<Icon />}
                    label={step.label}
                    textDir={textDir}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  text,
  textDir,
  textAlignClass,
}: {
  icon: ReactNode
  title: string
  text: string
  textDir: 'ltr' | 'rtl'
  textAlignClass: string
}) {
  return (
    <article
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${textAlignClass}`}
      dir={textDir}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ${textDir === 'rtl' ? 'mr-auto' : ''}`}>
        {icon}
      </div>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  )
}

function MiniStep({
  icon,
  label,
  textDir,
}: {
  icon: ReactNode
  label: string
  textDir: 'ltr' | 'rtl'
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700"
      dir={textDir}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">{icon}</span>
      {label}
    </div>
  )
}
