// src/routes/admin/cms/$slug.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Save, ShieldAlert } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  cmsLanguageOptions,
  currentUserCanManageCms,
  fetchCmsPageForAdmin,
  getCmsConfig,
  getCmsLanguageLabel,
  normalizeCmsLanguage,
  saveCmsPage,
  type CmsPageLanguage,
  type CmsPageSlug,
  type CmsPageStatus,
} from '../../../lib/cms'
import { getPublicCmsFallback } from '../../../lib/public-page-i18n'
import { AdminShell } from '../../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/cms/$slug')({
  component: AdminCmsEditPage,
})

function getInitialLanguageFromUrl(): CmsPageLanguage {
  if (typeof window === 'undefined') return 'en'

  return normalizeCmsLanguage(new URLSearchParams(window.location.search).get('language'))
}

function AdminCmsEditPage() {
  const { slug } = Route.useParams()
  const navigate = useNavigate()
  const typedSlug = slug as CmsPageSlug

  const [language, setLanguage] = useState<CmsPageLanguage>(() =>
    getInitialLanguageFromUrl(),
  )
  const fallback = useMemo(() => {
    const localizedFallback = getPublicCmsFallback(typedSlug, language)
    const legacyFallback = getCmsConfig(typedSlug)

    return {
      title: localizedFallback?.title || legacyFallback.fallbackTitle,
      subtitle: localizedFallback?.subtitle || legacyFallback.fallbackSubtitle,
      content: localizedFallback?.content || legacyFallback.fallbackContent,
    }
  }, [language, typedSlug])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<CmsPageStatus>('draft')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [recordExists, setRecordExists] = useState(false)

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const allowed = await currentUserCanManageCms()
      if (!allowed) {
        await navigate({ to: '/admin' })
        return
      }

      const page = await fetchCmsPageForAdmin(slug, language)

      setRecordExists(Boolean(page))
      setTitle(page?.title || fallback.title)
      setSubtitle(page?.subtitle || fallback.subtitle)
      setContent(page?.content || fallback.content)
      setStatus((page?.status as CmsPageStatus) || 'draft')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CMS page.')
    } finally {
      setLoading(false)
    }
  }, [fallback.content, fallback.subtitle, fallback.title, language, navigate, slug])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  function handleLanguageChange(nextLanguage: CmsPageLanguage) {
    setLanguage(nextLanguage)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('language', nextLanguage)
      window.history.replaceState(null, '', url.toString())
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (!title.trim()) throw new Error('Title is required.')
      if (!content.trim()) throw new Error('Content is required.')

      await saveCmsPage({
        slug,
        language,
        title,
        subtitle,
        content,
        status,
      })

      setRecordExists(true)
      setMessage(`${getCmsLanguageLabel(language)} CMS page saved successfully.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CMS page.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminShell title="CMS Editor" subtitle="Edit English, Urdu and Sindhi page content.">
        <div className="admin-nested-page">
          <div className="page-wrap rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              Loading CMS editor...
            </div>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="CMS Editor" subtitle="Edit English, Urdu and Sindhi page content.">
      <div className="admin-nested-page">
        <div className="page-wrap space-y-6">
        <div>
          <Link to="/admin/cms" className="secondary-btn w-fit px-4 py-3 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to CMS
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            CMS Editor
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Edit: {slug}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manage separate English, Urdu and Sindhi content for this public page.
            Published language versions are visible when visitors select that language.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {cmsLanguageOptions.map((item) => {
              const active = item.value === language

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleLanguageChange(item.value)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                    active
                      ? 'bg-emerald-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-900'
                  }`}
                  aria-pressed={active}
                >
                  {item.nativeLabel}
                  <span className="ml-2 text-xs opacity-75">{item.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </section>

        {!recordExists ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900 ring-1 ring-amber-100">
            No saved {getCmsLanguageLabel(language)} version exists yet. The editor is
            prefilled with localized fallback content. Save it to create this language
            record.
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="mb-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-100 sm:grid-cols-3">
            <Info label="Page" value={slug} />
            <Info label="Language" value={getCmsLanguageLabel(language)} />
            <Info label="Record" value={recordExists ? 'Saved' : 'New'} />
          </div>

          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-800">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                dir={language === 'en' ? 'ltr' : 'rtl'}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-800">Subtitle</span>
              <input
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                dir={language === 'en' ? 'ltr' : 'rtl'}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-800">Content</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                dir={language === 'en' ? 'ltr' : 'rtl'}
                rows={16}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium leading-7 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <span className="text-xs font-semibold text-slate-500">
                Use blank lines for paragraphs. Use lines starting with “- ” for bullet lists.
              </span>
            </label>

            <label className="grid gap-2 sm:max-w-xs">
              <span className="text-sm font-black text-slate-800">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as CmsPageStatus)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="primary-btn pressable disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : `Save ${getCmsLanguageLabel(language)} Page`}
            </button>
            <a href={`/${slug}`} className="secondary-btn no-underline">
              Preview Public Page
            </a>
          </div>
        </form>
        </div>
      </div>
    </AdminShell>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  )
}
