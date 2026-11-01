import {
  Outlet,
  createFileRoute,
  Link,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import { useLocalizedProgramCopy } from '../../lib/program-page-i18n'

export const Route = createFileRoute('/programs/education')({
  component: EducationRoute,
})

const copy = {
  en: {
    badge: 'JAS Education & Skills Development',
    title: 'Education support, scholarships and skills training for JAS members',
    description:
      'Apply for scholarship, fee support, admission guidance, career counselling and skills development programs through a transparent membership-verified system.',
    applyCta: 'Apply for Education Support',
    myApplicationsCta: 'My Applications',
    featuresEyebrow: 'Program Features',
    featuresTitle: 'Built for students, youth and families',
    featuresDescription:
      'Education support is designed to help deserving members continue studies, improve skills and access career guidance through a verified application workflow.',
    features: [
      {
        title: 'Scholarship & Fee Support',
        description:
          'Students can apply for admission fee, monthly fee, exam fee, books, uniform, hostel or full scholarship support.',
        icon: GraduationCap,
      },
      {
        title: 'Skills Development Programs',
        description:
          'Youth can register for computer, freelancing, digital skills, language, technical and career-focused training programs.',
        icon: BriefcaseBusiness,
      },
      {
        title: 'Merit & Need-Based Review',
        description:
          'Applications will be reviewed by education admins using documents, academic record, district/taluka and financial need.',
        icon: Award,
      },
    ],
    reviewTitle: 'Transparent Review',
    reviewDescription:
      'Every application is linked with the verified member profile. Admins can review documents, district/taluka details, academic record and support request before approval.',
    privacyTitle: 'Member Verified',
    privacyDescription:
      'Only registered members can submit education applications. This keeps records organized and reduces duplicate or fake requests.',
    requiredTitle: 'Required Documents',
    requiredDocuments: [
      'Student CNIC / B-form',
      'Guardian CNIC',
      'Latest marksheet',
      'Admission proof',
      'Fee challan',
      'Institute card or enrollment proof',
    ],
    requiredNote:
      'Documents upload is available in the application form. Please upload clear PDF, JPG, PNG or WEBP files up to 5MB for faster verification.',
  },
  ur: {
    badge: 'جے اے ایس تعلیم اور اسکلز ڈیولپمنٹ',
    title: 'جے اے ایس ممبران کے لیے تعلیمی مدد، اسکالرشپس اور ہنر مندی کی تربیت',
    description:
      'شفاف اور ممبرشپ سے تصدیق شدہ نظام کے ذریعے اسکالرشپ، فیس سپورٹ، داخلہ رہنمائی، کیریئر کونسلنگ اور اسکلز پروگرام کے لیے درخواست دیں۔',
    applyCta: 'تعلیمی مدد کے لیے درخواست دیں',
    myApplicationsCta: 'میری درخواستیں',
    featuresEyebrow: 'پروگرام فیچرز',
    featuresTitle: 'طلبہ، نوجوانوں اور خاندانوں کے لیے بنایا گیا',
    featuresDescription:
      'تعلیمی سپورٹ مستحق ممبران کو تعلیم جاری رکھنے، ہنر بہتر بنانے اور کیریئر رہنمائی حاصل کرنے میں مدد دیتی ہے۔',
    features: [
      {
        title: 'اسکالرشپ اور فیس سپورٹ',
        description:
          'طلبہ داخلہ فیس، ماہانہ فیس، امتحانی فیس، کتابیں، یونیفارم، ہاسٹل یا مکمل اسکالرشپ کے لیے درخواست دے سکتے ہیں۔',
        icon: GraduationCap,
      },
      {
        title: 'اسکلز ڈیولپمنٹ پروگرامز',
        description:
          'نوجوان کمپیوٹر، فری لانسنگ، ڈیجیٹل اسکلز، زبان، ٹیکنیکل اور کیریئر فوکسڈ ٹریننگ کے لیے رجسٹر ہو سکتے ہیں۔',
        icon: BriefcaseBusiness,
      },
      {
        title: 'میرٹ اور ضرورت کی بنیاد پر جائزہ',
        description:
          'ایجوکیشن ایڈمن دستاویزات، تعلیمی ریکارڈ، ضلع/تعلقہ اور مالی ضرورت کی بنیاد پر درخواست کا جائزہ لیں گے۔',
        icon: Award,
      },
    ],
    reviewTitle: 'شفاف جائزہ',
    reviewDescription:
      'ہر درخواست تصدیق شدہ ممبر پروفائل سے منسلک ہوگی۔ ایڈمن منظوری سے پہلے دستاویزات، علاقائی تفصیل، تعلیمی ریکارڈ اور سپورٹ درخواست کا جائزہ لے سکتے ہیں۔',
    privacyTitle: 'ممبر تصدیق شدہ',
    privacyDescription:
      'صرف رجسٹرڈ ممبران تعلیمی درخواست جمع کرا سکتے ہیں۔ اس سے ریکارڈ منظم رہتا ہے اور جعلی یا ڈپلیکیٹ درخواستیں کم ہوتی ہیں۔',
    requiredTitle: 'ضروری دستاویزات',
    requiredDocuments: [
      'طالب علم کا CNIC / ب فارم',
      'سرپرست کا CNIC',
      'تازہ مارک شیٹ',
      'داخلہ کا ثبوت',
      'فیس چالان',
      'انسٹیٹیوٹ کارڈ یا انرولمنٹ ثبوت',
    ],
    requiredNote:
      'دستاویزات اپلوڈ درخواست فارم میں دستیاب ہے۔ تیز تصدیق کے لیے واضح PDF، JPG، PNG یا WEBP فائلیں 5MB تک اپلوڈ کریں۔',
  },
  sd: {
    badge: 'JAS تعليم ۽ مهارتن جي ترقي',
    title: 'JAS ميمبرن لاءِ تعليمي مدد، اسڪالرشپس ۽ مهارتن جي تربيت',
    description:
      'شفاف ۽ ميمبرشپ تصديق ٿيل نظام ذريعي اسڪالرشپ، في سپورٽ، داخلا رهنمائي، ڪيريئر ڪائونسلنگ ۽ مهارتن جي پروگرامن لاءِ درخواست ڏيو.',
    applyCta: 'تعليمي مدد لاءِ درخواست ڏيو',
    myApplicationsCta: 'منهنجون درخواستون',
    featuresEyebrow: 'پروگرام فيچرز',
    featuresTitle: 'شاگردن، نوجوانن ۽ خاندانن لاءِ ٺهيل',
    featuresDescription:
      'تعليمي سپورٽ مستحق ميمبرن کي تعليم جاري رکڻ، مهارتون بهتر ڪرڻ ۽ ڪيريئر رهنمائي حاصل ڪرڻ ۾ مدد ڪري ٿي.',
    features: [
      {
        title: 'اسڪالرشپ ۽ في سپورٽ',
        description:
          'شاگرد داخلا في، ماهوار في، امتحاني في، ڪتابن، يونيفارم، هاسٽل يا مڪمل اسڪالرشپ لاءِ درخواست ڏئي سگهن ٿا.',
        icon: GraduationCap,
      },
      {
        title: 'مهارتن جي ترقي جا پروگرام',
        description:
          'نوجوان ڪمپيوٽر، فري لانسنگ، ڊجيٽل مهارتن، ٻولي، ٽيڪنيڪل ۽ ڪيريئر ٽريننگ لاءِ رجسٽر ٿي سگهن ٿا.',
        icon: BriefcaseBusiness,
      },
      {
        title: 'ميرٽ ۽ ضرورت جي بنياد تي جائزو',
        description:
          'ايجوڪيشن ايڊمن دستاويزن، تعليمي رڪارڊ، ضلع/تعلقي ۽ مالي ضرورت جي بنياد تي درخواست جو جائزو وٺندا.',
        icon: Award,
      },
    ],
    reviewTitle: 'شفاف جائزو',
    reviewDescription:
      'هر درخواست تصديق ٿيل ميمبر پروفائل سان ڳنڍيل هوندي. ايڊمن منظوري کان اڳ دستاويز، علائقائي تفصيل، تعليمي رڪارڊ ۽ سپورٽ درخواست جو جائزو وٺندا.',
    privacyTitle: 'ميمبر تصديق ٿيل',
    privacyDescription:
      'صرف رجسٽرڊ ميمبر تعليمي درخواست جمع ڪرائي سگهن ٿا. ان سان رڪارڊ منظم رهندو ۽ جعلي يا ڊپليڪيٽ درخواستون گهٽ ٿينديون.',
    requiredTitle: 'ضروري دستاويز',
    requiredDocuments: [
      'شاگرد جو CNIC / ب فارم',
      'سرپرست جو CNIC',
      'تازو مارڪ شيٽ',
      'داخلا جو ثبوت',
      'في چالان',
      'انسٽيٽيوٽ ڪارڊ يا انرولمينٽ ثبوت',
    ],
    requiredNote:
      'دستاويز اپلوڊ درخواست فارم ۾ موجود آهي. تيز تصديق لاءِ صاف PDF، JPG، PNG يا WEBP فائلون 5MB تائين اپلوڊ ڪريو.',
  },
} as const

function EducationRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const normalizedPathname = pathname.replace(/\/+$/, '')

  if (normalizedPathname === '/programs/education') {
    return <EducationProgramPage />
  }

  return <Outlet />
}

