-- Service City — Phase L: Payments & Premium Subscription / Billing / Featured.
-- Run after 0011_messenger.sql.

-- ===========================================================================
-- plan_type: extend to the 3 tiers (+ lifetime handled via interval)
-- ===========================================================================
do $$ begin
  alter type public.plan_type add value if not exists 'enterprise';
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- plans (price catalogue: plan key x interval)
-- ===========================================================================
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null check (plan_key in ('free', 'premium', 'enterprise')),
  interval text not null check (interval in ('monthly', 'quarterly', 'yearly', 'lifetime')),
  name text not null,
  price_cents bigint not null default 0,
  currency text not null default 'MAD',
  trial_days integer not null default 0,
  sort_order integer not null default 0,
  active boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_key, interval)
);

create index if not exists plans_active_idx on public.plans (active, sort_order);

-- ===========================================================================
-- subscriptions (extend existing minimal table)
-- ===========================================================================
alter table public.subscriptions
  add column if not exists plan_key text,
  add column if not exists interval text not null default 'yearly',
  add column if not exists customer_email text,
  add column if not exists provider text,
  add column if not exists provider_subscription_id text,
  add column if not exists auto_renew boolean not null default true,
  add column if not exists next_billing_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists cancel_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists trial_end_at timestamptz,
  add column if not exists lifetime boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.subscriptions
  add constraint if not exists subscriptions_interval_check
  check (interval in ('monthly','quarterly','yearly','lifetime'));

-- keep exactly one live subscription per business
create or replace function public.enforce_single_active_subscription()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status in ('active','trialing') and new.cancelled_at is null then
    update public.subscriptions
      set status = 'superseded', cancelled_at = now()
      where business_id = new.business_id
        and id <> new.id
        and status in ('active','trialing')
        and cancelled_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_active_subscription_trigger on public.subscriptions;
create trigger enforce_single_active_subscription_trigger
  after insert or update of status, cancelled_at on public.subscriptions
  for each row execute procedure public.enforce_single_active_subscription();

-- ===========================================================================
-- Subscription history
-- ===========================================================================
create table if not exists public.subscription_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  action text not null
    check (action in ('create','renewed','upgraded','downgraded','cancelled','paused','resumed','expired','refunded')),
  plan_from text,
  plan_to text,
  interval text,
  period_start timestamptz,
  period_end timestamptz,
  amount_cents bigint not null default 0,
  currency text not null default 'MAD',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists subscription_history_sub_idx on public.subscription_history (subscription_id);
create index if not exists subscription_history_business_idx on public.subscription_history (business_id);

-- ===========================================================================
-- Payments / methods / attempts
-- ===========================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_id text,
  gateway_ref text,
  amount_cents bigint not null,
  currency text not null default 'MAD',
  status text not null default 'pending'
    check (status in ('pending','processing','succeeded','failed','cancelled','refunded','partial_refunded')),
  payment_method text,
  idempotency_key text,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_business_idx on public.payments (business_id);
create index if not exists payments_subscription_idx on public.payments (subscription_id);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_method_id text,
  type text not null default 'card',
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, provider, provider_method_id)
);

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null,
  attempt_no integer not null default 1,
  status text not null default 'pending',
  response jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Invoices + items
-- ===========================================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  business_id uuid not null references public.businesses(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  invoice_type text not null default 'subscription'
    check (invoice_type in ('subscription','verification','featured','credit')),
  status text not null default 'draft'
    check (status in ('draft','issued','paid','cancelled','refunded')),
  subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  total_cents bigint not null default 0,
  currency text not null default 'MAD',
  tax_rate numeric not null default 0,
  issued_at timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  pdf_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_idx on public.invoices (user_id, created_at desc);
create index if not exists invoices_business_idx on public.invoices (business_id);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  kind text not null default 'subscription',
  quantity integer not null default 1,
  unit_price_cents bigint not null default 0,
  amount_cents bigint not null default 0,
  tax_cents bigint not null default 0,
  sort_order integer not null default 0
);

create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- ===========================================================================
-- Coupons + usage
-- ===========================================================================
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percent','fixed')),
  value numeric not null,
  amount_total_cents bigint not null default 0,
  period text not null default 'one_time' check (period in ('one_time','recurring','forever')),
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_usage integer,
  per_user_limit integer not null default 1,
  applies_to text not null default 'any' check (applies_to in ('any','plans')),
  plans jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  total_discount_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

-- ===========================================================================
-- Transactions & refunds
-- ===========================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid not null references public.profiles(id),
  payment_id uuid references public.payments(id) on delete set null,
  refund_id uuid,
  type text not null check (type in ('payment','refund','chargeback','void')),
  amount_cents bigint not null,
  currency text not null default 'MAD',
  status text not null default 'completed',
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_idx on public.transactions (user_id, created_at desc);
create index if not exists transactions_business_idx on public.transactions (business_id);

