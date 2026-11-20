-- =============================================================================
-- Agency-mediated domestic help platform — core booking flow (MVP)
--
-- Security model
--   * Every table has RLS enabled.
--   * Customers and agency users can READ through RLS policies, but all state
--     changes to bookings / quotations / assignments / events / notifications go
--     through SECURITY DEFINER RPCs below. Direct INSERT/UPDATE/DELETE on those
--     tables is revoked from the API roles.
--   * The booking lifecycle is a state machine (public.booking_transitions).
--     Every status change is validated against it and written to
--     public.booking_events (audit trail) in the same transaction.
--   * Roles: a new auth user always becomes 'customer', unless their phone is
--     on the agency allowlist (public.admin_phones). Users cannot change
--     their own role.
--   * Customers never read the staff table directly; they only see a limited
--     profile of staff proposed for / assigned to their own bookings
--     (public.get_booking_staff) — no phone numbers or documents (PRD §4.6).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'coordinator', 'admin');

create type public.booking_status as enum (
  'enquiry_submitted',
  'under_review',
  'quotation_sent',
  'staff_matching',
  'staff_proposed',
  'confirmed',
  'active',
  'completed',
  'cancelled_by_customer',
  'cancelled_by_agency',
  'unable_to_serve'
);

create type public.engagement_type as enum (
  'hourly', 'daily', 'part_time', 'full_time', 'monthly', 'live_in'
);

create type public.staff_status as enum (
  'available', 'assigned', 'on_leave', 'inactive'
);

create type public.verification_status as enum (
  'pending', 'in_progress', 'verified', 'rejected'
);

create type public.quotation_status as enum (
  'sent', 'accepted', 'rejected', 'superseded'
);

create type public.assignment_status as enum (
  'proposed', 'approved', 'rejected', 'withdrawn', 'ended'
);

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- Phones that become agency users on first sign-in. Not readable via the API.
create table public.admin_phones (
  phone text primary key check (phone = public.normalize_phone(phone)),
  role public.user_role not null check (role <> 'customer'),
  full_name text
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile for every new auth user. Role comes ONLY from the
-- server-side allowlist, never from client-supplied metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := public.normalize_phone(new.phone);
  v_admin public.admin_phones%rowtype;
begin
  select * into v_admin from public.admin_phones where phone = v_phone;

  insert into public.profiles (id, role, full_name, phone, email)
  values (
    new.id,
    coalesce(v_admin.role, 'customer'),
    v_admin.full_name,
    v_phone,
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- True when the current user is an agency admin or coordinator.
create or replace function public.is_agency()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'coordinator')
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalogue and service area
-- ---------------------------------------------------------------------------
create table public.service_categories (
  code text primary key,
  name text not null,
  description text,
  sort_order int not null default 0,
  active boolean not null default true
);

create table public.service_zones (
  pincode text primary key check (pincode ~ '^[0-9]{6}$'),
  area_name text not null,
  city text not null,
  active boolean not null default true
);

create or replace function public.check_serviceable(p_pincode text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.service_zones where pincode = p_pincode and active
  );
$$;

-- ---------------------------------------------------------------------------
-- Customer addresses
-- ---------------------------------------------------------------------------
create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  line1 text not null,
  flat_no text,
  building text,
  landmark text,
  access_notes text,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  city text not null,
  latitude double precision,
  longitude double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_addresses_customer_idx on public.customer_addresses (customer_id);
create unique index customer_addresses_one_default
  on public.customer_addresses (customer_id) where is_default;

create trigger customer_addresses_updated_at before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff (agency-managed; staff have no app accounts in the MVP)
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  full_name text not null,
  photo_url text,
  phone text,                                   -- private: agency only
  categories text[] not null default '{}',      -- service_categories.code
  skills text[] not null default '{}',
  languages text[] not null default '{}',
  experience_years int not null default 0 check (experience_years >= 0),
  zone_pincode text references public.service_zones (pincode),
  bio text,
  verification_status public.verification_status not null default 'pending',
  verified_at timestamptz,
  status public.staff_status not null default 'available',
  rating numeric(2, 1) check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create sequence public.booking_ref_seq start 2049;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('BK-' || nextval('public.booking_ref_seq')),
  customer_id uuid not null references public.profiles (id),
  address_id uuid not null references public.customer_addresses (id),
  category_code text not null references public.service_categories (code),
  engagement_type public.engagement_type not null,
  start_date date not null,
  days_of_week smallint[] not null default '{1,2,3,4,5,6}'
    check (days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] and cardinality(days_of_week) > 0),
  time_start time,
  time_end time,
  hours_per_day numeric(4, 1),
  household_size int,
  rooms int,
  language_pref text,
  special_instructions text,
  trial_requested boolean not null default false,
  status public.booking_status not null default 'enquiry_submitted',
  agreed_price numeric(10, 2),
  assigned_staff_id uuid references public.staff (id),
  status_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (time_start is null or time_end is null or time_start < time_end)
);

