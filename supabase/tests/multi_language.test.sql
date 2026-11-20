-- Run with: npx supabase test db
-- Preferred languages are multi-select (migration 20261121000000_multi_language_pref).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-1111-0000-0000-0000000000a1', '919992000001', 'authenticated', 'authenticated');
insert into public.admin_phones (phone, role) values ('919992000099', 'admin');
insert into auth.users (id, phone, aud, role) values
  ('cccccccc-1111-0000-0000-0000000000c9', '919992000099', 'authenticated', 'authenticated');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;
create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;

-- ---------------------------------------------------------------- schema + permissions
select col_type_is('public', 'bookings', 'language_prefs', 'text[]', 'bookings.language_prefs is text[]');
select col_not_null('public', 'bookings', 'language_prefs', 'language_prefs is not null');
select hasnt_column('public', 'bookings', 'language_pref', 'old single language column is gone');
select is(
  (select count(*)::int from pg_proc where proname = 'submit_enquiry' and pronamespace = 'public'::regnamespace),
  1, 'exactly one submit_enquiry (no ambiguous overload)');
select function_privs_are('public', 'submit_enquiry',
  array['uuid','text','engagement_type','date','smallint[]','time without time zone','time without time zone','numeric','integer','integer','text[]','text','boolean'],
  'anon', array[]::text[], 'anon cannot call submit_enquiry');
select is(public._clean_languages(array[' Hindi', '', 'Any', 'Kannada', 'Hindi', null]), array['Hindi', 'Kannada'],
  'languages are trimmed, de-duplicated, and blanks / "Any" dropped');

set local role authenticated;

-- Agency adds three cooks with known languages.
select pg_temp.as_user('cccccccc-1111-0000-0000-0000000000c9');
with x as (insert into public.staff (full_name, categories, languages, verification_status, zone_pincode)
           values ('Lang Tamil', '{cooking}', '{Tamil,English}', 'verified', '560038') returning id)
insert into ids select 'tamil', id from x;
with x as (insert into public.staff (full_name, categories, languages, verification_status, zone_pincode)
           values ('Lang Kannada', '{cooking}', '{Kannada}', 'verified', '560038') returning id)
insert into ids select 'kannada', id from x;
with x as (insert into public.staff (full_name, categories, languages, verification_status, zone_pincode)
           values ('Lang Bengali', '{cooking}', '{Bengali}', 'verified', '560038') returning id)
insert into ids select 'bengali', id from x;

-- ---------------------------------------------------------------- customer submits
select pg_temp.as_user('aaaaaaaa-1111-0000-0000-0000000000a1');
with x as (
  insert into public.customer_addresses (customer_id, line1, flat_no, building, landmark, pincode, city, is_default)
  values (auth.uid(), '1 Test Road', '1', 'B', 'L', '560038', 'Bengaluru', true) returning id)
insert into ids select 'addr', id from x;

insert into ids select 'multi', (public.submit_enquiry(
  (select v from ids where k = 'addr'), 'cooking', 'part_time', current_date + 1, '{1}', '07:00', '08:00',
  p_language_prefs => array['Tamil', ' Kannada ', 'Tamil', 'Any'])).id;
select is((select language_prefs from public.bookings where id = (select v from ids where k = 'multi')),
  array['Tamil', 'Kannada'], 'several languages are stored, cleaned');

insert into ids select 'none', (public.submit_enquiry(
  (select v from ids where k = 'addr'), 'cooking', 'part_time', current_date + 1, '{2}', '07:00', '08:00')).id;
select is((select language_prefs from public.bookings where id = (select v from ids where k = 'none')),
  '{}'::text[], 'no preference is stored as an empty list');

-- ---------------------------------------------------------------- matching
select pg_temp.as_user('cccccccc-1111-0000-0000-0000000000c9');
select is((select language_match from public.staff_candidates((select v from ids where k = 'multi'))
           where staff_id = (select v from ids where k = 'tamil')), true, 'speaks one of the languages (Tamil) -> match');
select is((select language_match from public.staff_candidates((select v from ids where k = 'multi'))
           where staff_id = (select v from ids where k = 'kannada')), true, 'speaks the other language (Kannada) -> match');
select is((select language_match from public.staff_candidates((select v from ids where k = 'multi'))
           where staff_id = (select v from ids where k = 'bengali')), false, 'speaks neither -> mismatch');
select ok((select bool_and(language_match) from public.staff_candidates((select v from ids where k = 'none'))),
  'no preference -> everyone matches');
select ok(
  (select array_position(array_agg(staff_id), (select v from ids where k = 'bengali'))
          > array_position(array_agg(staff_id), (select v from ids where k = 'tamil'))
   from public.staff_candidates((select v from ids where k = 'multi'))),
  'language matches rank above mismatches (all else equal)');

-- Proposing a non-matching worker is still allowed (it is a warning, not a block).
select lives_ok($$
  select public.update_booking_status((select v from ids where k = 'multi'), 'under_review');
$$, 'agency can work the multi-language booking');

select * from finish();
rollback;