create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_refund_id text,
  amount_cents bigint not null,
  currency text not null default 'MAD',
  reason text,
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','cancelled')),
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Featured placements
-- ===========================================================================
create table if not exists public.featured_businesses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  surface text not null default 'homepage'
    check (surface in ('homepage','category','search')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  priority integer not null default 0,
  status text not null default 'active'
    check (status in ('active','pending','revoked','expired','cancelled')),
  price_cents bigint not null default 0,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

create index if not exists featured_businesses_active_idx
  on public.featured_businesses (status, surface, priority desc);

create table if not exists public.featured_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  priority integer not null default 0,
  status text not null default 'active'
    check (status in ('active','pending','revoked','expired','cancelled')),
  price_cents bigint not null default 0,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

create table if not exists public.featured_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  priority integer not null default 0,
  status text not null default 'active'
    check (status in ('active','pending','revoked','expired','cancelled')),
  price_cents bigint not null default 0,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Verification requests (add missing doc columns)
-- ===========================================================================
alter table public.verification_requests
  add column if not exists license_url text,
  add column if not exists tax_document_url text,
  add column if not exists notes text,
  add column if not exists reviewed_at timestamptz;

-- ===========================================================================
-- RLS (rely on is_admin(), is_owner_or_admin() helpers)
-- ===========================================================================
alter table public.plans enable row level security;
alter table public.subscription_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.transactions enable row level security;
alter table public.refunds enable row level security;
alter table public.featured_businesses enable row level security;
alter table public.featured_products enable row level security;
alter table public.featured_services enable row level security;

-- plans
create policy "plans_select_public" on public.plans for select using (true);
create policy "plans_write_admin" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions (reuse existing owner/admin policies from 0001/0004 if present;
-- re-declare defensively)
create policy "subscriptions_select_owner" on public.subscriptions
  for select using (public.is_owner_or_admin(business_id));
create policy "subscriptions_insert_owner" on public.subscriptions
  for insert with check (public.is_owner_or_admin(business_id));
create policy "subscriptions_update_owner" on public.subscriptions
  for update using (public.is_owner_or_admin(business_id)) with check (public.is_owner_or_admin(business_id));

create policy "subhistory_select_owner" on public.subscription_history
  for select using (public.is_owner_or_admin(business_id) or public.is_admin());

create policy "payments_select_owner" on public.payments
  for select using (user_id = auth.uid() or public.is_owner_or_admin(business_id) or public.is_admin());
create policy "payments_insert_owner" on public.payments
  for insert with check (user_id = auth.uid());
create policy "payments_update_owner" on public.payments
  for update using (user_id = auth.uid() or public.is_admin());

create policy "pm_select_own" on public.payment_methods for select using (user_id = auth.uid());
create policy "pm_manage_own" on public.payment_methods
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "attempts_select_owner" on public.payment_attempts
  for select using (public.is_admin() or user_id = auth.uid());

create policy "invoices_select_owner" on public.invoices
  for select using (user_id = auth.uid() or public.is_owner_or_admin(business_id) or public.is_admin());
create policy "invoices_insert_user" on public.invoices
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "items_select_owner" on public.invoice_items
  for select using (
    public.is_admin() or (select public.is_owner_or_admin(i.business_id) from public.invoices i where i.id = invoice_id)
  );

create policy "coupons_select_all" on public.coupons for select using (true);
create policy "coupons_write_admin" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "cu_select_own" on public.coupon_usage for select using (user_id = auth.uid());
create policy "cu_insert_own" on public.coupon_usage for insert with check (user_id = auth.uid());

create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = auth.uid());

create policy "subhistory_insert_owner" on public.subscription_history
  for insert with check (public.is_owner_or_admin(business_id) or public.is_admin());

create policy "attempts_insert_owner" on public.payment_attempts
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid())
  );

create policy "items_insert_owner" on public.invoice_items
  for insert with check (
    public.is_admin()
    or (select public.is_owner_or_admin(i.business_id) from public.invoices i where i.id = invoice_id)
  );

create policy "refunds_insert_owner" on public.refunds
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.payments p where p.id = payment_id and p.user_id = auth.uid())
  );

create policy "transactions_select_owner" on public.transactions
  for select using (user_id = auth.uid() or public.is_owner_or_admin(business_id) or public.is_admin());

create policy "refunds_select_owner" on public.refunds for select using (user_id = auth.uid() or public.is_admin());
create policy "refunds_update_admin" on public.refunds for update using (public.is_admin());

