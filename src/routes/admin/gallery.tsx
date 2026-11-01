// src/routes/admin/gallery.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ImagePlus, Loader2, RefreshCw, Save } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  contentStatusOptions,
  currentUserCanManageMedia,
  fetchGalleryItemsForAdmin,
  getContentStatusClass,
  getMediaPublicUrl,
  saveGalleryItem,
  uploadMediaFile,
  type ContentStatus,
  type GalleryItem,
} from '../../lib/media'
import { AdminShell } from '../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/gallery')({
  component: AdminGalleryPage,
})

type FormState = {
  id?: string
  title: string
  description: string
  category: string
  imagePath: string | null
  status: ContentStatus
}

const emptyForm: FormState = {
  title: '',
  description: '',
  category: '',
  imagePath: null,
  status: 'draft',
}

function AdminGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadGallery()
  }, [])

  async function loadGallery() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageMedia()
      if (!allowed) {
        setMessage('Only admin or super admin can manage gallery.')
        setItems([])
        return
      }

      setItems(await fetchGalleryItemsForAdmin())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load gallery.')
    } finally {
      setLoading(false)
    }
  }

  const imageUrl = useMemo(() => getMediaPublicUrl(form.imagePath), [form.imagePath])

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function editItem(item: GalleryItem) {
    setForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      category: item.category ?? '',
      imagePath: item.image_path,
      status: item.status as ContentStatus,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const path = await uploadMediaFile(file, 'gallery')
      update('imagePath', path)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Image upload failed.')
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
      if (!form.imagePath) throw new Error('Please upload an image.')

      await saveGalleryItem({
        id: form.id,
        title: form.title,
        description: form.description || null,
        category: form.category || null,
        image_path: form.imagePath,
        status: form.status,
      })

      setForm(emptyForm)
      await loadGallery()
      setMessage('Gallery item saved successfully.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save gallery item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="Gallery Management" subtitle="Upload and manage public gallery items.">
      <div className="admin-nested-page">
        <div className="px-3 py-6 sm:px-4 sm:py-10">
          <div className="page-wrap space-y-6">
        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">News & Media</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Gallery Admin</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Upload and publish public gallery images.</p>
            </div>
            <button type="button" onClick={() => void loadGallery()} className="secondary-btn"><RefreshCw size={16} /> Refresh</button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <h2 className="text-xl font-black text-slate-950">{form.id ? 'Edit Gallery Item' : 'Add Gallery Item'}</h2>
            {message ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{message}</div> : null}

            <div className="mt-5 space-y-4">
              <Field label="Title"><input value={form.title} onChange={(e) => update('title', e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Category"><input value={form.category} onChange={(e) => update('category', e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Education, Event, Welfare..." /></Field>
              <Field label="Description"><textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Status"><select value={form.status} onChange={(e) => update('status', e.target.value as ContentStatus)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">{contentStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {imageUrl ? <img src={imageUrl} alt="Gallery preview" className="h-48 w-full rounded-xl object-cover" /> : <div className="flex h-48 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><ImagePlus size={34} /></div>}
                <label className="secondary-btn mt-3 w-full cursor-pointer justify-center">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={uploading} className="hidden" />
                </label>
              </div>

              <button type="submit" disabled={saving} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Gallery Item
              </button>
              {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="secondary-btn w-full justify-center">Cancel edit</button> : null}
            </div>
          </form>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            {loading ? <StateCard message="Loading gallery..." /> : items.length === 0 ? <StateCard message="No gallery items yet." /> : <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <GalleryAdminCard key={item.id} item={item} onEdit={editItem} />)}</div>}
          </div>
        </section>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function GalleryAdminCard({ item, onEdit }: { item: GalleryItem; onEdit: (item: GalleryItem) => void }) {
  const imageUrl = getMediaPublicUrl(item.image_path)
  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
      {imageUrl ? <img src={imageUrl} alt={item.title} className="h-40 w-full object-cover" /> : null}
      <div className="p-4">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getContentStatusClass(item.status)}`}>{item.status}</span>
        <h3 className="mt-3 text-lg font-black text-slate-950">{item.title}</h3>
        {item.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p> : null}
        <button type="button" onClick={() => onEdit(item)} className="jas-dark-action-link mt-4 inline-flex rounded-xl px-4 py-3 text-sm font-black no-underline">Edit</button>
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-800">{label}</span>{children}</label>
}

function StateCard({ message }: { message: string }) {
  return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{message}</div>
}
