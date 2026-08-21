-- =====================================================================
-- 0036 - Messenger realtime delivery repair
--
-- Symptom: postgres_changes subscriptions for messages / typing_status /
-- conversation_members / message_reactions deliver nothing (or miss UPDATE
-- events) even though writes succeed and presence works.
--
-- Two independent causes, both repaired here:
--
-- 1) Publication membership. Realtime only ships WAL rows for tables in the
--    supabase_realtime publication. 0011 adds them conditionally; databases
--    provisioned before that publication existed (or restored without it)
--    silently never deliver events.
--
-- 2) Replica identity. For UPDATE/DELETE events Realtime re-checks the
--    channel's RLS filter against the OLD row image. With the default
--    (primary-key-only) identity the old image lacks conversation_id /
--    message_id, so subscriptions filtered by those columns fail
--    authorization and the event is dropped. REPLICA IDENTITY FULL ships
--    the complete old row.
--
-- Both steps are idempotent.
-- =====================================================================

-- 1) publication membership -------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'messages',
      'conversation_members',
      'typing_status',
      'message_reads',
      'message_reactions',
      'notifications'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception
        when duplicate_object then
          null; -- already a member
        when undefined_table then
          null; -- table absent in this environment
      end;
    end loop;
  end if;
end
$$;

-- 2) replica identity -------------------------------------------------------
alter table public.messages             replica identity full;
alter table public.conversation_members replica identity full;
alter table public.typing_status        replica identity full;
alter table public.message_reads        replica identity full;
alter table public.message_reactions    replica identity full;