create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_status_idx on public.bookings (status, created_at desc);

create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  scope text not null,
  monthly_price numeric(10, 2) not null check (monthly_price >= 0),
  agency_fee numeric(10, 2) not null default 0 check (agency_fee >= 0),
  deposit numeric(10, 2) not null default 0 check (deposit >= 0),
  tax numeric(10, 2) not null default 0 check (tax >= 0),
  terms text,
  valid_until date not null,
  status public.quotation_status not null default 'sent',
  customer_note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index quotations_booking_idx on public.quotations (booking_id, created_at desc);
create unique index quotations_one_open
  on public.quotations (booking_id) where status = 'sent';

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  staff_id uuid not null references public.staff (id),
  status public.assignment_status not null default 'proposed',
  agency_note text,
  customer_note text,
  proposed_by uuid references public.profiles (id),
  proposed_at timestamptz not null default now(),
  decided_at timestamptz
);

create index assignments_booking_idx on public.assignments (booking_id, proposed_at desc);
create index assignments_staff_idx on public.assignments (staff_id, status);
create unique index assignments_one_open
  on public.assignments (booking_id) where status in ('proposed', 'approved');

-- Audit trail of every status change (immutable).
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  actor_id uuid references public.profiles (id),
  actor_role public.user_role,
  reason text,
  created_at timestamptz not null default now()
);

create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- In-app notification inbox.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- State machine definition
-- ---------------------------------------------------------------------------
create table public.booking_transitions (
  from_status public.booking_status not null,
  to_status public.booking_status not null,
  actor text not null check (actor in ('customer', 'agency')),
  reason_required boolean not null default false,
  primary key (from_status, to_status, actor)
);

insert into public.booking_transitions (from_status, to_status, actor, reason_required) values
  -- agency
  ('enquiry_submitted', 'under_review',          'agency',   false),
  ('under_review',      'quotation_sent',        'agency',   false),
  ('quotation_sent',    'under_review',          'agency',   true),   -- withdraw quote to revise
  ('staff_matching',    'staff_proposed',        'agency',   false),
  ('staff_proposed',    'staff_matching',        'agency',   true),   -- withdraw proposal
  ('confirmed',         'active',                'agency',   false),
  ('active',            'completed',             'agency',   false),
  ('enquiry_submitted', 'unable_to_serve',       'agency',   true),
  ('under_review',      'unable_to_serve',       'agency',   true),
  ('enquiry_submitted', 'cancelled_by_agency',   'agency',   true),
  ('under_review',      'cancelled_by_agency',   'agency',   true),
  ('quotation_sent',    'cancelled_by_agency',   'agency',   true),
  ('staff_matching',    'cancelled_by_agency',   'agency',   true),
  ('staff_proposed',    'cancelled_by_agency',   'agency',   true),
  ('confirmed',         'cancelled_by_agency',   'agency',   true),
  ('active',            'cancelled_by_agency',   'agency',   true),
  -- customer
  ('quotation_sent',    'staff_matching',        'customer', false),  -- accept quote
  ('quotation_sent',    'under_review',          'customer', true),   -- reject / ask for changes
  ('staff_proposed',    'confirmed',             'customer', false),  -- approve staff
  ('staff_proposed',    'staff_matching',        'customer', true),   -- request someone else
  ('enquiry_submitted', 'cancelled_by_customer', 'customer', true),
  ('under_review',      'cancelled_by_customer', 'customer', true),
  ('quotation_sent',    'cancelled_by_customer', 'customer', true),
  ('staff_matching',    'cancelled_by_customer', 'customer', true),
  ('staff_proposed',    'cancelled_by_customer', 'customer', true),
  ('confirmed',         'cancelled_by_customer', 'customer', true);

