// src/routes/admin/news.tsx
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ArrowRight, Edit3, Newspaper, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  currentUserCanManageMedia,
  fetchNewsPostsForAdmin,
  formatMediaDate,
  getContentStatusClass,
  getNewsCategoryLabel,
  type NewsPost,
} from '../../lib/media'
import { AdminShell } from '../../components/admin/AdminShell'

export const Route = createFileRoute('/admin/news')({
  component: AdminNewsPage,
})

function AdminNewsPage() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const isNestedNewsPage = normalizedPathname !== '/admin/news'

  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isNestedNewsPage) return

    void loadPosts()
  }, [isNestedNewsPage])

  async function loadPosts() {
    setLoading(true)
    setMessage('')

    try {
      const allowed = await currentUserCanManageMedia()
      if (!allowed) {
        setMessage('Only admin or super admin can manage news and media.')
        setPosts([])
        return
      }

      setPosts(await fetchNewsPostsForAdmin())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load news posts.')
    } finally {
      setLoading(false)
    }
  }

  if (isNestedNewsPage) {
    return <Outlet />
  }

  return (
    <AdminShell title="News Management" subtitle="Create, edit and publish public news posts.">
      <div className="admin-nested-page">
        <div className="px-3 py-6 sm:px-4 sm:py-10">
          <div className="page-wrap space-y-6">
        <header className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">News & Media</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">News Admin</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Create, edit, publish and archive public JAS news posts and announcements.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/gallery" className="secondary-btn no-underline">Gallery</Link>
              <Link to="/admin/events" className="secondary-btn no-underline">Events</Link>
              <button type="button" onClick={() => void loadPosts()} className="secondary-btn">
                <RefreshCw size={16} /> Refresh
              </button>
              <Link to="/admin/news/$id" params={{ id: 'new' }} className="primary-btn no-underline">
                <Plus size={16} /> Create News
              </Link>
            </div>
          </div>
        </header>

        {loading ? <StateCard message="Loading news posts..." /> : message ? <StateCard message={message} tone="error" /> : null}

        {!loading && !message ? (
          <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
            {posts.length === 0 ? (
              <StateCard message="No news posts yet." />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><Newspaper size={22} /></span>
                        <div className="min-w-0">
                          <h2 className="text-xl font-black text-slate-950">{post.title}</h2>
                          <p className="mt-1 text-xs font-bold text-slate-500">/{post.slug}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ring-1 ${getContentStatusClass(post.status)}`}>{post.status}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{getNewsCategoryLabel(post.category)}</span>
                      {post.is_featured ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Featured</span> : null}
                      <span className="rounded-full bg-slate-100 px-3 py-1">Updated {formatMediaDate(post.updated_at)}</span>
                    </div>

                    {post.summary ? <p className="mt-4 text-sm leading-7 text-slate-600">{post.summary}</p> : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link to="/admin/news/$id" params={{ id: post.id }} className="jas-dark-action-link inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black no-underline">
                        <Edit3 size={15} /> Edit Post
                      </Link>
                      {post.status === 'published' ? (
                        <Link to="/news/$slug" params={{ slug: post.slug }} className="secondary-btn no-underline">
                          View Public <ArrowRight size={15} />
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}

function StateCard({ message, tone = 'default' }: { message: string; tone?: 'default' | 'error' }) {
  return <div className={`rounded-2xl p-5 text-sm font-bold ring-1 ${tone === 'error' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-white text-slate-600 ring-slate-200'}`}>{message}</div>
}
