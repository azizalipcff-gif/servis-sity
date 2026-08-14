-- Service City — Phase 1 final hardening: RLS / RBAC production security.
-- Run after 0019_search_quality.sql.
--
-- Closes the remaining database-level attack paths found in the Phase 1 audit:
--   • owner_id reassignment on businesses          (Attack 2)
--   • business_id reassignment on owned resources  (Attack 3, belt & braces)
--   • self-review / review of non-approved business + review tampering via replies
--   • booking INSERT spamming on hidden/draft businesses + status self-set
--   • non-admin self-grant of premium/paid/featured states (subscriptions,
--     payments, invoices)                          (Attack 7)
--   • messenger cross-conversation writes (reads/reactions/typing/message-moves)
--   • private 1:1 conversation membership expansion by the creator
--   • notify_recipient() security-definer abuse (spam/impersonate)
--   • audit_logs forging by anonymous sessions
--   • admin role escalation on profiles (keeps the legitimate client→owner flow)
--   • is_admin() now also excludes suspended users
--   • explicit WITH CHECK on products updates (defensive clarity)
--
-- All changes are additive/idempotent: `drop policy if exists` + `create policy`,
-- `create or replace function`, `drop trigger if exists`. No data is touched.

-- ============================================================================
-- 1. is_admin(): also exclude suspended users (banned already handled).
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not banned and not suspended
  );
$$;

-- ============================================================================
-- 2. Businesses: a non-admin may never change owner_id (or the row identity).
--    Closes Attack 2 (user A -> owner_id = user B) and id re-identification.
-- ============================================================================
create or replace function public.protect_business_ownership()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'only admin can change business owner_id';
  end if;
  if new.id is distinct from old.id then
    raise exception 'business id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_business_ownership_trigger on public.businesses;
create trigger protect_business_ownership_trigger
  before update on public.businesses
  for each row execute procedure public.protect_business_ownership();

-- ============================================================================
-- 3. Reviews:
--    • INSERT: only authenticated users, only for APPROVED businesses, and
--              never against a business the reviewer owns (no self-review).
--              Duplicate-review protection (UNIQUE business_id,user_id) is kept.
--    • UPDATE (reply): owner/admin must not be able to rewrite reviewer
--              ownership, rating, comment, or business — only `reply` may move.
-- ============================================================================
drop policy if exists "reviews_insert_authenticated" on public.reviews;
create policy "reviews_insert_authenticated" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.status = 'approved'
        and b.owner_id <> auth.uid()
    )
  );

create or replace function public.protect_review_integrity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  disallowed text := '';
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    disallowed := disallowed || 'user_id,';
  end if;
  if new.business_id is distinct from old.business_id then
    disallowed := disallowed || 'business_id,';
  end if;
  if new.rating is distinct from old.rating then
    disallowed := disallowed || 'rating,';
  end if;
  if new.comment is distinct from old.comment then
    disallowed := disallowed || 'comment,';
  end if;
  if disallowed <> '' then
    raise exception 'cannot modify review fields (%) as reviewer or owner', disallowed;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_review_integrity_trigger on public.reviews;
create trigger protect_review_integrity_trigger
  before update on public.reviews
  for each row execute procedure public.protect_review_integrity();

-- ============================================================================
-- 4. Bookings: INSERT stays public (walk-in clients) but only for APPROVED
--    businesses, forcing an initial status of `pending`, and never linking the
--    booking to an arbitrary authenticated user (customer_id is self only).
-- ============================================================================
drop policy if exists "bookings_insert_public" on public.bookings;
create policy "bookings_insert_public" on public.bookings
  for insert with check (
    status = 'pending'
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status = 'approved'
    )
    and (customer_id is null or customer_id = auth.uid())
  );

-- ============================================================================
-- 5. Products: explicit WITH CHECK on UPDATE so a new business_id must also be
--    the caller's (or admin's). Defensive clarity over the RLS default.
-- ============================================================================
drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner" on public.products
  for update using (public.is_owner_or_admin(business_id))
  with check (public.is_owner_or_admin(business_id));

