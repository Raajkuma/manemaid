-- Run with: npx supabase test db
-- Web portal: developer role, live config, staff access, activity log, error reports.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

insert into public.admin_phones (phone, role) values
  ('919994000099', 'admin'),
  ('919994000098', 'developer');
insert into auth.users (id, phone, aud, role) values
  ('aaaaaaaa-3333-0000-0000-0000000000a1', '919994000001', 'authenticated', 'authenticated'),
  ('cccccccc-3333-0000-0000-0000000000c9', '919994000099', 'authenticated', 'authenticated'),
  ('dddddddd-3333-0000-0000-0000000000d8', '919994000098', 'authenticated', 'authenticated');

create function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
grant execute on function pg_temp.as_user(uuid) to authenticated;
create function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
$$;
grant execute on function pg_temp.as_anon() to anon, authenticated;

select is((select role::text from public.profiles where id = 'dddddddd-3333-0000-0000-0000000000d8'), 'developer',
  'developer phone signs up as developer');

-- ---------------------------------------------------------------- anon: only public config + legal + error reports
set local role anon;
select pg_temp.as_anon();
select ok(exists (select 1 from public.get_public_config() where key = 'app.maintenance'), 'signed-out users can read public config');
select ok(not exists (select 1 from public.get_public_config() where key = 'features.offers_enabled'), 'private config is not public');
select lives_ok($$ select count(*) from public.legal_documents $$, 'signed-out users can read legal documents');
select throws_ok($$ select count(*) from public.app_config $$, '42501', null, 'signed-out users cannot read the config table');
select throws_ok($$ select public.get_my_offers() $$, '42501', null, 'signed-out users cannot list offers');
select lives_ok($$ select public.report_error('portal', 'Sign-in page crashed', null, '/login') $$, 'signed-out errors can be reported');

reset role;
set local role authenticated;

-- ---------------------------------------------------------------- roles
select pg_temp.as_user('dddddddd-3333-0000-0000-0000000000d8');
select ok(public.is_agency(), 'developer counts as agency');
select ok(public.is_developer(), 'developer is a developer');
select pg_temp.as_user('cccccccc-3333-0000-0000-0000000000c9');
select ok(public.is_agency() and not public.is_developer(), 'admin is agency but not developer');

-- ---------------------------------------------------------------- live config
select pg_temp.as_user('aaaaaaaa-3333-0000-0000-0000000000a1');
select ok((select count(*) from public.app_config) > 0, 'customers can read config');
update public.app_config set value = '"hacked"' where key = 'content.home_tagline';
select is((select value #>> '{}' from public.app_config where key = 'content.home_tagline'),
  'What help do you need at home today?', 'customers cannot change config');

select pg_temp.as_user('cccccccc-3333-0000-0000-0000000000c9');
update public.app_config set value = '"hacked"' where key = 'content.home_tagline';
select is((select value #>> '{}' from public.app_config where key = 'content.home_tagline'),
  'What help do you need at home today?', 'agency admins cannot change config');

select pg_temp.as_user('dddddddd-3333-0000-0000-0000000000d8');
update public.app_config set value = '"Home help you can trust"' where key = 'content.home_tagline';
select is((select value #>> '{}' from public.app_config where key = 'content.home_tagline'),
  'Home help you can trust', 'developer can change config');
select is((select updated_by from public.app_config where key = 'content.home_tagline'),
  'dddddddd-3333-0000-0000-0000000000d8'::uuid, 'config change records who made it');
select lives_ok(
  $$ insert into public.legal_documents (doc_type, version, title, body) values ('terms', 99, 'Terms', 'New terms') $$,
  'developer can publish a legal document');

-- ---------------------------------------------------------------- activity log
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'app_config' and row_id = 'content.home_tagline'
    and actor_id = 'dddddddd-3333-0000-0000-0000000000d8' and actor_role = 'developer'
    and changes -> 'value' ->> 'to' = 'Home help you can trust'),
  'config change is in the activity log with actor and before/after');
select ok(not exists (
  select 1 from public.audit_log where table_name = 'app_config' and changes ? 'updated_at'),
  'housekeeping columns are not logged as changes');

select pg_temp.as_user('cccccccc-3333-0000-0000-0000000000c9');
select is((select count(*)::int from public.audit_log), 0, 'agency admins cannot read the activity log');
select throws_ok($$ select * from public.get_signin_log() $$, '42501', null, 'agency admins cannot read sign-ins');

select pg_temp.as_user('dddddddd-3333-0000-0000-0000000000d8');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'even developers cannot delete activity log rows');
select throws_ok($$ insert into public.audit_log (action, table_name) values ('update', 'fake') $$,
  '42501', null, 'nobody can write fake activity log rows');
select lives_ok($$ select * from public.get_signin_log(10, 0) $$, 'developer can read the sign-in log');

-- Phone numbers are partly hidden in the log.
select lives_ok($$ select public.set_staff_access('9845012345', 'coordinator', 'New Coordinator') $$,
  'developer can give a phone agency access');
select ok(exists (
  select 1 from public.audit_log where table_name = 'admin_phones' and changes ->> 'phone' = '9198******45'),
  'phone numbers are masked in the activity log');

-- ---------------------------------------------------------------- staff access
select public.set_staff_access('919994000001', 'admin');
select is((select role::text from public.profiles where id = 'aaaaaaaa-3333-0000-0000-0000000000a1'), 'admin',
  'promoting an existing user updates their role immediately');
select public.remove_staff_access('919994000001');
select is((select role::text from public.profiles where id = 'aaaaaaaa-3333-0000-0000-0000000000a1'), 'customer',
  'removing access turns them back into a customer');
-- Remove every other developer (e.g. from seed data) so this one is the last.
reset role;
delete from public.admin_phones where role = 'developer' and phone <> '919994000098';
set local role authenticated;
select pg_temp.as_user('dddddddd-3333-0000-0000-0000000000d8');
select throws_ok($$ select public.remove_staff_access('919994000098') $$, 'P0001', 'You cannot remove the last developer',
  'the last developer cannot be removed');

-- ---------------------------------------------------------------- error reports
select pg_temp.as_user('aaaaaaaa-3333-0000-0000-0000000000a1');
select public.report_error('mobile', 'Boom ' || g) from generate_series(1, 40) g;
select pg_temp.as_user('dddddddd-3333-0000-0000-0000000000d8');
select is((select count(*)::int from public.app_errors where user_id = 'aaaaaaaa-3333-0000-0000-0000000000a1'), 30,
  'error reports are capped at 30 a minute per user');
select ok(exists (select 1 from public.app_errors where user_id is null and route = '/login'),
  'signed-out error report was stored');

select * from finish();
rollback;
