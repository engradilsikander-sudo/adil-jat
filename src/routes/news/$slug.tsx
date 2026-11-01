// src/routes/news/$slug.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CalendarDays, Newspaper } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  fetchPublishedNewsPost,
  formatMediaDate,
  getMediaPublicUrl,
  getNewsCategoryLabel,
  splitContentBlocks,
  type NewsPost,
} from '../../lib/media'

export const Route = createFileRoute('/news/$slug')({
  component: NewsDetailPage,
})

function NewsDetailPage() {
  const { slug } = Route.useParams()
  const [post, setPost] = useState<NewsPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadPost()
  }, [slug])

  async function loadPost() {
    setLoading(true)
    setError('')

    try {
      const data = await fetchPublishedNewsPost(slug)
      if (!data) setError('News update not found or not published yet.')
      setPost(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news update.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <StatePage message="Loading news update..." />
  if (error || !post) return <StatePage message={error || 'News update not found.'} />

  const coverUrl = getMediaPublicUrl(post.cover_image_path)

  return (
    <main className="page-wrap py-10 sm:py-14">
      <Link to="/news" className="mb-5 inline-flex items-center gap-2 text-sm font-black text-emerald-800 no-underline">
        <ArrowLeft size={16} /> Back to news
      </Link>

      <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
        <div className="min-h-[320px] bg-emerald-950">
          {coverUrl ? (
            <img src={coverUrl} alt={post.title} className="h-full max-h-[520px] min-h-[320px] w-full object-cover" />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-950 text-[#f2d48f]"><Newspaper size={70} /></div>
          )}
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">{getNewsCategoryLabel(post.category)}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"><CalendarDays size={13} /> {formatMediaDate(post.published_at ?? post.created_at)}</span>
          </div>

          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{post.title}</h1>
          {post.summary ? <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{post.summary}</p> : null}

          <div className="mt-8 max-w-4xl space-y-5 text-base leading-8 text-slate-700">
            {splitContentBlocks(post.content).map((block, index) => (
              <p key={index} className="m-0 whitespace-pre-line">{block}</p>
            ))}
          </div>
        </div>
      </article>
    </main>
  )
}

function StatePage({ message }: { message: string }) {
  return (
    <main className="page-wrap py-10">
      <div className="rounded-2xl bg-white p-6 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
        {message}
      </div>
    </main>
  )
}
