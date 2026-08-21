-- =====================================================================
-- 0038 - Skew-proof read markers
--
-- Problem
-- -------
-- Read receipts compare conversation_members.last_read_at against
-- messages.created_at. created_at defaults to the DATABASE clock (now()),
-- but the API wrote last_read_at from the APP SERVER's wall clock
-- (new Date()). Any clock skew between the two machines makes a fresh
-- read look OLDER than the messages it covers, so peers never see the
-- blue double-check even though the read was recorded.
--
-- Fix
-- ---
-- Write last_read_at with the database's own clock via a SECURITY DEFINER
-- function restricted to the caller's own membership row.
-- =====================================================================

create or replace function public.messenger_mark_read(p_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_members cm
  set last_read_at = now()
  where cm.conversation_id = p_conversation_id
    and cm.user_id = auth.uid();
$$;

comment on function public.messenger_mark_read(uuid) is
  'Messenger: set the caller''s last_read_at using the database clock, immune to app-server clock skew.';

grant execute on function public.messenger_mark_read(uuid) to authenticated;
