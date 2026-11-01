// src/routes/admin/events.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, ImagePlus, Loader2, RefreshCw, Save } from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  contentStatusOptions,
  currentUserCanManageMedia,
  fetchEventsForAdmin,
  formatMediaDate,
  getContentStatusClass,
  getMediaPublicUrl,
  saveEvent,
  uploadMediaFile,
  type ContentStatus,
  type JasEvent,
} from '../../lib/media'
import { AdminShell } from '../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/events')({
  component: AdminEventsPage,
})

type FormState = {
  id?: string
  title: string
  description: string
  eventDate: string
  location: string
  coverImagePath: string | null
  status: ContentStatus
}

const emptyForm: FormState = {
  title: '',
  description: '',
  eventDate: new Date().toISOString().slice(0, 10),
  location: '',
  coverImagePath: null,
  status: 'draft',
}

function AdminEventsPage() {
  const [events, setEvents] = useState<JasEvent[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageMedia()
      if (!allowed) {
        setMessage('Only admin or super admin can manage events.')
        setEvents([])
        return
      }
      setEvents(await fetchEventsForAdmin())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  const coverUrl = useMemo(() => getMediaPublicUrl(form.coverImagePath), [form.coverImagePath])

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function editEvent(event: JasEvent) {
    setForm({
      id: event.id,
      title: event.title,
      description: event.description ?? '',
      eventDate: event.event_date.slice(0, 10),
      location: event.location ?? '',
      coverImagePath: event.cover_image_path,
      status: event.status as ContentStatus,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage('')

    try {
      const path = await uploadMediaFile(file, 'events')
      update('coverImagePath', path)
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
      if (!form.title.trim()) throw new Error('Event title is required.')
      if (!form.eventDate) throw new Error('Event date is required.')

      await saveEvent({
        id: form.id,
        title: form.title,
        description: form.description || null,
        event_date: form.eventDate,
        location: form.location || null,
        cover_image_path: form.coverImagePath,
        status: form.status,
      })

      setForm(emptyForm)
      await loadEvents()
      setMessage('Event saved successfully.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save event.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="Events Management" subtitle="Create and manage public events and meeting notices.">
      <div className="admin-nested-page">
        <div className="px-3 py-6 sm:px-4 sm:py-10">
          <div className="page-wrap space-y-6">
        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">News & Media</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Events Admin</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create and publish JAS public events and meeting notices.</p>
            </div>
            <button type="button" onClick={() => void loadEvents()} className="secondary-btn"><RefreshCw size={16} /> Refresh</button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <h2 className="text-xl font-black text-slate-950">{form.id ? 'Edit Event' : 'Add Event'}</h2>
            {message ? <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900 ring-1 ring-amber-100">{message}</div> : null}

            <div className="mt-5 space-y-4">
              <Field label="Title"><input value={form.title} onChange={(e) => update('title', e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Date"><input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Location"><input value={form.location} onChange={(e) => update('location', e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Description"><textarea value={form.description} onChange={(e) => update('description', e.target.value)} className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" /></Field>
              <Field label="Status"><select value={form.status} onChange={(e) => update('status', e.target.value as ContentStatus)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100">{contentStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {coverUrl ? <img src={coverUrl} alt="Event preview" className="h-44 w-full rounded-xl object-cover" /> : <div className="flex h-44 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><ImagePlus size={34} /></div>}
                <label className="secondary-btn mt-3 w-full cursor-pointer justify-center">
                  {uploading ? 'Uploading...' : 'Upload Cover'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverUpload} disabled={uploading} className="hidden" />
                </label>
              </div>

              <button type="submit" disabled={saving} className="primary-btn w-full disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Event
              </button>
              {form.id ? <button type="button" onClick={() => setForm(emptyForm)} className="secondary-btn w-full justify-center">Cancel edit</button> : null}
            </div>
          </form>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            {loading ? <StateCard message="Loading events..." /> : events.length === 0 ? <StateCard message="No events yet." /> : <div className="grid gap-4">{events.map((event) => <EventAdminCard key={event.id} event={event} onEdit={editEvent} />)}</div>}
          </div>
        </section>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function EventAdminCard({ event, onEdit }: { event: JasEvent; onEdit: (event: JasEvent) => void }) {
  return (
    <article className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getContentStatusClass(event.status)}`}>{event.status}</span>
          <h3 className="mt-3 text-xl font-black text-slate-950">{event.title}</h3>
          <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><CalendarDays size={15} /> {formatMediaDate(event.event_date)}</p>
          {event.location ? <p className="mt-1 text-sm font-semibold text-slate-500">{event.location}</p> : null}
        </div>
        <button type="button" onClick={() => onEdit(event)} className="jas-dark-action-link inline-flex rounded-xl px-4 py-3 text-sm font-black no-underline">Edit</button>
      </div>
      {event.description ? <p className="mt-3 text-sm leading-7 text-slate-600">{event.description}</p> : null}
    </article>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-800">{label}</span>{children}</label>
}

function StateCard({ message }: { message: string }) {
  return <div className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-600 ring-1 ring-slate-100">{message}</div>
}
