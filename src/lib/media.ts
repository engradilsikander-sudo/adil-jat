// src/lib/media.ts
import { supabase } from './supabase/client'

export const JAS_MEDIA_BUCKET = 'jas-media'

export type ContentStatus = 'draft' | 'published' | 'archived'
export type NewsCategory =
  | 'general'
  | 'education'
  | 'health'
  | 'welfare'
  | 'employment'
  | 'election'
  | 'announcement'

export type NewsPost = {
  id: string
  slug: string
  title: string
  summary: string | null
  content: string
  category: NewsCategory | string
  cover_image_path: string | null
  status: ContentStatus | string
  is_featured: boolean
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type GalleryItem = {
  id: string
  title: string
  description: string | null
  image_path: string | null
  category: string | null
  status: ContentStatus | string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type JasEvent = {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  status: ContentStatus | string
  cover_image_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type NewsPostInput = {
  id?: string
  title: string
  slug: string
  summary: string | null
  content: string
  category: NewsCategory
  cover_image_path: string | null
  status: ContentStatus
  is_featured: boolean
}

export type GalleryItemInput = {
  id?: string
  title: string
  description: string | null
  image_path: string | null
  category: string | null
  status: ContentStatus
}

export type EventInput = {
  id?: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  cover_image_path: string | null
  status: ContentStatus
}

const supabaseAny = supabase as unknown as {
  from: (table: string) => any
  storage: typeof supabase.storage
  auth: typeof supabase.auth
}

export const newsCategoryOptions: Array<{ value: NewsCategory; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'education', label: 'Education' },
  { value: 'health', label: 'Health' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'employment', label: 'Employment' },
  { value: 'election', label: 'Election' },
  { value: 'announcement', label: 'Announcement' },
]

export const contentStatusOptions: Array<{ value: ContentStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export function slugifyTitle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
}

export function getMediaPublicUrl(path: string | null | undefined) {
  if (!path) return ''

  const { data } = supabase.storage.from(JAS_MEDIA_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadMediaFile(file: File, folder: string) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = `${folder}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from(JAS_MEDIA_BUCKET)
    .upload(safeName, file, {
      upsert: false,
      contentType: file.type,
    })

  if (error) throw error
  return safeName
}

export async function fetchPublishedNewsPosts(category?: string) {
  let query = supabaseAny
    .from('news_posts')
    .select('*')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as NewsPost[]
}

export async function fetchPublishedNewsPost(slug: string) {
  const { data, error } = await supabaseAny
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as NewsPost | null
}

export async function fetchNewsPostsForAdmin() {
  const { data, error } = await supabaseAny
    .from('news_posts')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as NewsPost[]
}

export async function fetchNewsPostForAdmin(id: string) {
  if (id === 'new') return null

  const { data, error } = await supabaseAny
    .from('news_posts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as NewsPost | null
}

export async function saveNewsPost(input: NewsPostInput) {
  const user = await requireCurrentUser()
  const payload = {
    title: input.title.trim(),
    slug: slugifyTitle(input.slug || input.title),
    summary: input.summary?.trim() || null,
    content: input.content.trim(),
    category: input.category,
    cover_image_path: input.cover_image_path || null,
    status: input.status,
    is_featured: input.is_featured,
    published_at: input.status === 'published' ? new Date().toISOString() : null,
    updated_by: user.id,
  }

  if (input.id && input.id !== 'new') {
    const { error } = await supabaseAny.from('news_posts').update(payload).eq('id', input.id)
    if (error) throw error
    return input.id
  }

  const { data, error } = await supabaseAny
    .from('news_posts')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single()

  if (error) throw error
  return data.id as string
}

export async function deleteNewsPost(id: string) {
  const { error } = await supabaseAny.from('news_posts').update({ status: 'archived' }).eq('id', id)
  if (error) throw error
}

export async function fetchPublishedGalleryItems() {
  const { data, error } = await supabaseAny
    .from('gallery_items')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as GalleryItem[]
}

export async function fetchGalleryItemsForAdmin() {
  const { data, error } = await supabaseAny
    .from('gallery_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as GalleryItem[]
}

export async function saveGalleryItem(input: GalleryItemInput) {
  const user = await requireCurrentUser()
  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    image_path: input.image_path || null,
    category: input.category?.trim() || null,
    status: input.status,
    created_by: user.id,
  }

  if (input.id) {
    const { error } = await supabaseAny.from('gallery_items').update(payload).eq('id', input.id)
    if (error) throw error
    return input.id
  }

  const { data, error } = await supabaseAny.from('gallery_items').insert(payload).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function fetchPublishedEvents() {
  const { data, error } = await supabaseAny
    .from('events')
    .select('*')
    .eq('status', 'published')
    .order('event_date', { ascending: true })

  if (error) throw error
  return (data ?? []) as JasEvent[]
}

export async function fetchEventsForAdmin() {
  const { data, error } = await supabaseAny
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as JasEvent[]
}

export async function saveEvent(input: EventInput) {
  const user = await requireCurrentUser()
  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    event_date: input.event_date,
    location: input.location?.trim() || null,
    cover_image_path: input.cover_image_path || null,
    status: input.status,
    created_by: user.id,
  }

  if (input.id) {
    const { error } = await supabaseAny.from('events').update(payload).eq('id', input.id)
    if (error) throw error
    return input.id
  }

  const { data, error } = await supabaseAny.from('events').insert(payload).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function currentUserCanManageMedia() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return false

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'super_admin'])
    .limit(1)

  if (error) return false
  return Boolean(data?.length)
}

async function requireCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('You must be logged in to manage media content.')
  return user
}

export function formatMediaDate(value: string | null | undefined) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getContentStatusClass(status: string) {
  if (status === 'published') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (status === 'draft') return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function getNewsCategoryLabel(value: string) {
  return newsCategoryOptions.find((item) => item.value === value)?.label ?? value
}

export function splitContentBlocks(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}
