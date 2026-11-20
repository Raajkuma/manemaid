-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------
insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '919990000001', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '919990000002', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role, full_name) values ('919990000099', 'coordinator', 'Test Coordinator');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-0000-0000-0000-000000000099', '919990000099', 'authenticated', 'authenticated');

insert into public.customer_addresses (id, customer_id, line1, flat_no, building, landmark, pincode, city, is_default) values
  ('a0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', '12 CMH Road', '4B', 'Lake View', 'Near metro', '560038', 'Bengaluru', true),
  ('a0000000-0000-0000-0000-0000000000ff', 'aaaaaaaa-0000-0000-0000-000000000001', 'Far away', '1', 'Tower A', 'Gate 2', '110001', 'Delhi', false),
  ('b0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000002', '5 80ft Road', '12', 'Sunrise Apts', 'Opp. park', '560034', 'Bengaluru', true);

select is((select role::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          'customer', 'new users default to customer');
select is((select role::text from public.profiles where id = 'cccccccc-0000-0000-0000-000000000099'),
          'coordinator', 'allowlisted phone becomes agency user');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

-- helper to impersonate a user
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer A submits an enquiry
-- ---------------------------------------------------------------------------
set local role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.submit_enquiry('a0000000-0000-0000-0000-0000000000ff', 'home_care', 'part_time',
       current_date + 3, '{1,3,5}', '09:00', '11:00') $$,
  'P0001', null, 'enquiry rejected for an unserviceable PIN code');

select throws_ok(
  $$ select public.submit_enquiry('b0000000-0000-0000-0000-00000000000b', 'home_care', 'part_time',
       current_date + 3, '{1,3,5}', '09:00', '11:00') $$,
  'P0002', null, 'cannot use another customer''s address');

insert into ids select 'bkA', (public.submit_enquiry(
  'a0000000-0000-0000-0000-00000000000a', 'home_care', 'part_time',
  current_date + 3, '{1,3,5}', '09:00', '11:00')).id;

select is((select status::text from public.bookings where id = (select v from ids where k = 'bkA')),
          'enquiry_submitted', 'enquiry created');
select matches((select reference from public.bookings where id = (select v from ids where k = 'bkA')),
               '^BK-[0-9]+$', 'booking gets a BK- reference');

-- Customer guardrails
select throws_ok(
  $$ update public.bookings set status = 'active' $$,
  '42501', null, 'customer cannot update bookings directly');
select throws_ok(
  $$ select public.send_quotation((select v from ids where k = 'bkA'), 'x', 1000, current_date + 7) $$,
  '42501', null, 'customer cannot send a quotation');
select throws_ok(
  $$ select public.update_booking_status((select v from ids where k = 'bkA'), 'active') $$,
  'P0001', null, 'customer cannot skip to active');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null, 'customer cannot change own role');
select lives_ok(
  $$ update public.profiles set full_name = 'Riya Malhotra' where id = auth.uid() $$,
  'customer can edit own name');
select is((select count(*)::int from public.staff), 0, 'customer cannot list staff');
select throws_ok(
  $$ select * from public.staff_candidates((select v from ids where k = 'bkA')) $$,
  '42501', null, 'customer cannot run staff matching');

-- Customer B cannot see A's data
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.bookings), 0, 'customer B cannot see customer A''s booking');
select is((select count(*)::int from public.customer_addresses where customer_id <> auth.uid()), 0,
          'customer B cannot see customer A''s addresses');
select is((select count(*)::int from public.get_booking_staff((select v from ids where k = 'bkA'))), 0,
          'customer B cannot see staff on A''s booking');

-- ---------------------------------------------------------------------------
-- Agency quotes, customer accepts
-- ---------------------------------------------------------------------------
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
select is((select count(*)::int from public.bookings where id = (select v from ids where k = 'bkA')), 1, 'agency sees customer bookings');

