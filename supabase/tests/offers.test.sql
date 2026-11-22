-- Run with: npx supabase test db
-- Offers: agency-managed promotions, eligibility, and claiming in submit_enquiry.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-2222-0000-0000-0000000000a1', '919993000001', 'authenticated', 'authenticated'),
  ('bbbbbbbb-2222-0000-0000-0000000000b2', '919993000002', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role) values ('919993000099', 'admin');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-2222-0000-0000-0000000000c9', '919993000099', 'authenticated', 'authenticated');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

-- ---------------------------------------------------------------- schema / permissions
select is(
  (select count(*)::int from pg_proc where proname = 'submit_enquiry' and pronamespace = 'public'::regnamespace),
  1, 'exactly one submit_enquiry (no ambiguous overload)');
select function_privs_are('public', 'get_my_offers', array[]::text[], 'anon', array[]::text[], 'anon cannot list offers');
select ok(has_function_privilege('authenticated', 'public.get_my_offers()', 'execute'), 'signed-in users can list offers');

set local role authenticated;

-- ---------------------------------------------------------------- agency creates offers
select pg_temp.as_user('cccccccc-2222-0000-0000-0000000000c9');
with x as (insert into public.offers (title, body, audience) values ('Live for all', 'Everyone sees this', 'all') returning id)
insert into ids select 'live', id from x;
with x as (insert into public.offers (title, body, audience) values ('Welcome deal', 'New customers only', 'new_customers') returning id)
insert into ids select 'welcome', id from x;
with x as (insert into public.offers (title, body, category_code) values ('Cooking only', 'Only for cooking', 'cooking') returning id)
insert into ids select 'cooking', id from x;
with x as (insert into public.offers (title, body, starts_at) values ('Next week', 'Scheduled', now() + interval '7 days') returning id)
insert into ids select 'scheduled', id from x;
with x as (insert into public.offers (title, body, starts_at, ends_at) values ('Expired', 'Ended', now() - interval '10 days', now() - interval '1 day') returning id)
insert into ids select 'ended', id from x;
with x as (insert into public.offers (title, body, active) values ('Hidden one', 'Switched off', false) returning id)
insert into ids select 'hidden', id from x;
select pass('agency can create offers');
select throws_ok(
  $$ insert into public.offers (title, body, starts_at, ends_at) values ('Bad dates', 'End before start', now(), now() - interval '1 day') $$,
  '23514', null, 'an offer cannot end before it starts');

-- ---------------------------------------------------------------- customer A (no bookings yet)
select pg_temp.as_user('aaaaaaaa-2222-0000-0000-0000000000a1');
select is((select count(*)::int from public.offers), 0, 'customers cannot read the offers table directly');
select ok(exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'live')), 'live offer is listed');
select ok(exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'welcome')), 'new customer sees the welcome offer');
select ok(not exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'scheduled')), 'scheduled offer is not listed yet');
select ok(not exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'ended')), 'ended offer is not listed');
select ok(not exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'hidden')), 'hidden offer is not listed');
select throws_ok(
  $$ insert into public.offers (title, body) values ('Sneaky', 'Customer made') $$,
  '42501', null, 'customers cannot create offers');

with x as (
  insert into public.customer_addresses (customer_id, line1, flat_no, building, landmark, pincode, city, is_default)
  values (auth.uid(), '1 Offer Road', '1', 'B', 'L', '560038', 'Bengaluru', true) returning id)
insert into ids select 'addrA', id from x;

-- Claiming an offer for a different service is rejected.
select throws_ok(
  $$ select public.submit_enquiry((select v from ids where k = 'addrA'), 'home_care', 'part_time', current_date + 1, '{1}',
       '07:00', '08:00', p_offer_id => (select v from ids where k = 'cooking')) $$,
  'P0001', 'This offer is no longer available', 'cannot claim an offer for another service');
select throws_ok(
  $$ select public.submit_enquiry((select v from ids where k = 'addrA'), 'home_care', 'part_time', current_date + 1, '{1}',
       '07:00', '08:00', p_offer_id => (select v from ids where k = 'hidden')) $$,
  'P0001', 'This offer is no longer available', 'cannot claim a hidden offer');

-- Valid claim: booking keeps the offer and a copy of its title.
insert into ids select 'bk', (public.submit_enquiry((select v from ids where k = 'addrA'), 'home_care', 'part_time',
  current_date + 1, '{1}', '07:00', '08:00', p_offer_id => (select v from ids where k = 'welcome'))).id;
select is((select offer_id from public.bookings where id = (select v from ids where k = 'bk')),
  (select v from ids where k = 'welcome'), 'booking is linked to the claimed offer');
select is((select offer_title from public.bookings where id = (select v from ids where k = 'bk')),
  'Welcome deal', 'booking keeps a copy of the offer title');

-- After the first booking, "new customers" offers disappear.
select ok(not exists (select 1 from public.get_my_offers() where id = (select v from ids where k = 'welcome')),
  'welcome offer hidden once the customer has a booking');
select throws_ok(
  $$ select public.submit_enquiry((select v from ids where k = 'addrA'), 'home_care', 'part_time', current_date + 1, '{2}',
       '07:00', '08:00', p_offer_id => (select v from ids where k = 'welcome')) $$,
  'P0001', 'This offer is no longer available', 'welcome offer cannot be claimed twice');

-- ---------------------------------------------------------------- agency sees the claim
select pg_temp.as_user('cccccccc-2222-0000-0000-0000000000c9');
select ok(exists (
  select 1 from public.notifications
  where user_id = auth.uid() and body like '%claimed offer: Welcome deal%'),
  'agency is told which offer was claimed');
select is((select count(*)::int from public.bookings where offer_id = (select v from ids where k = 'welcome')), 1,
  'agency can count claims per offer');

-- Deleting an offer keeps the booking's copy of the title.
delete from public.offers where id = (select v from ids where k = 'welcome');
select is((select offer_title from public.bookings where id = (select v from ids where k = 'bk')),
  'Welcome deal', 'booking still shows the claimed offer after the offer is deleted');

-- ---------------------------------------------------------------- marketing consent
select pg_temp.as_user('bbbbbbbb-2222-0000-0000-0000000000b2');
update public.profiles set email = 'b@example.com', marketing_opt_in = true where id = auth.uid();
select ok((select marketing_opt_in_at is not null from public.profiles where id = auth.uid()),
  'opting in records the consent time');
update public.profiles set marketing_opt_in = false where id = auth.uid();
select ok((select marketing_opt_in_at is null from public.profiles where id = auth.uid()),
  'opting out clears the consent time');

select * from finish();
rollback;
