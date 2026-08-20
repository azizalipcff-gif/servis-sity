-- 0033_storage_upload_guard.sql
-- SECURITY-ONLY: enforce upload SIZE (+ MIME allow-list where the app already
-- restricts MIME) at the Storage service level. No business logic changes.
--
-- Background
-- ----------
-- Storage writes from the browser go DIRECTLY to Supabase Storage (messenger
-- attachments, business media, user avatars, verification docs). The storage
-- RLS policies correctly scope writes to the caller's own first path segment,
-- but nothing server-side constrains OBJECT SIZE or CONTENT TYPE — the only
-- caps live in client JavaScript (components/messenger/upload.ts,
-- lib/uploads/config.ts, lib/verification/docs.ts) and are trivially bypassed
-- with any HTTP client.
--
-- Proof (live, sandbox account):
--   * a fresh account uploaded a 32 MB object with CONTENT-TYPE
--     "application/x-hostile" into the public `attachments` bucket; it was
--     accepted and served from a public URL (the app caps files at 25 MB);
--   * the same account uploaded a 12 MB object into `business-gallery` whose
--     app-side config caps uploads at 6 MB; accepted.
--
-- Any authenticated user could therefore write unlimited objects of unlimited
-- size into public buckets: storage cost abuse / quota exhaustion DoS for the
-- whole marketplace, plus storage-as-free-hosting of arbitrary content.
--
-- Fix
-- ----
-- Bucket-level `file_size_limit` and `allowed_mime_types` are enforced HARD by
-- the Storage service at upload time (413/415 for oversized/disallowed
-- objects), independent of any client code. Caps are set ABOVE the app's legit
-- ceilings (with headroom) so no working upload flow is affected:
--
--   bucket                    app ceiling            server cap
--   attachments               25 MB files / 10 MB   26 MB   (any mime preserved)
--   business-logos            3 MB                   4 MB    (images only)
--   business-covers           6 MB                   8 MB    (images only)
--   business-gallery          6 MB                   8 MB    (images only)
--   user-avatars              2 MB                   3 MB    (images only)
--   category-images           4 MB                   6 MB    (images only)
--   business-media            n/a                    8 MB    (images only)
--   verification-documents   5 MB / pdf,png,jpg      5 MB    (allowed mime list)
--
-- `attachments` intentionally keeps NO mime allow-list: messenger is an
-- arbitrary file exchange (docs, sheets, archives, audio), so configuring a
-- mime allow-list would break business functionality. Its size cap alone still
-- closes the proven abuse path.
--
-- Reversible: run `update storage.buckets set file_size_limit = null,
-- allowed_mime_types = null where id = '<bucket>';` to restore the pre-fix
-- state. No tables, rows, policies or function changes; existing objects are
-- untouched.
-- ==========================================================================

update storage.buckets
set file_size_limit = 26 * 1024 * 1024
where id = 'attachments';

update storage.buckets
set file_size_limit = 4 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'business-logos';

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'business-covers';

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'business-gallery';

update storage.buckets
set file_size_limit = 3 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'user-avatars';

update storage.buckets
set file_size_limit = 6 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'category-images';

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'business-media';

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
where id = 'verification-documents';