-- Human-readable label used in notifications.
create or replace function public.booking_status_label(s public.booking_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'enquiry_submitted'     then 'Enquiry submitted'
    when 'under_review'          then 'Under review'
    when 'quotation_sent'        then 'Quotation ready'
    when 'staff_matching'        then 'Finding your staff'
    when 'staff_proposed'        then 'Staff proposed'
    when 'confirmed'             then 'Confirmed'
    when 'active'                then 'Service active'
    when 'completed'             then 'Completed'
    when 'cancelled_by_customer' then 'Cancelled by you'
    when 'cancelled_by_agency'   then 'Cancelled by agency'
    when 'unable_to_serve'       then 'Unable to serve'
  end;
$$;

-- Notify every agency user.
create or replace function public._notify_agency(p_booking uuid, p_title text, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, booking_id, title, body)
  select id, p_booking, p_title, p_body
  from public.profiles where role in ('admin', 'coordinator');
$$;

-- Core transition routine. INTERNAL: not executable by API roles; only called
-- from the RPCs below, which do their own extra validation first.
-- Locks the booking row, checks ownership and the transition table, updates
-- the status, writes the audit event and notifies the other party.
create or replace function public._transition_booking(
  p_booking_id uuid,
  p_to public.booking_status,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_role public.user_role;
  v_actor text;
  v_rule public.booking_transitions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  v_actor := case when v_role in ('admin', 'coordinator') then 'agency' else 'customer' end;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or (v_actor = 'customer' and v_booking.customer_id <> auth.uid()) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  select * into v_rule from public.booking_transitions
  where from_status = v_booking.status and to_status = p_to and actor = v_actor;
  if not found then
    raise exception 'Cannot move booking from % to %', v_booking.status, p_to
      using errcode = 'P0001', hint = 'invalid_transition';
  end if;

  if v_rule.reason_required and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required for this change' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = p_to,
      status_reason = coalesce(nullif(trim(p_reason), ''), status_reason)
  where id = p_booking_id
  returning * into v_booking;

  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason)
  values (p_booking_id, v_rule.from_status, p_to, auth.uid(), v_role, nullif(trim(p_reason), ''));

  if v_actor = 'agency' then
    insert into public.notifications (user_id, booking_id, title, body)
    values (
      v_booking.customer_id, p_booking_id,
      v_booking.reference || ': ' || public.booking_status_label(p_to),
      coalesce(nullif(trim(p_reason), ''), 'Your booking status has been updated.')
    );
  else
    perform public._notify_agency(
      p_booking_id,
      v_booking.reference || ': ' || public.booking_status_label(p_to),
      coalesce(nullif(trim(p_reason), ''), 'The customer updated this booking.')
    );
  end if;

  return v_booking;
end;
$$;

-- Do two bookings' recurring schedules clash?
-- Same weekday AND overlapping time window. Live-in / full-day bookings with no
-- time window clash with anything on a shared weekday.
create or replace function public._schedules_overlap(a public.bookings, b public.bookings)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a.days_of_week && b.days_of_week
     and (
       a.time_start is null or a.time_end is null
       or b.time_start is null or b.time_end is null
       or (a.time_start < b.time_end and b.time_start < a.time_end)
     );
$$;

-- Bookings that would clash with assigning p_staff to p_booking.
create or replace function public._staff_conflicts(p_staff uuid, p_booking uuid)
returns setof public.bookings
language sql
stable
security definer
set search_path = ''
as $$
  select other.*
  from public.bookings target
  join public.assignments a on a.staff_id = p_staff and a.status = 'approved'
  join public.bookings other on other.id = a.booking_id
  where target.id = p_booking
    and other.id <> target.id
    and other.status in ('confirmed', 'active')
    and public._schedules_overlap(target, other);
$$;

-- ---------------------------------------------------------------------------
-- Customer RPCs
-- ---------------------------------------------------------------------------
create or replace function public.submit_enquiry(
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
  p_language_pref text default null,
  p_special_instructions text default null,
  p_trial_requested boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address public.customer_addresses;
  v_booking public.bookings;
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

  insert into public.bookings (
    customer_id, address_id, category_code, engagement_type, start_date, days_of_week,
    time_start, time_end, hours_per_day, household_size, rooms, language_pref,
    special_instructions, trial_requested
  ) values (
    auth.uid(), p_address_id, p_category_code, p_engagement_type, p_start_date, p_days_of_week,
    p_time_start, p_time_end, p_hours_per_day, p_household_size, p_rooms,
    nullif(trim(p_language_pref), ''), nullif(trim(p_special_instructions), ''),
    coalesce(p_trial_requested, false)
  )
  returning * into v_booking;

  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role)
  values (v_booking.id, null, 'enquiry_submitted', auth.uid(), 'customer');

  insert into public.notifications (user_id, booking_id, title, body)
  values (auth.uid(), v_booking.id, v_booking.reference || ': Enquiry received',
          'Thanks! The agency will review your request and send a quotation.');

  perform public._notify_agency(v_booking.id, 'New enquiry ' || v_booking.reference,
                                'A customer submitted a new service request.');
  return v_booking;
end;
$$;

-- Customer accepts or rejects the open quotation.
create or replace function public.respond_quotation(
  p_quotation_id uuid,
  p_accept boolean,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote public.quotations;
  v_booking public.bookings;
begin
  select q.* into v_quote
  from public.quotations q
  join public.bookings b on b.id = q.booking_id
  where q.id = p_quotation_id and b.customer_id = auth.uid()
  for update of q;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;
  if v_quote.status <> 'sent' then
    raise exception 'This quotation is no longer open' using errcode = 'P0001';
  end if;
  if p_accept and v_quote.valid_until < current_date then
    raise exception 'This quotation has expired; please ask the agency for a new one'
      using errcode = 'P0001', hint = 'quotation_expired';
  end if;

  update public.quotations
  set status = case when p_accept then 'accepted' else 'rejected' end::public.quotation_status,
      customer_note = nullif(trim(p_note), ''),
      responded_at = now()
  where id = p_quotation_id;

  if p_accept then
    v_booking := public._transition_booking(v_quote.booking_id, 'staff_matching',
                                            coalesce(nullif(trim(p_note), ''), 'Quotation accepted'));
    update public.bookings
    set agreed_price = v_quote.monthly_price + v_quote.agency_fee + v_quote.tax
    where id = v_quote.booking_id
    returning * into v_booking;
  else
    v_booking := public._transition_booking(v_quote.booking_id, 'under_review',
                                            coalesce(nullif(trim(p_note), ''), 'Quotation declined'));
  end if;
  return v_booking;
end;
$$;

-- Customer approves or rejects the proposed staff member.
-- Approval re-checks schedule conflicts while holding a lock on the staff row,
-- so two customers can never both confirm the same worker for clashing slots.
create or replace function public.respond_staff_proposal(
  p_assignment_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.assignments;
  v_booking public.bookings;
begin
  select a.* into v_assignment
  from public.assignments a
  join public.bookings b on b.id = a.booking_id
  where a.id = p_assignment_id and b.customer_id = auth.uid()
  for update of a;
  if not found then
    raise exception 'Proposal not found' using errcode = 'P0002';
  end if;
  if v_assignment.status <> 'proposed' then
    raise exception 'This proposal is no longer open' using errcode = 'P0001';
  end if;

  if p_approve then
    perform 1 from public.staff where id = v_assignment.staff_id for update;
    if exists (select 1 from public._staff_conflicts(v_assignment.staff_id, v_assignment.booking_id)) then
      raise exception 'This staff member is no longer available for your schedule'
        using errcode = 'P0001', hint = 'staff_conflict';
    end if;

    update public.assignments
    set status = 'approved', customer_note = nullif(trim(p_note), ''), decided_at = now()
    where id = p_assignment_id;

    v_booking := public._transition_booking(v_assignment.booking_id, 'confirmed',
                                            coalesce(nullif(trim(p_note), ''), 'Staff approved'));
    update public.bookings set assigned_staff_id = v_assignment.staff_id
    where id = v_assignment.booking_id
    returning * into v_booking;

    update public.staff set status = 'assigned' where id = v_assignment.staff_id;
  else
    update public.assignments
    set status = 'rejected', customer_note = nullif(trim(p_note), ''), decided_at = now()
    where id = p_assignment_id;

    v_booking := public._transition_booking(v_assignment.booking_id, 'staff_matching',
                                            coalesce(nullif(trim(p_note), ''), 'Customer asked for another option'));
  end if;
  return v_booking;
end;
$$;

-- Limited staff profile for the customer's own booking (or any, for agency).
create or replace function public.get_booking_staff(p_booking_id uuid)
returns table (
  assignment_id uuid,
  assignment_status public.assignment_status,
  agency_note text,
  proposed_at timestamptz,
  staff_id uuid,
  full_name text,
  photo_url text,
  categories text[],
  skills text[],
  languages text[],
  experience_years int,
  bio text,
  verification_status public.verification_status,
  verified_at timestamptz,
  rating numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.status, a.agency_note, a.proposed_at,
         s.id, s.full_name, s.photo_url, s.categories, s.skills, s.languages,
         s.experience_years, s.bio, s.verification_status, s.verified_at, s.rating
  from public.assignments a
  join public.bookings b on b.id = a.booking_id
  join public.staff s on s.id = a.staff_id
  where a.booking_id = p_booking_id
    and (b.customer_id = auth.uid() or public.is_agency())
  order by a.proposed_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Agency RPCs
-- ---------------------------------------------------------------------------
create or replace function public._require_agency()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_agency() then
    raise exception 'Agency access required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.send_quotation(
  p_booking_id uuid,
  p_scope text,
  p_monthly_price numeric,
  p_valid_until date,
  p_agency_fee numeric default 0,
  p_deposit numeric default 0,
  p_tax numeric default 0,
  p_terms text default null
)
returns public.quotations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.booking_status;
  v_quote public.quotations;
begin
  perform public._require_agency();

  select status into v_status from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if p_valid_until < current_date then
    raise exception 'Validity date cannot be in the past' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_scope, '')), '') is null then
    raise exception 'Scope of work is required' using errcode = 'P0001';
  end if;

  -- Sending a quote straight from a new enquiry implies the review step.
  if v_status = 'enquiry_submitted' then
    perform public._transition_booking(p_booking_id, 'under_review', null);
  end if;

  update public.quotations set status = 'superseded'
  where booking_id = p_booking_id and status = 'sent';

  insert into public.quotations (booking_id, scope, monthly_price, agency_fee, deposit, tax,
                                 terms, valid_until, created_by)
  values (p_booking_id, trim(p_scope), p_monthly_price, coalesce(p_agency_fee, 0),
          coalesce(p_deposit, 0), coalesce(p_tax, 0), nullif(trim(p_terms), ''),
          p_valid_until, auth.uid())
  returning * into v_quote;

  perform public._transition_booking(
    p_booking_id, 'quotation_sent',
    'Your quotation is ready: ₹' || to_char(p_monthly_price, 'FM99,99,999') || ' per month. Please review and respond.'
  );
  return v_quote;