insert into ids select 'qA', (public.send_quotation(
  (select v from ids where k = 'bkA'), '3 days/week cleaning, 2 hours', 8500, current_date + 7,
  p_agency_fee => 500)).id;
select is((select status::text from public.bookings where id = (select v from ids where k = 'bkA')),
          'quotation_sent', 'quotation sent (review step applied automatically)');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$ select public.respond_quotation((select v from ids where k = 'qA'), true) $$,
                'customer accepts quotation');
select is((select status::text || ':' || agreed_price::text from public.bookings
           where id = (select v from ids where k = 'bkA')),
          'staff_matching:9000.00', 'booking moves to matching with agreed price');

-- ---------------------------------------------------------------------------
-- Agency proposes staff, customer approves
-- ---------------------------------------------------------------------------
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
select throws_ok(
  $$ select public.propose_staff((select v from ids where k = 'bkA'),
       (select id from public.staff where code = 'ST-0241')) $$,
  'P0001', 'Only verified staff can be proposed', 'unverified staff cannot be proposed');

insert into ids select 'asA', (public.propose_staff(
  (select v from ids where k = 'bkA'), (select id from public.staff where code = 'ST-0184'))).id;

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select full_name from public.get_booking_staff((select v from ids where k = 'bkA'))),
          'Sunita Sharma', 'customer sees limited profile of proposed staff');
select lives_ok($$ select public.respond_staff_proposal((select v from ids where k = 'asA'), true) $$,
                'customer approves staff');
select is((select status::text from public.bookings where id = (select v from ids where k = 'bkA')),
          'confirmed', 'booking confirmed');

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
select lives_ok($$ select public.update_booking_status((select v from ids where k = 'bkA'), 'active') $$,
                'agency activates service');

-- ---------------------------------------------------------------------------
-- Double booking is prevented
-- ---------------------------------------------------------------------------
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
insert into ids select 'bkB', (public.submit_enquiry(
  'b0000000-0000-0000-0000-00000000000b', 'home_care', 'part_time',
  current_date + 5, '{3}', '10:00', '12:00')).id;

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
insert into ids select 'qB', (public.send_quotation(
  (select v from ids where k = 'bkB'), 'Wednesday cleaning', 3000, current_date + 7)).id;
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select public.respond_quotation((select v from ids where k = 'qB'), true);

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
select ok((select has_conflict from public.staff_candidates((select v from ids where k = 'bkB'))
           where code = 'ST-0184'), 'candidate list flags the clash');
select throws_ok(
  $$ select public.propose_staff((select v from ids where k = 'bkB'),
       (select id from public.staff where code = 'ST-0184')) $$,
  'P0001', 'This staff member already has a booking at that time', 'clashing staff cannot be proposed');

-- ---------------------------------------------------------------------------
-- Cancellation needs a reason; audit trail and inbox
-- ---------------------------------------------------------------------------
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select throws_ok(
  $$ select public.update_booking_status((select v from ids where k = 'bkB'), 'cancelled_by_customer') $$,
  'P0001', 'A reason is required for this change', 'cancellation requires a reason');
select lives_ok(
  $$ select public.update_booking_status((select v from ids where k = 'bkB'), 'cancelled_by_customer', 'Plans changed') $$,
  'customer cancels with a reason');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select is((select array_agg(to_status::text order by id) from public.booking_events
           where booking_id = (select v from ids where k = 'bkA')),
          array['enquiry_submitted','under_review','quotation_sent','staff_matching',
                'staff_proposed','confirmed','active'],
          'every status change is in the audit trail');
select ok((select count(*) from public.notifications) >= 5, 'customer has inbox notifications');

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000099');
select lives_ok($$ select public.update_booking_status((select v from ids where k = 'bkA'), 'completed') $$,
                'agency completes service');
reset role;
select is((select status::text from public.staff where code = 'ST-0184'), 'available',
          'staff freed after completion');

select * from finish();
rollback;
