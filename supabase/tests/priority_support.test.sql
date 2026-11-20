-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Fixtures (as postgres): customer A (no payments), customer P (has a paid booking), customer B, agency.
insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-1111-0000-0000-000000000001', '919992000001', 'authenticated', 'authenticated'),
  ('dddddddd-1111-0000-0000-000000000002', '919992000002', 'authenticated', 'authenticated'),
  ('bbbbbbbb-1111-0000-0000-000000000003', '919992000003', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role) values ('919992000099', 'coordinator');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-1111-0000-0000-000000000099', '919992000099', 'authenticated', 'authenticated');

insert into public.customer_addresses (id, customer_id, line1, flat_no, building, landmark, pincode, city) values
  ('a1111111-0000-0000-0000-000000000001', 'dddddddd-1111-0000-0000-000000000002', 'Road', '1', 'Bldg', 'Park', '560038', 'Bengaluru');
insert into public.bookings (id, customer_id, address_id, category_code, engagement_type, start_date, status, payment_status, agreed_price)
values ('b1111111-0000-0000-0000-000000000001', 'dddddddd-1111-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000001',
        'home_care', 'part_time', current_date + 1, 'active', 'paid', 5000);

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

set local role authenticated;

-- ---------------------------------------------------------------- priorities
select pg_temp.as_user('aaaaaaaa-1111-0000-0000-000000000001');
insert into ids select 'tA', (public.create_support_ticket('quality', 'Kitchen not cleaned', 'The kitchen was skipped today.')).id;
select is((select priority::text || ':' || is_priority_customer from public.support_tickets where id = (select v from ids where k = 'tA')),
          'normal:false', 'unpaid customer gets normal priority');
insert into ids select 'tS', (public.create_support_ticket('safety', 'Felt unsafe', 'Please call me.')).id;
select is((select priority::text from public.support_tickets where id = (select v from ids where k = 'tS')),
          'urgent', 'safety requests are always urgent');
select throws_ok($$ select public.create_support_ticket('other', 'Hi', '   ') $$, 'P0001', null, 'message required');
select throws_ok($$ select public.create_support_ticket('other', 'Hello', 'x', 'b1111111-0000-0000-0000-000000000001') $$,
                 'P0002', null, 'cannot link someone else''s booking');
select throws_ok($$ insert into public.support_tickets (customer_id, category, subject) values (auth.uid(), 'other', 'Sneaky') $$,
                 '42501', null, 'no direct inserts');
select throws_ok($$ update public.support_tickets set priority = 'urgent' $$, '42501', null, 'customer cannot change priority directly');
select is((select count(*)::int from public.ticket_messages where ticket_id = (select v from ids where k = 'tA')), 1,
          'first message stored');

select pg_temp.as_user('dddddddd-1111-0000-0000-000000000002');
insert into ids select 'tP', (public.create_support_ticket('absence', 'Staff late', 'Arrived 1 hour late.', 'b1111111-0000-0000-0000-000000000001')).id;
select is((select priority::text || ':' || is_priority_customer from public.support_tickets where id = (select v from ids where k = 'tP')),
          'high:true', 'paying customer gets priority support');

-- ---------------------------------------------------------------- isolation
select pg_temp.as_user('bbbbbbbb-1111-0000-0000-000000000003');
select is((select count(*)::int from public.support_tickets), 0, 'other customers see no tickets');
select is((select count(*)::int from public.ticket_messages), 0, 'other customers see no messages');
select throws_ok($$ select public.reply_to_ticket((select v from ids where k = 'tA'), 'hi') $$, 'P0002', null,
                 'cannot reply to someone else''s request');

-- ---------------------------------------------------------------- customer limits
select pg_temp.as_user('aaaaaaaa-1111-0000-0000-000000000001');
select throws_ok($$ select public.set_ticket_status((select v from ids where k = 'tA'), 'resolved') $$, '42501', null,
                 'customer cannot mark resolved');
select throws_ok($$ select public.set_ticket_priority((select v from ids where k = 'tA'), 'urgent') $$, '42501', null,
                 'customer cannot set priority');

-- ---------------------------------------------------------------- agency workflow
select pg_temp.as_user('cccccccc-1111-0000-0000-000000000099');
select ok((select count(*) from public.support_tickets) >= 3, 'agency sees all tickets');
select throws_ok($$ select public.create_support_ticket('other', 'Agency test', 'x') $$, '42501', null, 'agency cannot raise customer tickets');
select public.reply_to_ticket((select v from ids where k = 'tA'), 'Sorry! Sending someone today.');
select is((select status::text from public.support_tickets where id = (select v from ids where k = 'tA')), 'in_progress',
          'agency reply moves request to in progress');
select public.set_ticket_status((select v from ids where k = 'tA'), 'resolved', 'Re-cleaned');
select isnt((select resolved_at from public.support_tickets where id = (select v from ids where k = 'tA')), null, 'resolved_at set');

select pg_temp.as_user('aaaaaaaa-1111-0000-0000-000000000001');
select public.reply_to_ticket((select v from ids where k = 'tA'), 'Still not right.');
select is((select status::text from public.support_tickets where id = (select v from ids where k = 'tA')), 'open',
          'customer follow-up reopens a resolved request');
select lives_ok($$ select public.set_ticket_status((select v from ids where k = 'tA'), 'closed') $$, 'customer can close');
select ok((select count(*) from public.notifications where ticket_id = (select v from ids where k = 'tA')) >= 3,
          'customer is notified about request updates');

select * from finish();
rollback;
