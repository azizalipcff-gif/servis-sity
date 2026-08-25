-- 0043 Admin security & moderation hardening
-- Captures every SQL change made for the admin security program so the
-- schema is reproducible from a clean database.

-- 1. Audit action vocabulary --------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'report.resolve';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'moderation.reject';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'moderation.approve';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'payment.refund';

-- 2. Rate limiting store --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key text NOT NULL,
  bucket_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_key_bucket_idx
  ON public.rate_limits (key, bucket_start);
CREATE INDEX IF NOT EXISTS rate_limits_created_at_idx
  ON public.rate_limits (created_at);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_admin_write" ON public.rate_limits;
CREATE POLICY "rate_limits_admin_write" ON public.rate_limits
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "rate_limits_admin_read" ON public.rate_limits;
CREATE POLICY "rate_limits_admin_read" ON public.rate_limits
  FOR SELECT TO authenticated USING (public.is_admin());

-- 3. Admin helpers --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_require_admin() RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM public.profiles WHERE id = auth.uid() AND role = 'admin';
  IF v_count = 0 THEN
    RAISE EXCEPTION 'admin_required' USING errcode = '42501';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.fn_is_admin() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
  LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_require_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_admin_rpc() RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;
  IF v_is_admin THEN RETURN true; END IF;
  RAISE EXCEPTION 'admin_required' USING errcode = '42501';
END; $$;
GRANT EXECUTE ON FUNCTION public.ensure_admin_rpc() TO authenticated;

-- 4. Moderation guard: owners cannot self-publish ------------------------
CREATE OR REPLACE FUNCTION public.fn_moderation_guard() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status <> 'published' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'self_publish_forbidden' USING errcode = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_businesses_moderation ON public.businesses;
CREATE TRIGGER trg_businesses_moderation
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.fn_moderation_guard();

DROP TRIGGER IF EXISTS trg_services_moderation ON public.services;
CREATE TRIGGER trg_services_moderation
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.fn_moderation_guard();

DROP TRIGGER IF EXISTS trg_products_moderation ON public.products;
CREATE TRIGGER trg_products_moderation
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.fn_moderation_guard();

-- 5. Reports UPDATE policy ------------------------------------------------
DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Payments security (admin select + refund idempotency) --------------
DROP POLICY IF EXISTS "payments_admin_select" ON public.payments;
CREATE POLICY "payments_admin_select" ON public.payments
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "payments_admin_update" ON public.payments;
CREATE POLICY "payments_admin_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_reference text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_error text;
CREATE UNIQUE INDEX IF NOT EXISTS payments_refund_reference_idx
  ON public.payments (refund_reference) WHERE refund_reference IS NOT NULL;

-- 7. Subscriptions / Stripe admin visibility -----------------------------
DROP POLICY IF EXISTS "subscriptions_admin_select" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_select" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "products_stripe_admin_select" ON public.products;
CREATE POLICY "products_stripe_admin_select" ON public.products
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "prices_stripe_admin_select" ON public.prices;
CREATE POLICY "prices_stripe_admin_select" ON public.prices
  FOR SELECT TO authenticated USING (public.is_admin());
