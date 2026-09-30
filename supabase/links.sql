-- Run in Supabase SQL Editor. Existing site pages do not use these tables.
begin;
create or replace function public.valid_profile_links(items jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb;
begin
  if jsonb_typeof(items) <> 'array' then return false; end if;
  if jsonb_array_length(items) > 20 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item->'title') is distinct from 'string'
       or jsonb_typeof(item->'url') is distinct from 'string'
       or jsonb_typeof(item->'enabled') is distinct from 'boolean'
       or length(trim(item->>'title')) not between 1 and 80
       or length(item->>'url') > 2048
       or (item->>'url') !~* '^https?://[^[:space:]]+$'
    then return false; end if;
  end loop;
  return true;
end;
$$;
create table if not exists public.link_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' and slug not in ('painel','links','api','supabase','tests','chamada','elianefen','elianeprevias','biancarossi','becasantos','admin','login','cadastro','www')),
  name text not null check (length(trim(name)) between 1 and 80),
  bio text not null default '' check (length(bio) <= 300),
  avatar_url text not null default '' check (length(avatar_url) <= 2048 and (avatar_url = '' or avatar_url ~* '^https?://[^[:space:]]+$')),
  theme text not null default 'dark' check (theme in ('dark','light','rose','forest')),
  links jsonb not null default '[]'::jsonb check (public.valid_profile_links(links)),
  published boolean not null default false
);
alter table public.link_profiles enable row level security;
revoke all on public.link_profiles from anon, authenticated;
grant select on public.link_profiles to anon, authenticated;
grant insert, update, delete on public.link_profiles to authenticated;
drop policy if exists "Read published or own profiles" on public.link_profiles;
create policy "Read published or own profiles" on public.link_profiles for select using (published or (select auth.uid()) = user_id);
drop policy if exists "Create own profile" on public.link_profiles;
create policy "Create own profile" on public.link_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Edit own profile" on public.link_profiles;
create policy "Edit own profile" on public.link_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own profile" on public.link_profiles;
create policy "Delete own profile" on public.link_profiles for delete to authenticated using ((select auth.uid()) = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('link-avatars','link-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Upload own link avatar" on storage.objects;
create policy "Upload own link avatar" on storage.objects for insert to authenticated with check (bucket_id='link-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Read own link avatars" on storage.objects;
create policy "Read own link avatars" on storage.objects for select to authenticated using (bucket_id='link-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Delete own link avatars" on storage.objects;
create policy "Delete own link avatars" on storage.objects for delete to authenticated using (bucket_id='link-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