end;
$$;

-- Candidate staff for a booking with match / mismatch signals. The coordinator
-- makes the final choice (PRD §5.6).
create or replace function public.staff_candidates(p_booking_id uuid)
returns table (
  staff_id uuid,
  code text,
  full_name text,
  status public.staff_status,
  verification_status public.verification_status,
  experience_years int,
  languages text[],
  rating numeric,
  zone_pincode text,
  zone_match boolean,
  language_match boolean,
  has_conflict boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public._require_agency();

  return query
  select s.id, s.code, s.full_name, s.status, s.verification_status, s.experience_years,
         s.languages, s.rating, s.zone_pincode,
         s.zone_pincode = addr.pincode,
         b.language_pref is null or b.language_pref = any (s.languages),
         exists (select 1 from public._staff_conflicts(s.id, b.id))
  from public.bookings b
  join public.customer_addresses addr on addr.id = b.address_id
  join public.staff s on b.category_code = any (s.categories)
  where b.id = p_booking_id
    and s.status <> 'inactive'
  order by (s.verification_status = 'verified') desc,
           exists (select 1 from public._staff_conflicts(s.id, b.id)) asc,
           (s.zone_pincode = addr.pincode) desc,
           s.rating desc nulls last;
end;
$$;

create or replace function public.propose_staff(
  p_booking_id uuid,
  p_staff_id uuid,
  p_note text default null
)
returns public.assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_staff public.staff;
  v_assignment public.assignments;
begin
  perform public._require_agency();

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status <> 'staff_matching' then
    raise exception 'Staff can only be proposed while matching (current: %)', v_booking.status
      using errcode = 'P0001', hint = 'invalid_transition';
  end if;

  select * into v_staff from public.staff where id = p_staff_id for update;
  if not found then
    raise exception 'Staff member not found' using errcode = 'P0002';
  end if;
  if v_staff.verification_status <> 'verified' then
    raise exception 'Only verified staff can be proposed' using errcode = 'P0001';
  end if;
  if v_staff.status in ('inactive', 'on_leave') then
    raise exception 'This staff member is not available' using errcode = 'P0001';
  end if;
  if not (v_booking.category_code = any (v_staff.categories)) then
    raise exception 'This staff member does not offer the requested service' using errcode = 'P0001';
  end if;
  if exists (select 1 from public._staff_conflicts(p_staff_id, p_booking_id)) then
    raise exception 'This staff member already has a booking at that time'
      using errcode = 'P0001', hint = 'staff_conflict';
  end if;

  insert into public.assignments (booking_id, staff_id, agency_note, proposed_by)
  values (p_booking_id, p_staff_id, nullif(trim(p_note), ''), auth.uid())
  returning * into v_assignment;

  perform public._transition_booking(
    p_booking_id, 'staff_proposed',
    v_staff.full_name || ' has been proposed for your booking. Please review and approve.'
  );
  return v_assignment;
end;
$$;

-- Generic status changes that have no dedicated RPC: start review, withdraw a
-- quote / proposal, activate, complete, cancel, unable to serve.
create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_to public.booking_status,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.booking_status;
  v_booking public.bookings;
begin
  -- Accepting quotes and approving staff have their own RPCs with extra checks.
  if p_to in ('quotation_sent', 'staff_proposed', 'confirmed') then
    raise exception 'Use the dedicated action for this step' using errcode = 'P0001';
  end if;

  select status into v_from from public.bookings where id = p_booking_id;
  if v_from = 'quotation_sent' and p_to in ('staff_matching')
     then
    raise exception 'Use the dedicated action for this step' using errcode = 'P0001';
  end if;

  v_booking := public._transition_booking(p_booking_id, p_to, p_reason);

  -- Side effects on open quotations / assignments.
  if p_to = 'under_review' and v_from = 'quotation_sent' then
    update public.quotations set status = 'superseded'
    where booking_id = p_booking_id and status = 'sent';
  elsif p_to = 'staff_matching' and v_from = 'staff_proposed' then
    update public.assignments set status = 'withdrawn', decided_at = now()
    where booking_id = p_booking_id and status = 'proposed';
  elsif p_to in ('cancelled_by_customer', 'cancelled_by_agency', 'unable_to_serve', 'completed') then
    update public.quotations set status = 'superseded'
    where booking_id = p_booking_id and status = 'sent';
    update public.assignments
    set status = case when status = 'approved' then 'ended' else 'withdrawn' end::public.assignment_status,
        decided_at = now()
    where booking_id = p_booking_id and status in ('proposed', 'approved');
    -- Free the worker if this was their last live booking.
    update public.staff s set status = 'available'
    where s.id = v_booking.assigned_staff_id
      and s.status = 'assigned'
      and not exists (
        select 1 from public.assignments a
        join public.bookings b on b.id = a.booking_id
        where a.staff_id = s.id and a.status = 'approved' and b.status in ('confirmed', 'active')
      );
  end if;

  return v_booking;
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_ids is null or id = any (p_ids));
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.admin_phones        enable row level security;
alter table public.profiles            enable row level security;
alter table public.service_categories  enable row level security;
alter table public.service_zones       enable row level security;
alter table public.customer_addresses  enable row level security;
alter table public.staff               enable row level security;
alter table public.bookings            enable row level security;
alter table public.quotations          enable row level security;
alter table public.assignments         enable row level security;
alter table public.booking_events      enable row level security;
alter table public.notifications       enable row level security;
alter table public.booking_transitions enable row level security;

