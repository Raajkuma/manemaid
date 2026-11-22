-- =============================================================================
-- Web portal: offers, live app configuration, activity log, error reports,
-- and the developer role.
--
--   * developer = everything an agency admin can do + logs + live configuration.
--   * offers: agency-managed promotions. Customers read them only through
--     get_my_offers() (no drafts / scheduled offers leak) and can claim one when
--     submitting an enquiry; the booking keeps the offer and a copy of its title.
--   * app_config / legal_documents: settings and texts the apps read at runtime,
--     so day-to-day changes need no app release. A small public subset (and the
--     legal texts) is readable before sign-in: the ONLY anon access in the API.
--   * audit_log / app_errors: append-only. Developers read; nobody edits.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Roles: developer counts as agency everywhere
-- ---------------------------------------------------------------------------
create or replace function public.is_agency()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'coordinator', 'developer')
  );
$$;

create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'developer');
$$;

-- Three internal functions hard-code the agency role list. Patch their current
-- definitions in place instead of copying their (long) bodies here.
do $$
declare
  f text;
  def text;
begin
  foreach f in array array[
    'public._notify_agency(uuid, text, text)',
    'public._transition_booking(uuid, public.booking_status, text)',
    'public._notify_ticket(public.support_tickets, boolean, text, text)'
  ] loop
    def := pg_get_functiondef(f::regprocedure);
    if position('''admin'', ''coordinator'')' in def) = 0 then
      raise exception 'Expected agency role list not found in %', f;
    end if;
    execute replace(def, '''admin'', ''coordinator'')', '''admin'', ''coordinator'', ''developer'')');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 60),
  body text not null check (length(trim(body)) between 3 and 300),
  terms text check (terms is null or length(terms) <= 1000),
  image_path text,
  category_code text references public.service_categories (code),
  audience text not null default 'all' check (audience in ('all', 'new_customers')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index offers_live_idx on public.offers (active, starts_at, ends_at);

create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;
create policy "offers: agency all" on public.offers
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));
revoke all on public.offers from anon;

