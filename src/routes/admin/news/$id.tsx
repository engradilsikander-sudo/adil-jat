// src/routes/admin/news/$id.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ImagePlus, Loader2, Save } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  contentStatusOptions,
  currentUserCanManageMedia,
  fetchNewsPostForAdmin,
  getMediaPublicUrl,
  newsCategoryOptions,
  saveNewsPost,
  slugifyTitle,
  uploadMediaFile,
  type ContentStatus,
  type NewsCategory,
} from '../../../lib/media'
import { AdminShell } from '../../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/news/$id')({
  component: AdminNewsEditorPage,
})

type FormState = {
  title: string
  slug: string
  summary: string
  content: string
  category: NewsCategory
  status: ContentStatus
  isFeatured: boolean
  coverImagePath: string | null
}

const emptyForm: FormState = {
  title: '',
  slug: '',
  summary: '',
  content: '',
  category: 'general',
  status: 'draft',
  isFeatured: false,
  coverImagePath: null,
}

function AdminNewsEditorPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadPost()
  }, [id])

  async function loadPost() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageMedia()
      if (!allowed) {
        setMessage('Only admin or super admin can manage news and media.')
        return
      }

      if (isNew) {
        setForm(emptyForm)
        return
      }

      const post = await fetchNewsPostForAdmin(id)
      if (!post) {
        setMessage('News post not found.')
        return
      }

      setForm({
        title: post.title,
        slug: post.slug,
        summary: post.summary ?? '',
        content: post.content,
        category: post.category as NewsCategory,
        status: post.status as ContentStatus,
        isFeatured: post.is_featured,
        coverImagePath: post.cover_image_path,
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load post.')
    } finally {
      setLoading(false)
    }
  }

  const coverUrl = useMemo(() => getMediaPublicUrl(form.coverImagePath), [form.coverImagePath])

  function updateForm<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: current.slug || slugifyTitle(value),
    }))
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const path = await uploadMediaFile(file, 'news')
      updateForm('coverImagePath', path)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Cover image upload failed.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (!form.title.trim()) throw new Error('Title is required.')
      if (!form.content.trim()) throw new Error('Content is required.')

      const savedId = await saveNewsPost({
        id: isNew ? undefined : id,
        title: form.title,
        slug: form.slug || slugifyTitle(form.title),
        summary: form.summary || null,
        content: form.content,
        category: form.category,
        cover_image_path: form.coverImagePath,
        status: form.status,
        is_featured: form.isFeatured,
      })

      await navigate({ to: '/admin/news/$id', params: { id: savedId }, replace: true })
      setMessage('News post saved successfully.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save post.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminShell title="News Editor" subtitle="Create or update a public news post.">
        <div className="admin-nested-page">
          <div className="page-wrap py-10">
            <StateCard message="Loading news editor..." />
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title="News Editor" subtitle="Create or update a public news post.">
      <div className="admin-nested-page">
        <div className="px-3 py-6 sm:px-4 sm:py-10">
          <div className="page-wrap max-w-5xl space-y-6">
        <Link to="/admin/news" className="inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline">
          <ArrowLeft size={16} /> Back to News Admin
        </Link>

        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">News Editor</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{isNew ? 'Create News Post' : 'Edit News Post'}</h1>
            </div>

            <button type="submit" disabled={saving} className="primary-btn disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </div>

          {message ? <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{message}</div> : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <Field label="Title"><input value={form.title} onChange={(e) => handleTitle(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="News title" /></Field>
              <Field label="Slug"><input value={form.slug} onChange={(e) => updateForm('slug', slugifyTitle(e.target.value))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="news-slug" /></Field>
              <Field label="Summary"><textarea value={form.summary} onChange={(e) => updateForm('summary', e.target.value)} className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Short public summary" /></Field>
              <Field label="Content"><textarea value={form.content} onChange={(e) => updateForm('content', e.target.value)} className="min-h-[300px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Write full news content. Separate paragraphs with blank lines." /></Field>
            </div>

            <aside className="space-y-4">
              <Field label="Category">
                <select value={form.category} onChange={(e) => updateForm('category', e.target.value as NewsCategory)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                  {newsCategoryOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={(e) => updateForm('status', e.target.value as ContentStatus)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">
                  {contentStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>

              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateForm('isFeatured', e.target.checked)} />
                Featured news
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">Cover Image</p>
                {coverUrl ? <img src={coverUrl} alt="Cover preview" className="mt-3 h-40 w-full rounded-xl object-cover" /> : <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><ImagePlus size={34} /></div>}
                <label className="secondary-btn mt-3 w-full cursor-pointer justify-center">
                  {uploading ? 'Uploading...' : 'Upload Cover'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
            </aside>
          </div>
        </form>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-800">{label}</span>{children}</label>
}

function StateCard({ message }: { message: string }) {
  return <div className="rounded-2xl bg-white p-5 text-sm font-bold text-slate-600 ring-1 ring-slate-200">{message}</div>
}
