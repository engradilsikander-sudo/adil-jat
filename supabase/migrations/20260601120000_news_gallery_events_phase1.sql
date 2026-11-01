-- News / Gallery / Events Phase 1
-- Public published content + admin-only media management.

create or replace function public.current_user_can_manage_cms()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin', 'super_admin')
  );
$$;

revoke all on function public.current_user_can_manage_cms() from public, anon;
grant execute on function public.current_user_can_manage_cms() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jas-media',
  'jas-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  content text not null,
  category text not null default 'general' check (category in ('general', 'education', 'health', 'welfare', 'employment', 'election', 'announcement')),
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_path text,
  category text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  location text,
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_posts_status_idx on public.news_posts(status);
create index if not exists news_posts_slug_status_idx on public.news_posts(slug, status);
create index if not exists news_posts_category_status_idx on public.news_posts(category, status);
create index if not exists news_posts_published_at_idx on public.news_posts(published_at desc);
create index if not exists gallery_items_status_idx on public.gallery_items(status);
create index if not exists events_status_date_idx on public.events(status, event_date);

create or replace function public.set_public_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if tg_table_name = 'news_posts' then
    if new.status = 'published' and new.published_at is null then
      new.published_at = now();
    end if;
    if new.status <> 'published' then
      new.published_at = null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_news_posts_updated_at on public.news_posts;
create trigger set_news_posts_updated_at
before update on public.news_posts
for each row execute function public.set_public_content_updated_at();

drop trigger if exists set_gallery_items_updated_at on public.gallery_items;
create trigger set_gallery_items_updated_at
before update on public.gallery_items
for each row execute function public.set_public_content_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_public_content_updated_at();

alter table public.news_posts enable row level security;
alter table public.gallery_items enable row level security;
alter table public.events enable row level security;

drop policy if exists "Public can read published news" on public.news_posts;
create policy "Public can read published news"
on public.news_posts
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage news" on public.news_posts;
create policy "Admins can manage news"
on public.news_posts
for all
to authenticated
using (public.current_user_can_manage_cms())
with check (public.current_user_can_manage_cms());

drop policy if exists "Public can read published gallery" on public.gallery_items;
create policy "Public can read published gallery"
on public.gallery_items
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage gallery" on public.gallery_items;
create policy "Admins can manage gallery"
on public.gallery_items
for all
to authenticated
using (public.current_user_can_manage_cms())
with check (public.current_user_can_manage_cms());

drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
on public.events
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage events" on public.events;
create policy "Admins can manage events"
on public.events
for all
to authenticated
using (public.current_user_can_manage_cms())
with check (public.current_user_can_manage_cms());

-- Storage policies for public media bucket.
drop policy if exists "Public can read JAS media" on storage.objects;
create policy "Public can read JAS media"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'jas-media');

drop policy if exists "Admins can upload JAS media" on storage.objects;
create policy "Admins can upload JAS media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'jas-media' and public.current_user_can_manage_cms());

drop policy if exists "Admins can update JAS media" on storage.objects;
create policy "Admins can update JAS media"
on storage.objects
for update
to authenticated
using (bucket_id = 'jas-media' and public.current_user_can_manage_cms())
with check (bucket_id = 'jas-media' and public.current_user_can_manage_cms());

drop policy if exists "Admins can delete JAS media" on storage.objects;
create policy "Admins can delete JAS media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'jas-media' and public.current_user_can_manage_cms());

insert into public.news_posts (slug, title, summary, content, category, status, is_featured, published_at)
values (
  'jas-public-website-launched',
  'JAS Public Website and Member Portal Updates',
  'Jatt Alliance Sindh is organizing membership, programs, donations and public information through a verified digital platform.',
  'Jatt Alliance Sindh has started building a public website and member portal to organize membership registration, digital cards, education support, health assistance, welfare cases, employment support, donations and public information.

The public website will share official announcements, news, program activity, events and gallery updates.

Admins can edit and publish news from the News Admin panel.',
  'announcement',
  'published',
  true,
  now()
)
on conflict (slug) do nothing;