-- profiles
create policy "profiles: read own or agency" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_agency()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- catalogue (readable by signed-in users; agency manages)
create policy "categories: read" on public.service_categories
  for select to authenticated using (true);
create policy "categories: agency write" on public.service_categories
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));
create policy "zones: read" on public.service_zones
  for select to authenticated using (true);
create policy "zones: agency write" on public.service_zones
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));

-- addresses
create policy "addresses: read own or agency" on public.customer_addresses
  for select to authenticated using (customer_id = (select auth.uid()) or (select public.is_agency()));
create policy "addresses: insert own" on public.customer_addresses
  for insert to authenticated with check (customer_id = (select auth.uid()));
create policy "addresses: update own" on public.customer_addresses
  for update to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy "addresses: delete own" on public.customer_addresses
  for delete to authenticated using (customer_id = (select auth.uid()));

-- staff: agency only
create policy "staff: agency all" on public.staff
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));

-- bookings and children: read own or agency; writes only via RPC
create policy "bookings: read own or agency" on public.bookings
  for select to authenticated using (customer_id = (select auth.uid()) or (select public.is_agency()));

create policy "quotations: read own or agency" on public.quotations
  for select to authenticated using (
    (select public.is_agency())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()))
  );

create policy "assignments: read own or agency" on public.assignments
  for select to authenticated using (
    (select public.is_agency())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()))
  );