-- Can this customer claim this offer right now (optionally for this service)?
create or replace function public._offer_eligible(p_offer public.offers, p_customer uuid, p_category text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_offer.active
     and p_offer.starts_at <= now()
     and (p_offer.ends_at is null or p_offer.ends_at > now())
     and (p_category is null or p_offer.category_code is null or p_offer.category_code = p_category)
     and (p_offer.audience = 'all'
          or not exists (select 1 from public.bookings b where b.customer_id = p_customer));
$$;

-- Offers the signed-in customer can see now (agency/developer see the same live set).
create or replace function public.get_my_offers()
returns setof public.offers
language sql
stable
security definer
set search_path = ''
as $$
  select o.* from public.offers o
  where auth.uid() is not null and public._offer_eligible(o, auth.uid())
  order by o.sort_order, o.starts_at desc;
$$;

alter table public.bookings
  add column offer_id uuid references public.offers (id) on delete set null,
  add column offer_title text;

-- Banner images: public read, agency write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('offer-images', 'offer-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "offer images: agency upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'offer-images' and (select public.is_agency()));
create policy "offer images: agency update" on storage.objects
  for update to authenticated using (bucket_id = 'offer-images' and (select public.is_agency()));
create policy "offer images: agency delete" on storage.objects
  for delete to authenticated using (bucket_id = 'offer-images' and (select public.is_agency()));

-- submit_enquiry gains p_offer_id. Signature change => drop and recreate (an
-- overload would make PostgREST calls ambiguous), then re-apply grants.
drop function public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text[], text, boolean);

create function public.submit_enquiry(
  p_address_id uuid,
  p_category_code text,
  p_engagement_type public.engagement_type,
  p_start_date date,
  p_days_of_week smallint[],
  p_time_start time default null,
  p_time_end time default null,
  p_hours_per_day numeric default null,
  p_household_size int default null,
  p_rooms int default null,
  p_language_prefs text[] default '{}',
  p_special_instructions text default null,
  p_trial_requested boolean default false,
  p_offer_id uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address public.customer_addresses;
  v_booking public.bookings;
  v_offer public.offers;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_address from public.customer_addresses
  where id = p_address_id and customer_id = auth.uid();
  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  if not public.check_serviceable(v_address.pincode) then
    raise exception 'Sorry, we do not serve PIN code % yet', v_address.pincode
      using errcode = 'P0001', hint = 'not_serviceable';
  end if;

  if not exists (select 1 from public.service_categories where code = p_category_code and active) then
    raise exception 'Unknown service' using errcode = 'P0001';
  end if;

  if p_start_date < current_date then
    raise exception 'Start date cannot be in the past' using errcode = 'P0001';
  end if;

  if p_offer_id is not null then
    select * into v_offer from public.offers where id = p_offer_id;
    if not found or not public._offer_eligible(v_offer, auth.uid(), p_category_code) then
      raise exception 'This offer is no longer available' using errcode = 'P0001', hint = 'offer_unavailable';
    end if;
  end if;

  insert into public.bookings (
    customer_id, address_id, category_code, engagement_type, start_date, days_of_week,
    time_start, time_end, hours_per_day, household_size, rooms, language_prefs,
    special_instructions, trial_requested, offer_id, offer_title
  ) values (
    auth.uid(), p_address_id, p_category_code, p_engagement_type, p_start_date, p_days_of_week,
    p_time_start, p_time_end, p_hours_per_day, p_household_size, p_rooms,
    public._clean_languages(p_language_prefs), nullif(trim(p_special_instructions), ''),
    coalesce(p_trial_requested, false), v_offer.id, v_offer.title
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role)
  values (v_booking.id, null, 'enquiry_submitted', auth.uid(), 'customer');

  insert into public.notifications (user_id, booking_id, title, body)
  values (auth.uid(), v_booking.id, v_booking.reference || ': Enquiry received',
          'Thanks! The agency will review your request and send a quotation.');

  perform public._notify_agency(
    v_booking.id,
    'New enquiry ' || v_booking.reference,
    case when v_offer.id is null then 'A customer submitted a new service request.'
         else 'A customer submitted a new service request and claimed offer: ' || v_offer.title end);
  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Marketing consent (emails about offers)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column marketing_opt_in boolean not null default false,
  add column marketing_opt_in_at timestamptz;

create or replace function public.profiles_marketing_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_opt_in_at := case when new.marketing_opt_in then now() else null end;
  end if;
  return new;
end;
$$;
create trigger profiles_marketing_consent before update on public.profiles
  for each row execute function public.profiles_marketing_consent();

grant update (full_name, email, preferred_language, marketing_opt_in) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Live app configuration
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$'),
  value jsonb not null,
  description text,
  -- Readable before sign-in (maintenance / force-update screens).
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.app_config_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger app_config_stamp before insert or update on public.app_config
  for each row execute function public.app_config_stamp();

alter table public.app_config enable row level security;
create policy "app config: read" on public.app_config
  for select to authenticated using (true);
create policy "app config: developer write" on public.app_config
  for all to authenticated using ((select public.is_developer())) with check ((select public.is_developer()));
revoke all on public.app_config from anon;

-- Public subset for signed-out screens.
create or replace function public.get_public_config()
returns table (key text, value jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.key, c.value from public.app_config c where c.is_public;
$$;

insert into public.app_config (key, value, description, is_public) values
  ('features.offers_enabled', 'true', 'Show the "Offers for you" carousel to customers.', false),
  ('features.upi_payments', 'true', 'Let customers pay by UPI and submit the reference.', false),
  ('features.support_tickets', 'true', 'Let customers raise support requests in the app.', false),
  ('content.home_tagline', '"What help do you need at home today?"', 'Line under the greeting on the customer Home screen.', false),
  ('content.why_manemaid', '[{"title":"Verified by the agency","body":"Background-checked staff with verified records."},{"title":"You approve every worker","body":"Nothing is final until you say yes."},{"title":"Priority support","body":"Raise a request any time. Paying customers get replies within 4 hours."}]', 'The "Why ManeMaid" cards on the customer Home screen.', false),
  ('app.min_version', '"1.0.0"', 'Apps older than this show an "Update the app" screen.', true),
  ('app.update_message', '"A new version of ManeMaid is available. Please update to continue."', 'Text on the "Update the app" screen.', true),
  ('app.maintenance', '{"enabled":false,"message":"ManeMaid is being upgraded. Please try again in a little while."}', 'Maintenance mode for customers (agency and developers can still sign in).', true);

-- ---------------------------------------------------------------------------
-- Legal documents (Terms / Privacy), editable without an app release
-- ---------------------------------------------------------------------------
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('terms', 'privacy')),
  version int not null check (version > 0),
  title text not null,
  body text not null check (length(body) > 0),
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  unique (doc_type, version)
);

alter table public.legal_documents enable row level security;
-- Shown on the sign-in screen too, so readable without signing in.
create policy "legal: read" on public.legal_documents for select to anon, authenticated using (true);
create policy "legal: developer write" on public.legal_documents
  for all to authenticated using ((select public.is_developer())) with check ((select public.is_developer()));
grant select on public.legal_documents to anon;

-- ---------------------------------------------------------------------------
-- Staff access (admin_phones) — developer managed
-- Editing admin_phones alone would not change people who already signed up,
-- so these functions update their profile role too.
-- ---------------------------------------------------------------------------
create or replace function public.list_staff_access()
returns table (phone text, role public.user_role, full_name text, user_id uuid, signed_up boolean, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_developer() then
    raise exception 'Developers only' using errcode = '42501';
  end if;
  return query
  select a.phone, a.role, coalesce(p.full_name, a.full_name), p.id, p.id is not null, u.last_sign_in_at
  from public.admin_phones a
  left join public.profiles p on p.phone = a.phone
  left join auth.users u on u.id = p.id
  order by a.role, a.phone;
end;
$$;

create or replace function public.set_staff_access(p_phone text, p_role public.user_role, p_full_name text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_in_phone(p_phone);  -- adds the 91 country code like sign-in
begin
  if not public.is_developer() then
    raise exception 'Developers only' using errcode = '42501';
  end if;
  if v_phone is null or length(v_phone) < 12 then
    raise exception 'Enter a valid mobile number' using errcode = 'P0001';
  end if;
  if p_role = 'customer' then
    raise exception 'Use "Remove access" to make someone a customer' using errcode = 'P0001';
  end if;
  if p_role <> 'developer'
     and exists (select 1 from public.admin_phones where phone = v_phone and role = 'developer')
     and (select count(*) from public.admin_phones where role = 'developer') <= 1 then
    raise exception 'You cannot remove the last developer' using errcode = 'P0001';
  end if;

  insert into public.admin_phones (phone, role, full_name)
  values (v_phone, p_role, nullif(trim(p_full_name), ''))
  on conflict (phone) do update set role = excluded.role, full_name = coalesce(excluded.full_name, public.admin_phones.full_name);

  update public.profiles set role = p_role where phone = v_phone;
end;
$$;

create or replace function public.remove_staff_access(p_phone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_in_phone(p_phone);  -- adds the 91 country code like sign-in
begin
  if not public.is_developer() then
    raise exception 'Developers only' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_phones where phone = v_phone and role = 'developer')
     and (select count(*) from public.admin_phones where role = 'developer') <= 1 then
    raise exception 'You cannot remove the last developer' using errcode = 'P0001';
  end if;
  delete from public.admin_phones where phone = v_phone;
  update public.profiles set role = 'customer' where phone = v_phone and role <> 'customer';
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_role public.user_role,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  row_id text,
  changes jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_table_idx on public.audit_log (table_name, at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, at desc);

alter table public.audit_log enable row level security;
create policy "audit log: developer read" on public.audit_log
  for select to authenticated using ((select public.is_developer()));
revoke all on public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated;

-- Hide the middle of phone numbers: 919876543210 -> 9198******10
create or replace function public._mask_phones(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(
    k,
    case when k like '%phone%' and jsonb_typeof(v) = 'string' and length(v #>> '{}') > 6
         then to_jsonb(left(v #>> '{}', 4) || repeat('*', length(v #>> '{}') - 6) || right(v #>> '{}', 2))
         else v end), '{}'::jsonb)
  from jsonb_each(p) as e(k, v);
$$;

create or replace function public._audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_changes jsonb := '{}';
  v_key text;
  v_row jsonb := coalesce(v_new, v_old);
  v_role public.user_role;
begin
  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      continue when v_key in ('updated_at', 'created_at', 'last_message_at');
      if (v_old -> v_key) is distinct from (v_new -> v_key) then
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}' then
      return null;
    end if;
    -- Profiles: only role and email changes are worth logging.
    if tg_table_name = 'profiles' and not (v_changes ? 'role' or v_changes ? 'email') then
      return null;
    end if;
    v_changes := (select coalesce(jsonb_object_agg(k, jsonb_build_object(
                    'from', public._mask_phones(jsonb_build_object(k, v -> 'from')) -> k,
                    'to', public._mask_phones(jsonb_build_object(k, v -> 'to')) -> k)), '{}')
                  from jsonb_each(v_changes) e(k, v));
  else
    v_changes := public._mask_phones(v_row - 'created_at' - 'updated_at');
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  insert into public.audit_log (actor_id, actor_role, action, table_name, row_id, changes)
  values (auth.uid(), v_role, lower(tg_op), tg_table_name,
          coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'phone', v_row ->> 'code', v_row ->> 'pincode'),
          v_changes);
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'bookings', 'quotations', 'assignments', 'staff', 'offers', 'scope_templates',
    'agency_settings', 'admin_phones', 'app_config', 'service_categories', 'service_zones',
    'support_tickets', 'profiles', 'legal_documents'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public._audit()',
      t || '_audit', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sign-in history (from Supabase Auth's own log)
-- ---------------------------------------------------------------------------
create or replace function public.get_signin_log(p_limit int default 100, p_offset int default 0)
returns table (at timestamptz, action text, phone text, user_id uuid, full_name text, role public.user_role)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_developer() then
    raise exception 'Developers only' using errcode = '42501';
  end if;
  return query
  select e.created_at,
         e.payload ->> 'action',
         e.payload ->> 'actor_username',
         (e.payload ->> 'actor_id')::uuid,
         p.full_name,
         p.role
  from auth.audit_log_entries e
  left join public.profiles p on p.id = (e.payload ->> 'actor_id')::uuid
  where e.payload ->> 'action' in ('login', 'user_signedup', 'logout', 'user_recovery_requested')
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- App error reports (mobile app + web portal)
-- ---------------------------------------------------------------------------
create table public.app_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('mobile', 'portal')),
  message text not null,
  stack text,
  route text,
  app_version text,
  platform text,
  user_id uuid
);
create index app_errors_at_idx on public.app_errors (at desc);

alter table public.app_errors enable row level security;
create policy "app errors: developer read" on public.app_errors
  for select to authenticated using ((select public.is_developer()));
revoke all on public.app_errors from anon;
revoke insert, update, delete, truncate on public.app_errors from authenticated;

-- Works signed in or not (errors on the sign-in page matter too). Text is
-- truncated; at most 30 reports a minute per user, and 60 a minute from
-- signed-out visitors in total, so it cannot be used to flood the table.
create or replace function public.report_error(
  p_source text,
  p_message text,
  p_stack text default null,
  p_route text default null,
  p_app_version text default null,
  p_platform text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_recent int;
  v_cap int := 30;
begin
  if p_source not in ('mobile', 'portal') or nullif(trim(p_message), '') is null then
    return;
  end if;
  if v_uid is null then
    v_cap := 60;
  end if;
  select count(*) into v_recent from public.app_errors
  where at > now() - interval '1 minute'
    and (user_id = v_uid or (v_uid is null and user_id is null));
  if v_recent >= v_cap then
    return;
  end if;
  insert into public.app_errors (source, message, stack, route, app_version, platform, user_id)
  values (p_source, left(p_message, 1000), left(p_stack, 8000), left(p_route, 300),
          left(p_app_version, 40), left(p_platform, 40), v_uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function
  public.is_developer(),
  public._offer_eligible(public.offers, uuid, text),
  public.get_my_offers(),
  public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text[], text, boolean, uuid),
  public.profiles_marketing_consent(),
  public.app_config_stamp(),
  public.get_public_config(),
  public.list_staff_access(),
  public.set_staff_access(text, public.user_role, text),
  public.remove_staff_access(text),
  public._mask_phones(jsonb),
  public._audit(),
  public.get_signin_log(int, int),
  public.report_error(text, text, text, text, text, text)
from public, anon;

revoke execute on function public._offer_eligible(public.offers, uuid, text), public._mask_phones(jsonb), public._audit()
from authenticated;

grant execute on function
  public.is_developer(),
  public.get_my_offers(),
  public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text[], text, boolean, uuid),
  public.get_public_config(),
  public.list_staff_access(),
  public.set_staff_access(text, public.user_role, text),
  public.remove_staff_access(text),
  public.get_signin_log(int, int),
  public.report_error(text, text, text, text, text, text)
to authenticated;

-- The only functions callable before sign-in.
grant execute on function public.get_public_config(), public.report_error(text, text, text, text, text, text) to anon;

-- ---------------------------------------------------------------------------
-- Realtime: offers and config changes reach open apps immediately
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.offers, public.app_config;
