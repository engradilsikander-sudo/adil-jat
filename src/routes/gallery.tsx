// src/routes/gallery.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchPublishedGalleryItems, getMediaPublicUrl, type GalleryItem } from '../lib/media'
import { usePublicPageCopy } from '../lib/public-page-i18n'

export const Route = createFileRoute('/gallery')({
  component: GalleryPage,
})

function GalleryPage() {
  const publicCopy = usePublicPageCopy()
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadGallery()
  }, [])

  async function loadGallery() {
    setLoading(true)
    setError('')

    try {
      setItems(await fetchPublishedGalleryItems())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-wrap py-10 sm:py-14" dir="ltr">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_54%,#eaf5f7)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className={publicCopy.textAlignClass} dir={publicCopy.textDir}>
          <p className="section-eyebrow mb-3">{publicCopy.media.galleryEyebrow}</p>
          <h1 className="section-title text-balance">{publicCopy.media.galleryTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {publicCopy.media.galleryDescription}
          </p>
        </div>
      </section>

      {loading ? (
        <StateCard message={publicCopy.media.loadingGallery} />
      ) : error ? (
        <StateCard message={error} tone="error" />
      ) : items.length === 0 ? (
        <StateCard message={publicCopy.media.emptyGallery} />
      ) : (
        <section className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const imageUrl = getMediaPublicUrl(item.image_path)
            return (
              <article key={item.id} className="overflow-hidden rounded-[1.6rem] bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="h-64 bg-slate-100">
                  {imageUrl ? (
                    <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 text-emerald-800"><ImageIcon size={46} /></div>
                  )}
                </div>
                <div className="p-5">
                  {item.category ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">{item.category}</span> : null}
                  <h2 className="mt-3 text-xl font-black text-slate-950">{item.title}</h2>
                  {item.description ? <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p> : null}
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return (
    <div className={`mt-7 rounded-2xl p-6 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-600 ring-slate-200'}`}>
      {message}
    </div>
  )
}