-- ============================================================================
-- 6. Subscriptions: non-admin owners may manage ONLY the self-service fields
--    (status toggles active<->paused, auto_renew, cancel_at, paused_at). Every
--    billing/entitlement field (plan_key, plan, interval, lifetime, dates,
--    customer/provider identity, metadata) is admin-only.
--    The billing routes call this with the ADMIN session (is_admin()), while the
--    owner PATCH (cancel/pause/resume) writes exactly the allowed self-service
--    set — so both existing flows keep working and Attack 7 stays closed.
-- ============================================================================
create or replace function public.protect_subscription_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.plan_key is distinct from old.plan_key
     or new.plan is distinct from old.plan
     or new.interval is distinct from old.interval
     or new.lifetime is distinct from old.lifetime
     or new.started_at is distinct from old.started_at
     or new.expires_at is distinct from old.expires_at
     or new.next_billing_at is distinct from old.next_billing_at
     or new.trial_end_at is distinct from old.trial_end_at
     or new.customer_email is distinct from old.customer_email
     or new.provider is distinct from old.provider
     or new.provider_subscription_id is distinct from old.provider_subscription_id
     or new.metadata is distinct from old.metadata
     or new.cancelled_at is distinct from old.cancelled_at then
    raise exception 'only admin can change subscription billing fields';
  end if;
  -- Owner may pause/resume (active <-> paused) but must not resurrect a
  -- cancelled/superseded/billing-blocked subscription to reclaim entitlements.
  if new.status is distinct from old.status
     and (old.status not in ('active', 'paused') or new.status not in ('active', 'paused')) then
    raise exception 'only admin can change subscription status';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_subscription_fields_trigger on public.subscriptions;
create trigger protect_subscription_fields_trigger
  before update on public.subscriptions
  for each row execute procedure public.protect_subscription_fields();

-- INSERT path: a non-admin can only ever create the record the billing server
-- creates; enforce consumer-safe shape directly on insert too.
drop policy if exists "subscriptions_insert_owner" on public.subscriptions;
create policy "subscriptions_insert_owner" on public.subscriptions
  for insert with check (
    public.is_owner_or_admin(business_id)
    and (
      public.is_admin()
      or (status in ('free', 'cancelled', 'paused') and plan = 'free')
    )
  );

-- ============================================================================
-- 7. Payments / invoices / transactions / refunds.
--    • payments.business_id is immutable for non-admins on UPDATE (prevents
--      pointing an own payment at an arbitrary business to have an admin grant
--      it a plan). payments.status stays user-mirrorable BY DESIGN: checkout
--      (processing) and verify (succeeded) write gateway state from the user's
--      session, and entitlements are only granted by the admin confirm step.
--    • invoices/refunds/transactions: success states (paid/succeeded/completed
--      /…) are admin-only, both when created (INSERT) and when reached via an
--      UPDATE. The admin confirm/refund flows run with the admin session and
--      are exempt via is_admin().
-- ============================================================================
create or replace function public.protect_financial_status_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'payments' then
    if tg_op = 'UPDATE' and new.business_id is distinct from old.business_id then
      raise exception 'payment business_id is immutable';
    end if;
    return new;
  end if;

  if new.status in ('succeeded', 'processing', 'paid', 'refunded', 'partial_refunded', 'completed') then
    if tg_op = 'UPDATE' then
      if old.status is distinct from new.status then
        raise exception 'only admin can set financial success states';
      end if;
    else
      raise exception 'only admin can create financial success-state records';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_payments_fields_trigger on public.payments;
create trigger protect_payments_fields_trigger
  before insert or update on public.payments
  for each row execute procedure public.protect_financial_status_fields();

drop trigger if exists protect_invoices_fields_trigger on public.invoices;
create trigger protect_invoices_fields_trigger
  before insert or update on public.invoices
  for each row execute procedure public.protect_financial_status_fields();

drop trigger if exists protect_refunds_fields_trigger on public.refunds;
create trigger protect_refunds_fields_trigger
  before insert or update on public.refunds
  for each row execute procedure public.protect_financial_status_fields();

drop trigger if exists protect_transactions_fields_trigger on public.transactions;
create trigger protect_transactions_fields_trigger
  before insert or update on public.transactions
  for each row execute procedure public.protect_financial_status_fields();

-- Payments INSERT: non-admin must create only self rows in pending/failed state.
drop policy if exists "payments_insert_owner" on public.payments;
create policy "payments_insert_owner" on public.payments
  for insert with check (
    public.is_admin()
    or (user_id = auth.uid() and status in ('pending', 'failed', 'cancelled'))
  );

-- Invoices INSERT: non-admin can create only own, un-paid invoices.
drop policy if exists "invoices_insert_user" on public.invoices;
create policy "invoices_insert_user" on public.invoices
  for insert with check (
    public.is_admin()
    or (user_id = auth.uid() and status in ('draft', 'issued'))
  );

