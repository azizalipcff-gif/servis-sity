-- Service City — 0022: remove redundant permissive storage INSERT policies.
--
-- Verified live: the five "Public upload *" policies
--   for insert with check (bucket_id = '<bucket>')  -- roles: authenticated
-- are OR-ed with the existing 0005 owner-folder policies
--   <bucket>_owner_insert with check (bucket_id = '<bucket>'
--     and (select auth.uid()::text) = (storage.foldername(name))[1])
-- Because RLS policies are disjunctive (OR), the redundant bucket_id-only
-- policies let ANY authenticated user INSERT an object at ANY path inside
-- those buckets, bypassing the owner-folder enforcement the app relies on
-- (uploads are always `{ownerId}/{folder}/{file}` — lib/uploads, messenger).
--
-- The "Public upload *" policies exist only in the live database (they are not
-- declared in any repo migration). Dropping them restores owner-folder
-- enforcement on INSERT. Reads (public), admin ALL, and owner
-- update/delete/insert policies remain untouched, and no app upload path
-- changes: every upload already passes through <bucket>_owner_insert.
drop policy if exists "Public upload avatars" on storage.objects;
drop policy if exists "Public upload business logos" on storage.objects;
drop policy if exists "Public upload category images" on storage.objects;
drop policy if exists "Public upload covers" on storage.objects;
drop policy if exists "Public upload gallery" on storage.objects;