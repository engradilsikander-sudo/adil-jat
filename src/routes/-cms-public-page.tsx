// src/routes/-cms-public-page.tsx
import { Link } from '@tanstack/react-router'
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchPublishedCmsPage,
  formatCmsContent,
  getCmsConfig,
  type CmsPage,
  type CmsPageSlug,
} from '../lib/cms'
import { usePublicPageCopy } from '../lib/public-page-i18n'

type CmsPublicPageProps = {
  slug: CmsPageSlug
}

export function CmsPublicPage({ slug }: CmsPublicPageProps) {
  const config = useMemo(() => getCmsConfig(slug), [slug])
  const publicCopy = usePublicPageCopy()
  const fallback = publicCopy.cms[slug]

  const [page, setPage] = useState<CmsPage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPage() {
      setLoading(true)
      const data = await fetchPublishedCmsPage(slug, publicCopy.language)
      if (!cancelled) {
        setPage(data)
        setLoading(false)
      }
    }

    void loadPage()

    return () => {
      cancelled = true
    }
  }, [publicCopy.language, slug])

  const title = page?.title || fallback.title || config.fallbackTitle
  const subtitle = page?.subtitle || fallback.subtitle || config.fallbackSubtitle
  const content = page?.content || fallback.content || config.fallbackContent
  const blocks = formatCmsContent(content)

  return (
    <main className="px-3 py-8 sm:px-4 sm:py-12" dir="ltr">
      <div className="page-wrap space-y-8">
        <section className="soft-panel relative overflow-hidden rounded-[2rem] border border-[#dce4ee] bg-[linear-gradient(135deg,#fffdf8_0%,#f7f1e6_54%,#edf4ee_100%)] p-[clamp(1.5rem,4vw,3.6rem)] shadow-[0_28px_80px_rgba(11,42,29,0.10)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,145,44,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(11,42,29,0.10),transparent_30%)]" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
              <p className="section-eyebrow mb-4">{fallback.eyebrow || config.eyebrow}</p>
              <h1 className="max-w-4xl text-[clamp(2.4rem,5.8vw,5.2rem)] font-black leading-[0.96] tracking-[-0.06em] text-slate-950">
                {title}
              </h1>
              <p className="mt-6 max-w-3xl text-pretty text-base font-medium leading-8 text-slate-600 sm:text-lg">
                {subtitle}
              </p>

              <div className={`mt-8 flex flex-wrap gap-3 ${publicCopy.isRtl ? 'justify-end' : ''}`}>
                <Link to="/signup" className="primary-btn pressable lift-hover">
                  {publicCopy.shared.becomeMember}
                  <ArrowRight className={`h-4 w-4 ${publicCopy.arrowClass}`} />
                </Link>
                <Link to="/donate" className="secondary-btn pressable lift-hover">
                  {publicCopy.shared.donate}
                </Link>
                <Link to="/contact" className="secondary-btn pressable lift-hover">
                  {publicCopy.shared.contact}
                </Link>
              </div>
            </div>

            <div className={`rounded-[1.8rem] border border-emerald-900/10 bg-white/75 p-6 shadow-sm backdrop-blur ${publicCopy.textAlignClass}`} dir={publicCopy.textDir}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ${publicCopy.isRtl ? 'mr-auto' : ''}`}>
                <ShieldCheck size={24} />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">
                {publicCopy.shared.officialContent}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {publicCopy.shared.cmsManaged}
              </p>
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-900">
                {loading
                  ? publicCopy.shared.loading
                  : page
                    ? publicCopy.shared.publishedFromCms
                    : publicCopy.shared.fallbackContent}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className={`rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8 ${publicCopy.textAlignClass}`} dir={publicCopy.textDir}>
            <div className="prose-content space-y-5">
              {blocks.map((block, index) => {
                const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
                const isList = lines.every((line) => line.startsWith('- '))

                if (isList) {
                  return (
                    <ul
                      key={index}
                      className={`list-disc space-y-2 text-[1rem] font-semibold leading-8 text-slate-700 ${publicCopy.isRtl ? 'pr-6' : 'pl-6'}`}
                    >
                      {lines.map((line) => (
                        <li key={line}>{line.replace(/^-\s*/, '')}</li>
                      ))}
                    </ul>
                  )
                }

                return (
                  <p key={index} className="m-0 whitespace-pre-line text-[1rem] font-medium leading-8 text-slate-700">
                    {block}
                  </p>
                )
              })}
            </div>
          </article>

          <aside className="space-y-4">
            <InfoCard
              title={publicCopy.shared.membership}
              to="/signup"
              text={publicCopy.shared.membershipText}
              textDir={publicCopy.textDir}
              textAlignClass={publicCopy.textAlignClass}
            />
            <InfoCard
              title={publicCopy.shared.programs}
              to="/programs/education"
              text={publicCopy.shared.programsText}
              textDir={publicCopy.textDir}
              textAlignClass={publicCopy.textAlignClass}
            />
            <InfoCard
              title={publicCopy.shared.donors}
              to="/donors"
              text={publicCopy.shared.donorsText}
              textDir={publicCopy.textDir}
              textAlignClass={publicCopy.textAlignClass}
            />
          </aside>
        </section>
      </div>
    </main>
  )
}

function InfoCard({
  title,
  text,
  to,
  textDir,
  textAlignClass,
}: {
  title: string
  text: string
  to: '/signup' | '/programs/education' | '/donors'
  textDir: 'ltr' | 'rtl'
  textAlignClass: string
}) {
  return (
    <Link
      to={to}
      className="group block rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      dir={textDir}
    >
      <div className={`flex items-start gap-3 ${textAlignClass}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[#9a6a12]">
          <FileText size={18} />
        </span>
        <span>
          <span className="block text-base font-black text-slate-950">{title}</span>
          <span className="mt-1 block text-sm font-medium leading-6 text-slate-600">{text}</span>
        </span>
      </div>
    </Link>
  )
}
