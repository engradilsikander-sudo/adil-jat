// src/routes/news.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, Newspaper, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchPublishedNewsPosts,
  formatMediaDate,
  getMediaPublicUrl,
  getNewsCategoryLabel,
  newsCategoryOptions,
  type NewsPost,
} from '../lib/media'
import { usePublicPageCopy } from '../lib/public-page-i18n'

export const Route = createFileRoute('/news')({
  component: NewsPage,
})

function NewsPage() {
  const publicCopy = usePublicPageCopy()
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    setError('')

    try {
      setPosts(await fetchPublishedNewsPosts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news.')
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return posts.filter((post) => {
      const matchesCategory = category === 'all' || post.category === category
      const matchesSearch =
        query.length === 0 ||
        [post.title, post.summary ?? '', post.content, post.category]
          .join(' ')
          .toLowerCase()
          .includes(query)

      return matchesCategory && matchesSearch
    })
  }, [category, posts, search])

  const featured = filteredPosts.find((post) => post.is_featured) ?? filteredPosts[0]
  const rest = featured ? filteredPosts.filter((post) => post.id !== featured.id) : filteredPosts

  return (
    <main className="page-wrap py-10 sm:py-14" dir="ltr">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#ffffff,#f7f1e6_54%,#eaf5f7)] p-6 shadow-sm ring-1 ring-slate-200/70 sm:p-8 lg:p-10">
        <div className={`max-w-3xl ${publicCopy.textAlignClass}`} dir={publicCopy.textDir}>
          <p className="section-eyebrow mb-3">{publicCopy.media.newsEyebrow}</p>
          <h1 className="section-title text-balance">{publicCopy.media.newsTitle}</h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {publicCopy.media.newsDescription}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder={publicCopy.media.newsSearch}
            />
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="all">{publicCopy.shared.allCategories}</option>
            {newsCategoryOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <StateCard message={publicCopy.media.loadingNews} />
      ) : error ? (
        <StateCard message={error} tone="error" />
      ) : filteredPosts.length === 0 ? (
        <StateCard message={publicCopy.media.emptyNews} />
      ) : (
        <>
          {featured ? (
            <FeaturedNews
              post={featured}
              labels={{
                featured: publicCopy.media.featured,
                readMore: publicCopy.media.readMore,
              }}
              arrowClass={publicCopy.arrowClass}
            />
          ) : null}
          <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <NewsCard
                key={post.id}
                post={post}
                readMoreLabel={publicCopy.media.readMore}
                arrowClass={publicCopy.arrowClass}
              />
            ))}
          </section>
        </>
      )}
    </main>
  )
}

function FeaturedNews({
  post,
  labels,
  arrowClass,
}: {
  post: NewsPost
  labels: {
    featured: string
    readMore: string
  }
  arrowClass: string
}) {
  const coverUrl = getMediaPublicUrl(post.cover_image_path)

  return (
    <section className="mt-7 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70 lg:grid lg:grid-cols-[1fr_1.1fr]">
      <div className="min-h-[260px] bg-emerald-950">
        {coverUrl ? (
          <img src={coverUrl} alt={post.title} className="h-full min-h-[260px] w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[260px] items-center justify-center bg-gradient-to-br from-emerald-950 to-slate-950 text-[#f2d48f]"><Newspaper size={58} /></div>
        )}
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">{labels.featured}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-800">{getNewsCategoryLabel(post.category)}</span>
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{post.title}</h2>
        {post.summary ? <p className="mt-4 text-base leading-8 text-slate-600">{post.summary}</p> : null}
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><CalendarDays size={16} /> {formatMediaDate(post.published_at ?? post.created_at)}</p>
        <Link to="/news/$slug" params={{ slug: post.slug }} className="jas-dark-action-link mt-6 inline-flex w-fit items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black no-underline">
          {labels.readMore} <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
        </Link>
      </div>
    </section>
  )
}

function NewsCard({
  post,
  readMoreLabel,
  arrowClass,
}: {
  post: NewsPost
  readMoreLabel: string
  arrowClass: string
}) {
  const coverUrl = getMediaPublicUrl(post.cover_image_path)

  return (
    <article className="flex min-h-[360px] flex-col overflow-hidden rounded-[1.6rem] bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-xl">
      <div className="h-44 bg-slate-100">
        {coverUrl ? (
          <img src={coverUrl} alt={post.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 text-emerald-800"><Newspaper size={42} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">{getNewsCategoryLabel(post.category)}</span>
          <span className="text-xs font-bold text-slate-500">{formatMediaDate(post.published_at ?? post.created_at)}</span>
        </div>
        <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{post.title}</h3>
        {post.summary ? <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{post.summary}</p> : null}
        <Link to="/news/$slug" params={{ slug: post.slug }} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-black text-emerald-800 no-underline">
          {readMoreLabel} <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
        </Link>
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
