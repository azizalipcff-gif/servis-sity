-- Security hardening recorded after live Supabase audit.
-- Prevent owners from reassigning a business to another user through UPDATE.
drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner on public.businesses
for update to authenticated
using (is_owner_or_admin(id))
with check ((owner_id = (select auth.uid())) or is_admin());

-- Trigger-only SECURITY DEFINER helpers must not be callable as public RPC endpoints.
revoke execute on function public.bump_conversation() from public;
revoke execute on function public.enforce_single_active_subscription() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.prevent_duplicate_private_conversation() from public;
revoke execute on function public.protect_business_admin_fields() from public;
revoke execute on function public.protect_featured_entitlement() from public;
revoke execute on function public.protect_financial_status_fields() from public;
revoke execute on function public.protect_message_integrity() from public;
revoke execute on function public.protect_payment_snapshot() from public;
revoke execute on function public.protect_profile_moderation_fields() from public;
revoke execute on function public.protect_profile_role() from public;
revoke execute on function public.protect_review_integrity() from public;
revoke execute on function public.protect_subscription_fields() from public;
revoke execute on function public.protect_verification_request_fields() from public;
revoke execute on function public.refresh_business_rating() from public;
