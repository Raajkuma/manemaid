-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '919991000001', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-0000000000b2', '919991000002', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role) values ('919991000099', 'admin');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-0000-0000-0000-0000000000c9', '919991000099', 'authenticated', 'authenticated');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

set local role authenticated;

-- ---------------------------------------------------------------- addresses
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into public.customer_addresses (customer_id, line1, pincode, city)
     values (auth.uid(), '12 CMH Road', '560038', 'Bengaluru') $$,
  '23514', null, 'address without flat / building / landmark is rejected');
with x as (
  insert into public.customer_addresses (customer_id, line1, flat_no, building, landmark, pincode, city, is_default)
  values (auth.uid(), '12 CMH Road', '4B', 'Lake View', 'Near metro', '560038', 'Bengaluru', true)
  returning id)
insert into ids select 'addrA', id from x;
select pass('complete address is accepted');

-- ---------------------------------------------------------------- customer limits
select is((select count(*)::int from public.scope_templates), 0, 'customer cannot read scope templates');
select is((select count(*)::int from public.agency_settings), 0, 'customer cannot read agency settings');
select throws_ok(
  $$ insert into public.staff (full_name) values ('Fake') $$,
  '42501', null, 'customer cannot add staff');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = auth.uid() $$,
  '42501', null, 'role still not editable');
select lives_ok(
  $$ update public.profiles set avatar_path = auth.uid() || '/a.jpg' where id = auth.uid() $$,
  'customer can set own photo');

select is((public.get_agency_support() ->> 'unlocked')::boolean, false, 'support locked for new customer');
select is(public.get_agency_support() ->> 'upi_id', null, 'no UPI before a confirmed booking');

-- ---------------------------------------------------------------- agency: staff + templates
select pg_temp.as_user('cccccccc-0000-0000-0000-0000000000c9');
update public.agency_settings set upi_id = 'test-agency@okbank', support_phone = '918000000001', whatsapp_phone = '918000000001';
select ok((select count(*) from public.scope_templates) >= 6, 'agency sees starter templates');
select lives_ok(
  $$ insert into public.scope_templates (title, body, category_code) values ('Weekend help', 'Sat/Sun cleaning', 'home_care') $$,
  'agency adds a template');

with x as (
  insert into public.staff (full_name, phone, alternate_phone, whatsapp_phone, address, categories, languages,
                            zone_pincode, preferred_contact, verification_status)
  values ('Radha N', '+91 98450 11111', '98450 22222', '+919845011111', '22 2nd Cross, Indiranagar',
          '{home_care}', '{Kannada}', '560038', 'whatsapp', 'verified')
  returning id)
insert into ids select 'staffN', id from x;
select matches((select code from public.staff where id = (select v from ids where k = 'staffN')),
               '^ST-0[0-9]{3}$', 'new staff get an ST- code');
select is((select phone from public.staff where id = (select v from ids where k = 'staffN')),
          '919845011111', 'staff phone normalised to digits');
select isnt((select verified_at from public.staff where id = (select v from ids where k = 'staffN')),
            null, 'verified_at set when verified');
select is((public.get_agency_support() ->> 'support_phone'), '918000000001', 'agency sees support contacts');

-- ---------------------------------------------------------------- booking to confirmed
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
insert into ids select 'bk', (public.submit_enquiry((select v from ids where k = 'addrA'), 'home_care', 'part_time',
  current_date + 2, '{2}', '06:00', '07:00')).id;
select pg_temp.as_user('cccccccc-0000-0000-0000-0000000000c9');
insert into ids select 'q', (public.send_quotation((select v from ids where k = 'bk'), 'Tuesday cleaning', 4000, current_date + 5)).id;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
select public.respond_quotation((select v from ids where k = 'q'), true);
select throws_ok(
  $$ select public.submit_payment((select v from ids where k = 'bk'), 'upi', 'ABC123') $$,
  'P0001', null, 'cannot pay before staff is confirmed');
select pg_temp.as_user('cccccccc-0000-0000-0000-0000000000c9');
insert into ids select 'as', (public.propose_staff((select v from ids where k = 'bk'), (select v from ids where k = 'staffN'))).id;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
select public.respond_staff_proposal((select v from ids where k = 'as'), true);

-- ---------------------------------------------------------------- payment
select is(public.get_agency_support() ->> 'upi_id', 'test-agency@okbank', 'UPI shown once booking is confirmed');
select throws_ok(
  $$ select public.confirm_payment((select v from ids where k = 'bk')) $$,
  '42501', null, 'customer cannot confirm own payment');
select throws_ok(
  $$ select public.submit_payment((select v from ids where k = 'bk'), 'upi', '  ') $$,
  'P0001', null, 'payment reference required');
select lives_ok(
  $$ select public.submit_payment((select v from ids where k = 'bk'), 'upi', 'UPI4471') $$,
  'customer submits payment reference');
select is((public.get_agency_support() ->> 'unlocked')::boolean, false, 'still locked while verifying');

select pg_temp.as_user('cccccccc-0000-0000-0000-0000000000c9');
select lives_ok($$ select public.confirm_payment((select v from ids where k = 'bk')) $$, 'agency confirms payment');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
select is(public.get_agency_support() ->> 'support_phone', '918000000001', 'support unlocked after payment');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-0000000000b2');
select is(public.get_agency_support() ->> 'support_phone', null, 'other customers stay locked');

select pg_temp.as_user('aaaaaaaa-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.booking_events
           where booking_id = (select v from ids where k = 'bk') and kind = 'payment'), 2,
          'payment steps are in the audit trail');

select * from finish();
rollback;
