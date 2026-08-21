-- =====================================================================
-- 0037 - Add notifications to the Realtime publication
--
-- The notification bell's live subscription
-- (postgres_changes INSERT ... table notifications, filter recipient_id)
-- silently receives nothing when the table is not a member of the
-- supabase_realtime publication. Observed live: Realtime replies
-- "Unable to subscribe to changes ... table: notifications".
--
-- Idempotent: duplicate_object is swallowed when already a member.
-- =====================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notifications;
    exception
      when duplicate_object then null;
      when undefined_table then null;
    end;
  end if;
end
$$;
