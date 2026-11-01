// src/routes/admin/cms.tsx
import { createFileRoute, useNavigate, Outlet, useRouterState } from '@tanstack/react-router'
import {
  ArrowRight,
  Edit3,
  FileText,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cmsLanguageOptions,
  cmsPublicPages,
  currentUserCanManageCms,
  fetchAllCmsPagesForAdmin,
  getCmsLanguageLabel,
  getCmsStatusClass,
  type CmsPage,
  type CmsPageSlug,
} from '../../lib/cms'
import { AdminShell } from '../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/cms')({
  component: AdminCmsPage,
})

function AdminCmsPage() {
  const navigate = useNavigate()
  // Determine if this route is nested (e.g. /admin/cms/$slug) so we can delegate rendering to child routes
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  // Normalize pathname by removing trailing slashes (to detect exact '/admin/cms' route)
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const isNestedCmsPage = normalizedPathname !== '/admin/cms'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pages, setPages] = useState<CmsPage[]>([])
  const [error, setError] = useState('')

  const loadPages = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const allowed = await currentUserCanManageCms()
      if (!allowed) {
        await navigate({ to: '/admin' })
        return
      }

      const data = await fetchAllCmsPagesForAdmin()
      setPages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CMS pages.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [navigate])

  useEffect(() => {
    // Only load CMS pages when on the root /admin/cms route. Nested routes should rely on their own loaders.
    if (isNestedCmsPage) return
    void loadPages()
  }, [loadPages, isNestedCmsPage])

  const pagesBySlugLanguage = useMemo(() => {
    const map = new Map<string, CmsPage>()

    pages.forEach((page) => {
      map.set(`${page.slug}:${page.language}`, page)
    })

    return map
  }, [pages])

  const stats = useMemo(() => {
    return pages.reduce(
      (acc, page) => {
        acc.total += 1
        if (page.status === 'published') acc.published += 1
        if (page.status === 'draft') acc.draft += 1
        if (page.status === 'archived') acc.archived += 1
        return acc
      },
      { total: 0, published: 0, draft: 0, archived: 0 },
    )
  }, [pages])

  // If this is a nested CMS route, render the child route outlet instead of the CMS list
  if (isNestedCmsPage) {
    return <Outlet />
  }

  if (loading) {
    return (
      <AdminShell title="CMS Pages" subtitle="Manage multilingual public website pages.">
        <div className="admin-nested-page">
          <div className="page-wrap rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              Loading CMS pages...
            </div>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="CMS Pages" subtitle="Manage multilingual public website pages.">
      <div className="admin-nested-page">
        <div className="page-wrap space-y-6">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                  Admin CMS
                </p>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Multilingual Public Website Content
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Manage English, Urdu and Sindhi versions for About, Vision &
                  Mission, Manifesto, Constitution, CWC and Contact pages.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadPages(true)}
                disabled={refreshing}
                className="secondary-btn pressable w-fit disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total Language Pages" value={stats.total} />
            <Stat label="Published" value={stats.published} />
            <Stat label="Drafts" value={stats.draft} />
            <Stat label="Archived" value={stats.archived} />
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
          <div className="mb-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-100">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="m-0 font-semibold leading-6">
              Each public CMS page can now have separate English, Urdu and
              Sindhi records. Only published language records are visible to
              public visitors. Missing or draft translations use localized
              fallback content on the public site.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {cmsPublicPages.map((config) => (
              <CmsPageCard
                key={config.slug}
                slug={config.slug}
                title={config.fallbackTitle}
                subtitle={config.fallbackSubtitle}
                pagesBySlugLanguage={pagesBySlugLanguage}
              />
            ))}
          </div>

          {pages.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center ring-1 ring-slate-100">
              <LockKeyhole className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-3 text-lg font-black text-slate-950">
                No saved CMS records found
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Open any page/language and save it to create the first record.
              </p>
            </div>
          ) : null}
        </section>
        </div>
      </div>
    </AdminShell>
  )
}

function CmsPageCard({
  slug,
  title,
  subtitle,
  pagesBySlugLanguage,
}: {
  slug: CmsPageSlug
  title: string
  subtitle: string
  pagesBySlugLanguage: Map<string, CmsPage>
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {cmsLanguageOptions.map((language) => {
          const page = pagesBySlugLanguage.get(`${slug}:${language.value}`)
          const status = page?.status ?? 'missing'

          return (
            <div
              key={language.value}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
            >
              <div>
                <p className="text-sm font-black text-slate-950">
                  {language.nativeLabel}
                  <span className="ml-2 text-xs font-bold text-slate-500">
                    {getCmsLanguageLabel(language.value)}
                  </span>
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-[0.65rem] font-black uppercase ring-1 ${
                    page
                      ? getCmsStatusClass(page.status)
                      : 'bg-slate-100 text-slate-600 ring-slate-200'
                  }`}
                >
                  {status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`/admin/cms/${encodeURIComponent(slug)}?language=${language.value}`}
                  className="jas-dark-action-link inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black no-underline transition"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </a>

                {page?.status === 'published' ? (
                  <a
                    href={`/${slug}`}
                    className="secondary-btn px-4 py-3 text-sm no-underline"
                  >
                    View
                    <ArrowRight className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}
