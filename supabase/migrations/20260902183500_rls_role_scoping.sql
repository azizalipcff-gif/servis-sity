-- Restrict owner/admin mutations and member-only queries to authenticated users.
-- Public discovery remains available to anon through status-only policies.

drop policy if exists businesses_select_public on public.businesses;
drop policy if exists businesses_insert_owner on public.businesses;
drop policy if exists businesses_update_owner on public.businesses;
drop policy if exists businesses_delete_admin on public.businesses;
create policy businesses_select_public on public.businesses for select to anon, authenticated using (status = 'approved');
create policy businesses_select_owner_or_admin on public.businesses for select to authenticated using ((owner_id = (select auth.uid())) or is_admin());
create policy businesses_insert_owner on public.businesses for insert to authenticated with check ((owner_id = (select auth.uid())) or is_admin());
create policy businesses_update_owner on public.businesses for update to authenticated using (is_owner_or_admin(id)) with check ((owner_id = (select auth.uid())) or is_admin());
create policy businesses_delete_admin on public.businesses for delete to authenticated using (is_admin());

drop policy if exists services_select_published on public.services;
drop policy if exists services_owner_all on public.services;
create policy services_select_published on public.services for select to anon, authenticated using (status = 'published');
create policy services_owner_all on public.services for all to authenticated using (is_owner_or_admin(business_id)) with check (is_owner_or_admin(business_id));

drop policy if exists products_select_public on public.products;
drop policy if exists products_insert_owner on public.products;
drop policy if exists products_update_owner on public.products;
drop policy if exists products_delete_owner on public.products;
create policy products_select_public on public.products for select to anon, authenticated using (status = 'published');
create policy products_select_owner on public.products for select to authenticated using (is_owner_or_admin(business_id));
create policy products_insert_owner on public.products for insert to authenticated with check (is_owner_or_admin(business_id));
create policy products_update_owner on public.products for update to authenticated using (is_owner_or_admin(business_id)) with check (is_owner_or_admin(business_id));
create policy products_delete_owner on public.products for delete to authenticated using (is_owner_or_admin(business_id));

drop policy if exists conversations_insert_creator on public.conversations;
drop policy if exists conversations_select_member on public.conversations;
create policy conversations_insert_creator on public.conversations for insert to authenticated with check ((created_by = (select auth.uid())) or is_admin());
create policy conversations_select_member on public.conversations for select to authenticated using (is_conversation_member(id));

drop policy if exists messages_insert_member on public.messages;
drop policy if exists messages_select_member on public.messages;
drop policy if exists messages_update_owner on public.messages;
create policy messages_insert_member on public.messages for insert to authenticated with check (is_conversation_member(conversation_id) and sender_id = (select auth.uid()));
create policy messages_select_member on public.messages for select to authenticated using (is_conversation_member(conversation_id));
create policy messages_update_owner on public.messages for update to authenticated using ((sender_id = (select auth.uid())) or is_admin()) with check ((sender_id = (select auth.uid())) or is_admin());

drop policy if exists reviews_insert_authenticated on public.reviews;
drop policy if exists reviews_delete_own_or_admin on public.reviews;
drop policy if exists reviews_owner_reply on public.reviews;
create policy reviews_insert_authenticated on public.reviews for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.businesses b where b.id = reviews.business_id and b.status = 'approved' and b.owner_id <> (select auth.uid())));
create policy reviews_delete_own_or_admin on public.reviews for delete to authenticated using ((user_id = (select auth.uid())) or is_admin());
create policy reviews_owner_reply on public.reviews for update to authenticated using (is_owner_or_admin(business_id)) with check (is_owner_or_admin(business_id));

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_owner_or_admin(uuid) from anon;
revoke execute on function public.count_followers(uuid) from anon;