create policy "featb_select_any" on public.featured_businesses for select using (true);
create policy "featb_admin_all" on public.featured_businesses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "featp_select_any" on public.featured_products for select using (true);
create policy "featp_admin_all" on public.featured_products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "feats_select_any" on public.featured_services for select using (true);
create policy "feats_admin_all" on public.featured_services
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Security-definer notifier (admin/billing → any user). Callable via rpc()
-- only from authenticated sessions; inserts are audited by auth.uid() of the
-- caller (admin-checked in the app layer).
-- ===========================================================================
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
  insert into public.notifications (recipient_id, type, category, title, body, link, read_at)
  values (p_recipient, p_type, p_category, p_title, p_body, p_link, null)
  on conflict do nothing;
end;
$$;

grant execute on function public.notify_recipient(uuid, text, text, text, text, text) to authenticated;

-- ===========================================================================
-- Updated-at triggers
-- ===========================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_touch on public.plans;
create trigger plans_touch before update on public.plans for each row execute procedure public.set_updated_at();

drop trigger if exists payments_touch on public.payments;
create trigger payments_touch before update on public.payments for each row execute procedure public.set_updated_at();

drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch before update on public.coupons for each row execute procedure public.set_updated_at();

drop trigger if exists subs_touch on public.subscriptions;
create trigger subs_touch before update on public.subscriptions for each row execute procedure public.set_updated_at();

-- ===========================================================================
-- Realtime (billing notifications)
-- ===========================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.payments;
    alter publication supabase_realtime add table public.subscriptions;
    alter publication supabase_realtime add table public.invoices;
  end if;
end $$;

-- ===========================================================================
-- Seed price catalogue (user-facing pricing uses these rows via API)
-- Prices are in dirham cents; admins can adjust via the plan admin UI.
-- ===========================================================================
insert into public.plans (plan_key, name, price_cents, currency, interval, sort_order, limits, features)
values
 ('free','Free',0, 'MAD','monthly',0,
  '{"business":1,"products":5,"services":5,"gallery":5,"storage_mb":50,"messenger":false,"analytics":false,"priority_search":false,"premium_badge":false,"verified_badge":false,"featured":false,"ai":false,"support":"community"}',
  '{"messenger":false,"analytics":false,"prioritySearch":false,"premiumBadge":false,"verifiedBadge":false,"featured":false,"ai":false,"support":"community"}'),
 ('free','Free',0,'MAD','yearly',0,
  '{"business":1,"products":5,"services":5,"gallery":5,"storage_mb":50,"messenger":false,"analytics":false,"priority_search":false,"premium_badge":false,"verified_badge":false,"featured":false,"ai":false,"support":"community"}',
  '{"messenger":false,"analytics":false,"prioritySearch":false,"premiumBadge":false,"verifiedBadge":false,"featured":false,"ai":false,"support":"community"}'),
 ('premium','Premium',19900,'MAD','monthly',10,
  '{"business":1,"products":50,"services":20,"gallery":50,"storage_mb":512,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"priority"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"priority"}'),
 ('premium','Premium',54900,'MAD','quarterly',11,
  '{"business":1,"products":50,"services":20,"gallery":50,"storage_mb":512,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"priority"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"priority"}'),
 ('premium','Premium',199000,'MAD','yearly',12,
  '{"business":1,"products":50,"services":20,"gallery":50,"storage_mb":512,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"priority"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"priority"}'),
 ('premium','Premium Lifetime',1949000,'MAD','lifetime',13,
  '{"business":1,"products":50,"services":20,"gallery":50,"storage_mb":512,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"priority"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"priority"}'),
 ('enterprise','Enterprise',59900,'MAD','monthly',20,
  '{"business":3,"products":null,"services":null,"gallery":null,"storage_mb":2048,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"dedicated"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"dedicated"}'),
 ('enterprise','Enterprise',159900,'MAD','quarterly',21,
  '{"business":3,"products":null,"services":null,"gallery":null,"storage_mb":2048,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"dedicated"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"dedicated"}'),
 ('enterprise','Enterprise',599000,'MAD','yearly',22,
  '{"business":3,"products":null,"services":null,"gallery":null,"storage_mb":2048,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"dedicated"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"dedicated"}'),
 ('enterprise','Enterprise Lifetime',1999000,'MAD','lifetime',23,
  '{"business":3,"products":null,"services":null,"gallery":null,"storage_mb":2048,"messenger":true,"analytics":true,"priority_search":true,"premium_badge":true,"verified_badge":true,"featured":true,"ai":true,"support":"dedicated"}',
  '{"messenger":true,"analytics":true,"prioritySearch":true,"premiumBadge":true,"verifiedBadge":true,"featured":true,"ai":true,"support":"dedicated"}')
on conflict (plan_key, interval) do nothing;

-- Demo/launch coupon: 10% off any paid plan, one-time per user.
insert into public.coupons
  (code, type, value, amount_total_cents, period, active, starts_at, expires_at, max_usage, per_user_limit, applies_to, plans, created_by)
values
  ('WELCOME10', 'percent', 10, 0, 'one_time', true, now(), now() + interval '90 days', null, 1, 'subscription', '{}', null)
on conflict (code) do nothing;
