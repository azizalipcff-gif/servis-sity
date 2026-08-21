-- =====================================================================
-- 0034 — Messenger upgrade: performance + integrity
--
-- 1) Index for user-scoped membership lookups (list, unread, dedupe).
-- 2) RPC messenger_unread_counts(): per-conversation unread in ONE query
--    (replaces the N+1 count loop in /api/messenger/unread and
--    lib/messenger.getUnreadCounts).
-- 3) RPC messenger_latest_messages(): latest message per conversation via
--    DISTINCT ON (replaces pulling 500 recent rows and reducing in JS).
-- 4) At most one business conversation per business.
-- 5) DB-level guard against duplicate private conversations per member
--    pair, even under concurrent create attempts (advisory lock).
-- =====================================================================

-- 1 -------------------------------------------------------------------
create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

-- 2 -------------------------------------------------------------------
-- One row per active membership of the caller with the count of incoming,
-- non-deleted messages newer than last_read_at. SECURITY DEFINER so the
-- whole computation is a single scan; output is still constrained to the
-- caller's own memberships via auth.uid().
create or replace function public.messenger_unread_counts()
returns table (conversation_id uuid, unread bigint)
language sql
security definer
set search_path = public
stable
as $$
  select cm.conversation_id,
         count(m.id) filter (
           where m.sender_id <> auth.uid()
             and m.deleted_at is null
         ) as unread
  from public.conversation_members cm
  left join public.messages m
    on m.conversation_id = cm.conversation_id
   and m.created_at > cm.last_read_at
  where cm.user_id = auth.uid()
    and cm.archived_at is null
  group by cm.conversation_id;
$$;

grant execute on function public.messenger_unread_counts() to authenticated;

-- 3 -------------------------------------------------------------------
create or replace function public.messenger_latest_messages()
returns setof public.messages
language sql
security definer
set search_path = public
stable
as $$
  select distinct on (m.conversation_id) m.*
  from public.messages m
  join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
  where cm.user_id = auth.uid()
    and cm.archived_at is null
  order by m.conversation_id, m.created_at desc, m.id desc;
$$;

grant execute on function public.messenger_latest_messages() to authenticated;

-- 4 -------------------------------------------------------------------
create unique index if not exists conversations_business_unique
  on public.conversations (business_id)
  where type = 'business' and business_id is not null;

-- 5 -------------------------------------------------------------------
-- Prevent two private conversations between the same pair of users even
-- when two create requests race. Runs as definer so the pair-existence
-- check bypasses RLS; raises a catchable error that the API layer maps to
-- "reuse the existing conversation".
create or replace function public.prevent_duplicate_private_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_other uuid;
  v_existing uuid;
begin
  select c.type into v_type from public.conversations c where c.id = new.conversation_id;
  if v_type is distinct from 'private' then
    return new;
  end if;

  -- The peer row is the second membership inserted; the creator row sees no
  -- other member yet and passes through.
  select cm.user_id into v_other
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.user_id
  limit 1;

  if v_other is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    ('x' || md5(least(new.user_id::text, v_other::text)
                || greatest(new.user_id::text, v_other::text)))::bit(64)::bigint
  );

  select c.id into v_existing
  from public.conversations c
  join public.conversation_members a
    on a.conversation_id = c.id and a.user_id = least(new.user_id, v_other)
  join public.conversation_members b
    on b.conversation_id = c.id and b.user_id = greatest(new.user_id, v_other)
  where c.type = 'private'
    and c.id <> new.conversation_id
  limit 1;

  if v_existing is not null then
    raise exception 'DUPLICATE_PRIVATE_CONVERSATION %', v_existing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_duplicate_private_conversation on public.conversation_members;
create trigger trg_prevent_duplicate_private_conversation
  before insert on public.conversation_members
  for each row execute function public.prevent_duplicate_private_conversation();
