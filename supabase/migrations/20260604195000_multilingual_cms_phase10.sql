-- Multilingual Admin CMS Editor Phase 10
-- Allows one CMS page record per slug per language: English / Urdu / Sindhi.

update public.cms_pages
set language = 'ur'
where language = 'roman_ur';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cms_pages'::regclass
      and conname = 'cms_pages_slug_key'
  ) then
    alter table public.cms_pages drop constraint cms_pages_slug_key;
  end if;
end $$;

alter table public.cms_pages
drop constraint if exists cms_pages_language_check;

alter table public.cms_pages
add constraint cms_pages_language_check
check (language in ('en', 'ur', 'sd'));

create unique index if not exists cms_pages_slug_language_key
on public.cms_pages (slug, language);

create index if not exists cms_pages_slug_language_status_idx
on public.cms_pages (slug, language, status);

create index if not exists cms_pages_language_status_idx
on public.cms_pages (language, status);
