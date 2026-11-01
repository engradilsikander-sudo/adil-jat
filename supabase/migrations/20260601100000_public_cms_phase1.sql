-- Public Website + CMS Phase 1
-- Creates editable public content pages for About, Vision & Mission,
-- Manifesto, Constitution, Central Working Committee and Contact.

create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  content text not null,
  language text not null default 'en' check (language in ('en', 'ur', 'roman_ur')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_pages_status_idx on public.cms_pages(status);
create index if not exists cms_pages_slug_status_idx on public.cms_pages(slug, status);

create or replace function public.set_cms_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  if new.status <> 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_cms_pages_updated_at on public.cms_pages;
create trigger set_cms_pages_updated_at
before update on public.cms_pages
for each row execute function public.set_cms_pages_updated_at();

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

alter table public.cms_pages enable row level security;

drop policy if exists "Public can read published CMS pages" on public.cms_pages;
create policy "Public can read published CMS pages"
on public.cms_pages
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins can manage CMS pages" on public.cms_pages;
create policy "Admins can manage CMS pages"
on public.cms_pages
for all
to authenticated
using (public.current_user_can_manage_cms())
with check (public.current_user_can_manage_cms());

insert into public.cms_pages (slug, title, subtitle, content, status, language, published_at)
values
  (
    'about',
    'About Jatt Alliance Sindh',
    'A non-political, welfare-focused and member-verified community platform for Jatt families across Sindh.',
    'Jatt Alliance Sindh (JAS) is a community welfare platform created to organize membership, education support, health assistance, welfare cases, employment support, donations and verified public service records.\n\nThe organization is designed to work through transparent membership verification, responsible admin review, district/taluka coordination and digital records.\n\nThis page can be updated from the Admin CMS panel.',
    'published',
    'en',
    now()
  ),
  (
    'vision-mission',
    'Vision and Mission',
    'To build an organized, educated, self-reliant and service-oriented Jatt community across Sindh.',
    'Vision:\nTo make the Jatt community living across Sindh educationally, economically, socially, morally and organizationally strong, dignified, self-reliant and united.\n\nMission:\nTo establish an organized system of membership, education, health, employment, welfare, donations and mutual cooperation for deserving and talented members of the community.',
    'published',
    'en',
    now()
  ),
  (
    'manifesto',
    'Manifesto / Manshoor',
    'The guiding principles and public commitment of Jatt Alliance Sindh.',
    'Jatt Alliance Sindh works for education, health, employment, welfare, social support, representation, unity, dignity and service.\n\nCore manifesto points include:\n- Education support and scholarships\n- Health assistance and emergency help\n- Employment and skills support\n- Welfare cases for deserving families\n- Transparent donations and finance records\n- Community unity and verified membership',
    'published',
    'en',
    now()
  ),
  (
    'constitution',
    'JAS Constitution',
    'The constitutional structure, roles, responsibilities and organizational rules of JAS.',
    'The constitution defines JAS membership, organizational structure, Central Working Committee, district and taluka units, duties of office bearers, program management, finance rules, discipline, records and reporting.\n\nCurrent hierarchy:\nCentral / Markaz → District → Taluka',
    'published',
    'en',
    now()
  ),
  (
    'cwc',
    'Central Working Committee',
    'The top-level governing and executive body responsible for day-to-day decisions and policy implementation.',
    'The Central Working Committee (CWC) is the top-level governing and executive body of Jatt Alliance Sindh.\n\nCentral Cabinet designations include:\n- Chairman\n- Senior Vice Chairman\n- Vice Chairman\n- General Secretary\n- Information Secretary\n\nAdditional committees, wings and advisory boards may be created as needed.',
    'published',
    'en',
    now()
  ),
  (
    'contact',
    'Contact Jatt Alliance Sindh',
    'For membership, program support, donations, verification and committee coordination.',
    'Contact information can be updated from the Admin CMS panel.\n\nSuggested fields:\n- WhatsApp number\n- Office address\n- Email\n- District coordination contacts\n- Donation account information\n- Social media links',
    'published',
    'en',
    now()
  )
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  content = excluded.content,
  status = excluded.status,
  language = excluded.language,
  published_at = coalesce(public.cms_pages.published_at, excluded.published_at),
  updated_at = now();
