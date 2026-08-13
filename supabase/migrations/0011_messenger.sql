-- Service City — Phase K: professional realtime messenger.
-- Run after 0010_follows_bookings.sql.
--
-- Conversations / members / messages / attachments / reads / reactions /
-- reports / blocked users / typing presence, with RLS + Realtime publication.

-- ==========================================================================
-- Conversations
-- ==========================================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'private' check (type in ('private', 'business')),
  business_id uuid references public.businesses(id) on delete set null,
  title text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_updated_idx
  on public.conversations (updated_at desc);

-- ==========================================================================
-- Conversation members (per-member archive / pin / mute / read state)
-- ==========================================================================
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  pinned_at timestamptz,
  muted_until timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ==========================================================================
-- Messages (soft delete via deleted_at)
-- ==========================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  type text not null default 'text' check (type in ('text','image','file','voice','emoji')),
  body text not null default '',
  attachment_url text,
  reply_to uuid references public.messages(id),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_idx
  on public.messages (sender_id);

-- ==========================================================================
-- Attachments (URLs only; files live in Storage)
-- ==========================================================================
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  kind text not null default 'image'
    check (kind in ('image','pdf','doc','sheet','zip','audio','voice')),
  url text not null,
  name text,
  size bigint not null default 0,
  mime text,
  width integer,
  height integer,
  duration numeric,
  created_at timestamptz not null default now()
);

create index if not exists message_attachments_conv_idx
  on public.message_attachments (conversation_id);

-- ==========================================================================
-- Reads / Reactions / Reports / Blocked / Typing
-- ==========================================================================
create table if not exists public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id),
  reason text,
  status text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_users (
  user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);

create table if not exists public.typing_status (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- ==========================================================================
-- Membership helper + ordering bump trigger
-- ==========================================================================
create or replace function public.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = cid and m.user_id = auth.uid()
  );
$$;

create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists bump_conversation_trigger on public.messages;
create trigger bump_conversation_trigger
  after insert on public.messages
  for each row execute procedure public.bump_conversation();

-- ==========================================================================
-- RLS
-- ==========================================================================
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reads enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.typing_status enable row level security;

-- conversations
create policy "conversations_select_member" on public.conversations
  for select using (public.is_conversation_member(id));
create policy "conversations_insert_creator" on public.conversations
  for insert with check (created_by = auth.uid() or public.is_admin());

-- members
create policy "members_select_own" on public.conversation_members
  for select using (user_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy "members_insert_own" on public.conversation_members
  for insert with check (
    user_id = auth.uid()
    or public.is_admin()
    or (
      public.is_conversation_member(conversation_id)
      and (select created_by from public.conversations where id = conversation_id) = auth.uid()
    )
  );
create policy "members_update_own" on public.conversation_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "members_delete_own" on public.conversation_members
  for delete using (user_id = auth.uid());

-- messages
create policy "messages_select_member" on public.messages
  for select using (public.is_conversation_member(conversation_id));
create policy "messages_insert_member" on public.messages
  for insert with check (
    public.is_conversation_member(conversation_id) and sender_id = auth.uid()
  );
create policy "messages_update_owner" on public.messages
  for update using (sender_id = auth.uid() or public.is_admin())
  with check (sender_id = auth.uid() or public.is_admin());

-- attachments
create policy "attachments_select_member" on public.message_attachments
  for select using (public.is_conversation_member(conversation_id));
create policy "attachments_insert_member" on public.message_attachments
  for insert with check (public.is_conversation_member(conversation_id));
create policy "attachments_delete_admin" on public.message_attachments
  for delete using (public.is_admin());

-- reads
create policy "reads_select_member" on public.message_reads
  for select using (public.is_conversation_member(
    (select m.conversation_id from public.messages m where m.id = message_id)
  ));
create policy "reads_insert_own" on public.message_reads
  for insert with check (user_id = auth.uid());
create policy "reads_update_own" on public.message_reads
  for update using (user_id = auth.uid());

-- reactions
create policy "reactions_select_member" on public.message_reactions
  for select using (public.is_conversation_member(
    (select m.conversation_id from public.messages m where m.id = message_id)
  ));
create policy "reactions_insert_own" on public.message_reactions
  for insert with check (user_id = auth.uid());
create policy "reactions_delete_own" on public.message_reactions
  for delete using (user_id = auth.uid());

-- reports
create policy "reports_insert_own" on public.message_reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_admin" on public.message_reports
  for select using (public.is_admin());

-- blocked
create policy "blocked_select_own" on public.blocked_users
  for select using (user_id = auth.uid() or blocked_user_id = auth.uid());
create policy "blocked_insert_own" on public.blocked_users
  for insert with check (user_id = auth.uid());
create policy "blocked_delete_own" on public.blocked_users
  for delete using (user_id = auth.uid());

-- typing
create policy "typing_select_member" on public.typing_status
  for select using (public.is_conversation_member(conversation_id));
create policy "typing_upsert_own" on public.typing_status
  for insert with check (user_id = auth.uid() and public.is_conversation_member(conversation_id));
create policy "typing_update_own" on public.typing_status
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "typing_delete_own" on public.typing_status
  for delete using (user_id = auth.uid());

-- ==========================================================================
-- Storage bucket for attachments (public read, owner-scoped writes)
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments_bucket_public_read" on storage.objects
  for select using (bucket_id = 'attachments');
create policy "attachments_bucket_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments' and (select auth.uid()::text) = (storage.foldername(name))[1]
  );
create policy "attachments_bucket_owner_update" on storage.objects
  for update using (
    bucket_id = 'attachments' and (select auth.uid()::text) = (storage.foldername(name))[1]
  );
create policy "attachments_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments' and (select auth.uid()::text) = (storage.foldername(name))[1]
  );
create policy "attachments_bucket_admin_all" on storage.objects
  for all using (public.is_admin() and bucket_id = 'attachments');

-- ==========================================================================
-- Realtime: publish messenger tables
-- ==========================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.conversation_members;
    alter publication supabase_realtime add table public.typing_status;
    alter publication supabase_realtime add table public.message_reads;
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;