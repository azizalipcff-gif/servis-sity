-- Service City — Phase G: production image storage.
-- Run after 0004_rls.sql in the Supabase SQL editor.
--
-- Creates the five production-grade storage buckets with format/size-aware
-- policies, and adds image URL columns to profiles and categories.
--
-- Design rule: PostgreSQL stores ONLY image URLs. Every image lives in
-- Supabase Storage. Writes are scoped by the owner's auth.uid() as the first
-- path segment; reads are public; admins can manage any object.

do $$
declare
  b text;
begin
  -- idempotently (re)create the managed buckets as public, owner-scoped.
  foreach b in array
    array[
      'business-logos',
      'business-covers',
      'business-gallery',
      'user-avatars',
      'category-images'
    ]
  loop
    insert into storage.buckets (id, name, public)
    values (b, b, true)
    on conflict (id) do nothing;

    -- Public read of all objects (public accessibility is desired for commerce).
    execute format(
      'create policy %I on storage.objects for select using (bucket_id = %L)',
      b || '_public_read', b
    );

    -- Only the authenticated owner whose id matches the FIRST path segment
    -- may write (insert/update/delete) inside their own folder.
    execute format(
      'create policy %I on storage.objects for insert with check ' ||
      '(bucket_id = %L and (select auth.uid()::text) = (storage.foldername(name))[1])',
      b || '_owner_insert', b
    );
    execute format(
      'create policy %I on storage.objects for update using ' ||
      '(bucket_id = %L and (select auth.uid()::text) = (storage.foldername(name))[1])',
      b || '_owner_update', b
    );
    execute format(
      'create policy %I on storage.objects for delete using ' ||
      '(bucket_id = %L and (select auth.uid()::text) = (storage.foldername(name))[1])',
      b || '_owner_delete', b
    );

    -- Admins can manage any object in these buckets (site curation).
    execute format(
      'create policy %I on storage.objects for all using (public.is_admin() and bucket_id = %L)',
      b || '_admin_all', b
    );
  end loop;
end $$;

-- ==========================================================================
-- Database: only image URLs, never binary/BLOB/Base64.
-- ==========================================================================

-- User avatars (user-avatars bucket).
alter table public.profiles
  add column if not exists avatar_url text;

-- Category imagery (category-images bucket). The existing `categories.icon`
-- holds a lucide icon *name* (e.g. 'zap'); `image_url` stores an actual image.
alter table public.categories
  add column if not exists image_url text;

-- Ensure the app-level link functions that the RLS policies rely on exist.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not banned
  );
$$;