function EducationProgramPage() {
  const { copy: t, textDir, textAlignClass, arrowClass } =
    useLocalizedProgramCopy(copy)

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="relative overflow-hidden bg-slate-950 px-4 py-16 text-white md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-400 blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-blue-500 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className={`max-w-4xl space-y-6 ${textAlignClass}`} dir={textDir}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/90">
              <BookOpenCheck className="h-4 w-4 text-amber-300" />
              {t.badge}
            </div>

            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              {t.title}
            </h1>

            <p className="max-w-3xl text-lg leading-8 text-white/75">
              {t.description}
            </p>

            <div className={`flex flex-col gap-3 pt-2 sm:flex-row ${textDir === 'rtl' ? 'sm:justify-end' : ''}`}>
              <Link
                to="/programs/education/apply"
                className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 no-underline transition hover:bg-amber-300"
              >
                {t.applyCta}
                <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
              </Link>

              <Link
                to="/programs/education/my-applications"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-black text-white no-underline transition hover:bg-white/20"
              >
                {t.myApplicationsCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className={`max-w-3xl space-y-3 ${textAlignClass}`} dir={textDir}>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-amber-600">
              {t.featuresEyebrow}
            </p>

            <h2 className="text-3xl font-black text-slate-950 md:text-5xl">
              {t.featuresTitle}
            </h2>

            <p className="text-lg leading-8 text-slate-600">
              {t.featuresDescription}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {t.features.map((feature) => {
              const Icon = feature.icon

              return (
                <article
                  key={feature.title}
                  className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${textAlignClass}`}
                  dir={textDir}
                >
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 ${textDir === 'rtl' ? 'mr-auto' : ''}`}>
                    <Icon className="h-7 w-7" />
                  </div>

                  <h3 className="text-xl font-black text-slate-950">
                    {feature.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <InfoPanel
            icon={<ShieldCheck className="mb-5 h-10 w-10 text-amber-300" />}
            title={t.reviewTitle}
            text={t.reviewDescription}
            dark
            textDir={textDir}
            textAlignClass={textAlignClass}
          />

          <InfoPanel
            icon={<BookOpenCheck className="mb-5 h-10 w-10 text-amber-700" />}
            title={t.privacyTitle}
            text={t.privacyDescription}
            textDir={textDir}
            textAlignClass={textAlignClass}
          />
        </div>
      </section>

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className={`rounded-3xl border border-slate-200 bg-white p-8 shadow-sm ${textAlignClass}`} dir={textDir}>
            <h2 className="text-3xl font-black text-slate-950">
              {t.requiredTitle}
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {t.requiredDocuments.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-slate-700 shadow-sm"
                >
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              {t.requiredNote}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoPanel({
  icon,
  title,
  text,
  dark = false,
  textDir,
  textAlignClass,
}: {
  icon: ReactNode
  title: string
  text: string
  dark?: boolean
  textDir: 'ltr' | 'rtl'
  textAlignClass: string
}) {
  return (
    <div
      className={`rounded-3xl p-8 ${
        dark
          ? 'bg-slate-950 text-white'
          : 'border border-slate-200 bg-slate-50 text-slate-950'
      } ${textAlignClass}`}
      dir={textDir}
    >
      {icon}
      <h2 className="text-3xl font-black">{title}</h2>
      <p className={`mt-4 leading-8 ${dark ? 'text-white/75' : 'text-slate-600'}`}>
        {text}
      </p>
    </div>
  )
}
