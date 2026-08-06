-- Servis Sity — Phase 1: storage bucket + policies for business media uploads
-- Run after 0001_initial.sql in the Supabase SQL editor.

-- Publicly readable bucket, files stored under {owner_user_id}/{file}
insert into storage.buckets (id, name, public)
values ('business-media', 'business-media', true)
on conflict (id) do nothing;

create policy "business_media_public_read" on storage.objects
  for select using (bucket_id = 'business-media');

create policy "business_media_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "business_media_owner_update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );

create policy "business_media_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and (select auth.uid()::text) = (storage.foldername(name))[1]
  );
