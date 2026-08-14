-- Service City — 0021: messenger membership regression fix.
--
-- Root cause (verified live, repro10 conv_by_me=0): the 0020 members_insert_own
-- policy approved a creator's self-join only if
--   exists(select 1 from public.conversations c
--          where c.id = conversation_id and c.created_by = auth.uid())
-- but `conversations` has RLS enabled with `conversations_select_member`
-- (= is_conversation_member(id)). RLS therefore filters that subquery, and a
-- creator inserting their FIRST membership row is not yet a member, so the row
-- is invisible and EXISTS returns false — the self-join is rejected with 42501
-- and the app flow (getOrCreateConversation: insert creator, then peer) breaks.
--
-- Fix: check "is the current user the conversation creator" through a
-- SECURITY DEFINER helper (matching the existing is_conversation_member
-- pattern), so the created_by check is not shadowed by the conversations
-- SELECT policy. Security model is unchanged:
--   * creator may insert themselves (self-join) — regression fixed;
--   * creator (already a member) may add the peer / anyone — creator-add kept;
--   * a non-participant cannot self-join a conversation they only know the id
--     of (is_conversation_creator is false);
--   * non-creator members cannot add arbitrary users (requires creator);
--   * admins keep is_admin() powers.

-- ============================================================================
-- 1. SECURITY DEFINER helper: bypasses the conversations SELECT policy to test
--    created_by = auth.uid() directly (same pattern/locking as
--    is_conversation_member; owner is the migration role = table owner, so RLS
--    is bypassed inside the function body without FORCE row security).
-- ============================================================================
create or replace function public.is_conversation_creator(cid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid and c.created_by = auth.uid()
  );
$$;

-- ============================================================================
-- 2. Replace the broken members_insert_own (0020 §9) with the helper-backed
--    version. Drops first so re-running the migration is idempotent.
-- ============================================================================
drop policy if exists "members_insert_own" on public.conversation_members;
create policy "members_insert_own" on public.conversation_members
  for insert with check (
    (
      user_id = auth.uid()
      and public.is_conversation_creator(conversation_id)
    )
    or public.is_admin()
    or (
      public.is_conversation_member(conversation_id)
      and public.is_conversation_creator(conversation_id)
    )
  );