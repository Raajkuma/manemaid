-- Run with: npx supabase test db
-- Celebration greetings: India-date window, audience, once per customer, Inbox item.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-4444-0000-0000-0000000000a1', '919995000001', 'authenticated', 'authenticated'),
  ('bbbbbbbb-4444-0000-0000-0000000000b2', '919995000002', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role) values ('919995000099', 'admin');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-4444-0000-0000-0000000000c9', '919995000099', 'authenticated', 'authenticated');

-- Customer B has an active booking (so B is an "active customer"); A has none.
insert into public.customer_addresses (id, customer_id, line1, flat_no, building, landmark, pincode, city)
values ('dddddddd-4444-0000-0000-0000000000d1', 'bbbbbbbb-4444-0000-0000-0000000000b2', '1 Road', '1', 'B', 'L', '560038', 'Bengaluru');
insert into public.bookings (customer_id, address_id, category_code, engagement_type, start_date, days_of_week, status)
values ('bbbbbbbb-4444-0000-0000-0000000000b2', 'dddddddd-4444-0000-0000-0000000000d1', 'home_care', 'part_time', current_date, '{1}', 'active');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

select function_privs_are('public', 'get_my_greetings', array[]::text[], 'anon', array[]::text[], 'anon cannot read greetings');

set local role authenticated;

-- ---------------------------------------------------------------- agency posts greetings
select pg_temp.as_user('cccccccc-4444-0000-0000-0000000000c9');
with x as (insert into public.greetings (title, message, starts_on, ends_on)
           values ('Happy Diwali', 'Wishing you light and joy!', public.india_today(), public.india_today() + 2) returning id)
insert into ids select 'diwali', id from x;
with x as (insert into public.greetings (title, message, audience, starts_on, ends_on, push_to_inbox)
           values ('Thank you', 'Thanks for being with us', 'active_customers', public.india_today(), public.india_today(), false) returning id)
insert into ids select 'thanks', id from x;
with x as (insert into public.greetings (title, message, starts_on, ends_on)
           values ('New Year', 'Coming soon', public.india_today() + 5, public.india_today() + 6) returning id)
insert into ids select 'future', id from x;
with x as (insert into public.greetings (title, message, starts_on, ends_on)
           values ('Old one', 'Already over', public.india_today() - 5, public.india_today() - 1) returning id)
insert into ids select 'past', id from x;
with x as (insert into public.greetings (title, message, starts_on, ends_on, active)
           values ('Draft', 'Hidden', public.india_today(), public.india_today(), false) returning id)
insert into ids select 'hidden', id from x;
select pass('agency can post greetings');
select throws_ok(
  $$ insert into public.greetings (title, message, starts_on, ends_on) values ('Bad', 'Dates reversed', current_date, current_date - 1) $$,
  '23514', null, 'a greeting cannot end before it starts');
select is((select count(*)::int from public.get_my_greetings()), 0, 'agency staff are never shown customer greetings');

-- ---------------------------------------------------------------- customer A (no active booking)
select pg_temp.as_user('aaaaaaaa-4444-0000-0000-0000000000a1');
select is((select count(*)::int from public.greetings), 0, 'customers cannot read the greetings table');
select throws_ok($$ insert into public.greetings (title, message, starts_on, ends_on) values ('Sneaky', 'No', current_date, current_date) $$,
  '42501', null, 'customers cannot post greetings');
select is(array(select title from public.get_my_greetings()), array['Happy Diwali'],
  'A sees only today''s greeting for everyone (not future, past, hidden or active-customers-only)');

select public.mark_greeting_seen((select v from ids where k = 'diwali'));
select is((select count(*)::int from public.get_my_greetings()), 0, 'once seen, the greeting is not shown again');
select is((select count(*)::int from public.notifications where user_id = auth.uid() and title = '🎉 Happy Diwali'), 1,
  'seeing it adds one Inbox item');
select public.mark_greeting_seen((select v from ids where k = 'diwali'));
select is((select count(*)::int from public.notifications where user_id = auth.uid() and title = '🎉 Happy Diwali'), 1,
  'seeing it again (another device) does not duplicate the Inbox item');
select public.mark_greeting_seen((select v from ids where k = 'future'));
select is((select count(*)::int from public.greeting_deliveries), 0, 'customers cannot read deliveries directly');

-- ---------------------------------------------------------------- customer B (active booking)
select pg_temp.as_user('bbbbbbbb-4444-0000-0000-0000000000b2');
select is((select count(*)::int from public.get_my_greetings()), 2, 'active customer sees both live greetings');
select public.mark_greeting_seen((select v from ids where k = 'thanks'));
select is((select count(*)::int from public.notifications where user_id = auth.uid() and title like '🎉 Thank you%'), 0,
  'no Inbox item when push_to_inbox is off');
select is(array(select title from public.get_my_greetings()), array['Happy Diwali'], 'B still has the Diwali greeting to see');

-- ---------------------------------------------------------------- agency sees reach
select pg_temp.as_user('cccccccc-4444-0000-0000-0000000000c9');
select is((select count(*)::int from public.greeting_deliveries where greeting_id = (select v from ids where k = 'diwali')), 1,
  'agency can count who has seen a greeting');
select is((select count(*)::int from public.greeting_deliveries where greeting_id = (select v from ids where k = 'future')), 0,
  'marking a not-yet-live greeting records nothing');
reset role;
select ok(exists (select 1 from public.audit_log where table_name = 'greetings' and action = 'insert'),
  'posting a greeting is in the activity log');
select ok(public.india_today() between (now() at time zone 'Asia/Kolkata')::date and (now() at time zone 'Asia/Kolkata')::date,
  'dates follow the India calendar day');

select * from finish();
rollback;