create policy "events: read own or agency" on public.booking_events
  for select to authenticated using (
    (select public.is_agency())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = (select auth.uid()))
  );

create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

create policy "transitions: read" on public.booking_transitions
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants broad defaults; tighten them)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke all on public.admin_phones from authenticated;

revoke insert, update, delete on
  public.bookings, public.quotations, public.assignments, public.booking_events,
  public.notifications, public.booking_transitions
from authenticated;

-- Users may edit only these profile columns (never role / phone / id).
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, email, preferred_language) on public.profiles to authenticated;

-- Functions: nothing for anon; internal helpers for nobody but the owner.
revoke execute on all functions in schema public from public, anon;

revoke execute on function
  public._transition_booking(uuid, public.booking_status, text),
  public._notify_agency(uuid, text, text),
  public._staff_conflicts(uuid, uuid),
  public._schedules_overlap(public.bookings, public.bookings),
  public._require_agency(),
  public.handle_new_user()
from authenticated;

grant execute on function
  public.is_agency(),
  public.check_serviceable(text),
  public.booking_status_label(public.booking_status),
  public.normalize_phone(text),
  public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text, text, boolean),
  public.respond_quotation(uuid, boolean, text),
  public.respond_staff_proposal(uuid, boolean, text),
  public.get_booking_staff(uuid),
  public.send_quotation(uuid, text, numeric, date, numeric, numeric, numeric, text),
  public.staff_candidates(uuid),
  public.propose_staff(uuid, uuid, text),
  public.update_booking_status(uuid, public.booking_status, text),
  public.mark_notifications_read(uuid[])
to authenticated;

-- Future objects: don't hand anon anything by default.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Realtime: push booking and inbox changes to the app (RLS still applies)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings, public.notifications;
