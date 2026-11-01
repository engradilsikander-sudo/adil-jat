// src/routes/events.tsx
import { createFileRoute } from '@tanstack/react-router'
import { CalendarDays, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPublishedEvents, formatMediaDate, getMediaPublicUrl, type JasEvent } from '../lib/media'
import { usePublicPageCopy } from '../lib/public-page-i18n'

export const Route = createFileRoute('/events')({
  component: EventsPage,
})

function EventsPage() {
  const publicCopy = usePublicPageCopy()
  const [events, setEvents] = useState<JasEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)
    setError('')

    try {
      setEvents(await fetchPublishedEvents())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap py-10 sm:py-14" dir="ltr">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_54%,#eaf5f7)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
          <p className="section-eyebrow mb-3">{publicCopy.media.eventsEyebrow}</p>
          <h1 className="section-title text-balance">{publicCopy.media.eventsTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {publicCopy.media.eventsDescription}
          </p>
        </div>
      </section>

      {loading ? (
        <StateCard message={publicCopy.media.loadingEvents} />
      ) : error ? (
        <StateCard message={error} tone="error" />
      ) : events.length === 0 ? (
        <StateCard message={publicCopy.media.emptyEvents} />
      ) : (
        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </section>
      )}
    </main>
  )
}

function EventCard({ event }: { event: JasEvent }) {
  const imageUrl = getMediaPublicUrl(event.cover_image_path)

  return (
    <article className="overflow-hidden rounded-[1.6rem] bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl sm:grid sm:grid-cols-[220px_1fr]">
      <div className="min-h-[190px] bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt={event.title} className="h-full min-h-[190px] w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[190px] items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 text-emerald-800"><CalendarDays size={46} /></div>
        )}
      </div>
      <div className="p-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
          <CalendarDays size={13} /> {formatMediaDate(event.event_date)}
        </p>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{event.title}</h2>
        {event.location ? <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><MapPin size={15} /> {event.location}</p> : null}
        {event.description ? <p className="mt-3 text-sm leading-7 text-slate-600">{event.description}</p> : null}
      </div>
    </article>
  )
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div className={`mt-7 rounded-2xl p-6 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-600 ring-slate-200'}`}>
      {message}
    </div>
  )
}
