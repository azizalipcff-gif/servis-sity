-- =====================================================================
-- 0035 - Messenger participants RPC (fixes peer names/avatars)
--
-- Problem
-- -------
-- profiles SELECT RLS is intentionally strict ("profiles_select_own":
-- id = auth.uid() or is_admin()). Any server-side query running with the
-- USER'S JWT therefore cannot embed other members' profiles
-- (`conversation_members.profiles:user_id(...)` comes back null for peers),
-- so private conversations render the generic "Conversation" title with no
-- avatar. Dropping that policy is not an option: it would expose every
-- profile to every authenticated user.
--
-- Fix
-- --
-- Expose exactly what the messenger UI needs through a SECURITY DEFINER
-- function whose body re-checks that the CALLER is a member of each
-- requested conversation. Members see their conversations' participants;
-- nobody else sees anything.
--
-- =====================================================================

create or replace function public.messenger_participants(conversation_ids uuid[])
returns table (
  conversation_id uuid,
  user_id uuid,
  last_read_at timestamptz,
  full_name text,
  username text,
  avatar_url text,
  city text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cm.conversation_id,
    cm.user_id,
    cm.last_read_at,
    p.full_name,
    p.username,
    p.avatar_url,
    p.city
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = any (conversation_ids)
    and exists (
      select 1 from public.conversation_members me
      where me.conversation_id = cm.conversation_id
        and me.user_id = auth.uid()
    );
$$;

comment on function public.messenger_participants(uuid[]) is
  'Messenger: participant profiles for conversations the caller belongs to.';

grant execute on function public.messenger_participants(uuid[]) to authenticated;