-- ============================================================================
-- 8. Messenger: reads/reactions/typing must be limited to conversation members.
--    Messages may not be moved into a conversation the sender is not a member of.
-- ============================================================================
drop policy if exists "reads_insert_own" on public.message_reads;
create policy "reads_insert_own" on public.message_reads
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "reads_update_own" on public.message_reads;
create policy "reads_update_own" on public.message_reads
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "reactions_insert_own" on public.message_reactions;
create policy "reactions_insert_own" on public.message_reactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "reactions_delete_own" on public.message_reactions;
create policy "reactions_delete_own" on public.message_reactions
  for delete using (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_conversation_member(m.conversation_id)
    )
  );

drop policy if exists "typing_update_own" on public.typing_status;
create policy "typing_update_own" on public.typing_status
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid() and public.is_conversation_member(conversation_id)
  );

drop policy if exists "typing_delete_own" on public.typing_status;
create policy "typing_delete_own" on public.typing_status
  for delete using (
    user_id = auth.uid() and public.is_conversation_member(conversation_id)
  );

-- Sender may edit their own message but cannot move it between conversations
-- or re-attribute it (a message belongs to its conversation for life).
create or replace function public.protect_message_integrity()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.conversation_id is distinct from old.conversation_id then
    raise exception 'message conversation_id is immutable';
  end if;
  if new.sender_id is distinct from old.sender_id then
    raise exception 'message sender_id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_message_integrity_trigger on public.messages;
create trigger protect_message_integrity_trigger
  before update on public.messages
  for each row execute procedure public.protect_message_integrity();

-- ============================================================================
-- 9. Conversations: anyone may now self-join a conversation ONLY when they are
--    its creator (the 1:1/business creation flow inserts the creator, then the
--    creator adds the peer). A non-participant can no longer insert themselves
--    into a conversation they know the id of. Creator-add keeps working for
--    both private and business conversations.
-- ============================================================================
drop policy if exists "members_insert_own" on public.conversation_members;
create policy "members_insert_own" on public.conversation_members
  for insert with check (
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.created_by = auth.uid()
      )
    )
    or public.is_admin()
    or (
      public.is_conversation_member(conversation_id)
      and exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.created_by = auth.uid()
      )
    )
  );

-- ============================================================================
-- 10. notify_recipient(): security-definer RPC must not let non-admins
--     fabricate notifications addressed to arbitrary users (spam/impersonation).
-- ============================================================================
create or replace function public.notify_recipient(
  p_recipient uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_link text default null,
  p_category text default 'general'
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() <> p_recipient and not public.is_admin() then
    raise exception 'cannot create notifications for another user';
  end if;
  insert into public.notifications (recipient_id, type, category, title, body, link, read_at)
  values (p_recipient, p_type, p_category, p_title, p_body, p_link, null)
  on conflict do nothing;
end;
$$;

-- ============================================================================
-- 11. Verification requests: owner-created rows must start in `pending` with no
--     admin-note/review data smuggled in on the INSERT path. The owner's own
--     `notes` column stays writable (owner-submitted context).
-- ============================================================================
create or replace function public.protect_verification_request_fields()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.status := 'pending'::public.verification_status;
  new.admin_note := null;
  new.reviewed_at := null;
  return new;
end;
$$;

drop trigger if exists protect_verification_request_fields_trigger on public.verification_requests;
create trigger protect_verification_request_fields_trigger
  before insert on public.verification_requests
  for each row execute procedure public.protect_verification_request_fields();

-- ============================================================================
-- 12. Audit log integrity: an anonymous session must not be able to forge
--     audit rows. Insert requires the caller to BE the recorded actor
--     (admin-session actions pass; anonymous is denied).
-- ============================================================================
drop policy if exists "audit_logs_insert_any" on public.audit_logs;
create policy "audit_logs_insert_actor" on public.audit_logs
  for insert with check (auth.uid() is not null and actor_id = auth.uid());

-- ============================================================================
-- 13. Profiles: role escalation is impossible (self-grant of `admin`), while the
--     legitimate signup flow that self-asserts the `owner` role keeps working.
--     The previous guard rejected ANY non-admin role change, silently breaking
--     owner registration (register-form.tsx writes role='owner' on signup).
-- ============================================================================
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'client'::public.user_role;
    return new;
  end if;

  -- Non-admins may toggle between client/owner but can never obtain or strip
  -- the admin role. This keeps Attack 1 (normal user -> role = admin) closed
  -- while preserving the documented owner self-assertion flow.
  if old.role = 'admin' or new.role = 'admin' then
    raise exception 'only admin can change admin role';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- ============================================================================
-- 14. Reports: non-admin insert must open a report, never pre-resolve it.
-- ============================================================================
drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated" on public.reports
  for insert with check (auth.uid() = reporter_id and status = 'open');