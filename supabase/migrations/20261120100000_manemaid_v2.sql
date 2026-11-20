-- =============================================================================
-- ManeMaid v2
--   * Profile photos + staff photos (Supabase Storage)
--   * Required address fields
--   * Payment step (manual UPI / bank / cash, verified by the agency)
--   * Agency support contacts, unlocked for customers after a confirmed payment
--   * Configurable quotation scope templates
--   * Full staff records (address, alternate / WhatsApp numbers, email,
--     preferred contact channel, emergency contact)
-- Safe to apply on top of existing data (no reset needed).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Profiles: photo
-- ---------------------------------------------------------------------------
alter table public.profiles add column avatar_path text;   -- object path in the 'avatars' bucket
grant update (avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Addresses: flat, building and landmark are now mandatory.
-- NOT VALID: existing rows are left alone; every new / edited row must comply.
-- ---------------------------------------------------------------------------
alter table public.customer_addresses
  add constraint customer_addresses_required_fields check (
    nullif(trim(flat_no), '') is not null
    and nullif(trim(building), '') is not null
    and nullif(trim(landmark), '') is not null
    and nullif(trim(line1), '') is not null
    and nullif(trim(city), '') is not null
  ) not valid;

-- ---------------------------------------------------------------------------
-- Staff: full contact record
-- ---------------------------------------------------------------------------
create sequence public.staff_code_seq start 300;

alter table public.staff
  alter column code set default ('ST-' || lpad(nextval('public.staff_code_seq')::text, 4, '0')),
  add column address text,
  add column alternate_phone text,
  add column whatsapp_phone text,
  add column email text,
  add column preferred_contact text not null default 'call'
    check (preferred_contact in ('call', 'whatsapp', 'sms', 'email')),
  add column emergency_contact_name text,
  add column emergency_contact_phone text;

comment on column public.staff.photo_url is 'Object path in the staff-photos bucket (not a full URL).';

create or replace function public.staff_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_phone(new.phone);
  new.alternate_phone := public.normalize_phone(new.alternate_phone);
  new.whatsapp_phone := public.normalize_phone(new.whatsapp_phone);
  new.emergency_contact_phone := public.normalize_phone(new.emergency_contact_phone);
  if new.verification_status = 'verified' then
    if tg_op = 'INSERT' or old.verification_status is distinct from 'verified' or new.verified_at is null then
      new.verified_at := coalesce(case when tg_op = 'UPDATE' and old.verification_status = 'verified' then old.verified_at end, now());
    end if;
  else
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger staff_before_write before insert or update on public.staff
  for each row execute function public.staff_before_write();

-- ---------------------------------------------------------------------------
-- Agency settings (single row) and support contacts
-- ---------------------------------------------------------------------------
create table public.agency_settings (
  id boolean primary key default true check (id),
  agency_name text not null,
  support_phone text,
  whatsapp_phone text,
  alternate_phone text,
  support_email text,
  support_hours text,
  upi_id text,
  upi_payee_name text,
  updated_at timestamptz not null default now()
);

create trigger agency_settings_updated_at before update on public.agency_settings
  for each row execute function public.set_updated_at();

alter table public.agency_settings enable row level security;
create policy "agency settings: agency all" on public.agency_settings
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));

-- Placeholder values: the agency edits these in the app (Account → Agency settings).
insert into public.agency_settings
  (agency_name, support_phone, whatsapp_phone, alternate_phone, support_email, support_hours, upi_id, upi_payee_name)
values
  ('ManeMaid', '918040001234', '918040001234', '919900001234', 'support@manemaid.in',
   'Mon–Sat, 8 AM – 8 PM', 'manemaid@upi', 'ManeMaid Home Services')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Payments (manual, agency-verified; no gateway yet)
-- ---------------------------------------------------------------------------
create type public.payment_status as enum ('unpaid', 'pending_verification', 'paid');

alter table public.bookings
  add column payment_status public.payment_status not null default 'unpaid',
  add column payment_method text check (payment_method in ('upi', 'bank_transfer', 'cash')),
  add column payment_reference text,
  add column paid_amount numeric(10, 2),
  add column paid_at timestamptz;

alter table public.booking_events
  add column kind text not null default 'status' check (kind in ('status', 'payment'));

create or replace function public._payment_event(p_booking public.bookings, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role, reason, kind)
  select p_booking.id, p_booking.status, p_booking.status, auth.uid(), p.role, p_reason, 'payment'
  from public.profiles p where p.id = auth.uid();
$$;

-- Customer: "I've paid" with a UPI / bank reference.
create or replace function public.submit_payment(
  p_booking_id uuid,
  p_method text,
  p_reference text
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id and customer_id = auth.uid()
  for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('confirmed', 'active') then
    raise exception 'Payment opens once your staff member is confirmed' using errcode = 'P0001';
  end if;
  if v_booking.payment_status <> 'unpaid' then
    raise exception 'A payment is already recorded for this booking' using errcode = 'P0001';
  end if;
  if p_method not in ('upi', 'bank_transfer') then
    raise exception 'Choose UPI or bank transfer' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_reference, '')), '') is null then
    raise exception 'Please enter the transaction reference' using errcode = 'P0001';
  end if;

  update public.bookings
  set payment_status = 'pending_verification',
      payment_method = p_method,
      payment_reference = trim(p_reference)
  where id = p_booking_id
  returning * into v_booking;

  perform public._payment_event(v_booking, 'Payment submitted · ref ' || trim(p_reference));
  perform public._notify_agency(p_booking_id, v_booking.reference || ': payment to verify',
                                'Customer submitted payment reference ' || trim(p_reference) || '.');
  return v_booking;
end;
$$;

-- Agency: confirm a submitted payment, or record a cash / offline payment directly.
create or replace function public.confirm_payment(
  p_booking_id uuid,
  p_amount numeric default null,
  p_method text default null,
  p_reference text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  perform public._require_agency();
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.status not in ('confirmed', 'active', 'completed') then
    raise exception 'Payments can be recorded once the booking is confirmed' using errcode = 'P0001';
  end if;
  if v_booking.payment_status = 'paid' then
    raise exception 'This booking is already paid' using errcode = 'P0001';
  end if;
  if p_method is not null and p_method not in ('upi', 'bank_transfer', 'cash') then
    raise exception 'Unknown payment method' using errcode = 'P0001';
  end if;

  update public.bookings
  set payment_status = 'paid',
      payment_method = coalesce(p_method, payment_method, 'cash'),
      payment_reference = coalesce(nullif(trim(p_reference), ''), payment_reference),
      paid_amount = coalesce(p_amount, agreed_price),
      paid_at = now()
  where id = p_booking_id
  returning * into v_booking;

  perform public._payment_event(v_booking, 'Payment received · ₹' || to_char(v_booking.paid_amount, 'FM99,99,999'));
  insert into public.notifications (user_id, booking_id, title, body)
  values (v_booking.customer_id, p_booking_id, v_booking.reference || ': payment received',
          'Thank you! Your dedicated support line is now unlocked in the app.');
  return v_booking;
end;
$$;

-- Agency: the submitted reference could not be matched.
create or replace function public.reject_payment(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  perform public._require_agency();
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required for this change' using errcode = 'P0001';
  end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.payment_status <> 'pending_verification' then
    raise exception 'There is no payment waiting for verification' using errcode = 'P0001';
  end if;

  update public.bookings
  set payment_status = 'unpaid', payment_reference = null, payment_method = null
  where id = p_booking_id
  returning * into v_booking;

  perform public._payment_event(v_booking, 'Payment not verified · ' || trim(p_reason));
  insert into public.notifications (user_id, booking_id, title, body)
  values (v_booking.customer_id, p_booking_id, v_booking.reference || ': payment not verified', trim(p_reason));
  return v_booking;
end;
$$;

-- What the current user may see of the agency's contact details.
--   * agency: everything
--   * customer with a confirmed/active/completed booking: name, hours, UPI for paying
--   * customer with at least one PAID booking: also phone, WhatsApp, alternate, email
create or replace function public.get_agency_support()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.agency_settings;
  v_agency boolean := public.is_agency();
  v_can_pay boolean;
  v_unlocked boolean;
begin
  select * into s from public.agency_settings where id;
  v_can_pay := v_agency or exists (
    select 1 from public.bookings
    where customer_id = auth.uid() and status in ('confirmed', 'active', 'completed')
  );
  v_unlocked := v_agency or exists (
    select 1 from public.bookings where customer_id = auth.uid() and payment_status = 'paid'
  );
  return jsonb_build_object(
    'agency_name', s.agency_name,
    'support_hours', s.support_hours,
    'unlocked', v_unlocked,
    'upi_id', case when v_can_pay then s.upi_id end,
    'upi_payee_name', case when v_can_pay then s.upi_payee_name end,
    'support_phone', case when v_unlocked then s.support_phone end,
    'whatsapp_phone', case when v_unlocked then s.whatsapp_phone end,
    'alternate_phone', case when v_unlocked then s.alternate_phone end,
    'support_email', case when v_unlocked then s.support_email end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Quotation scope templates (agency-configurable)
-- ---------------------------------------------------------------------------
create table public.scope_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  category_code text references public.service_categories (code),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scope_templates_updated_at before update on public.scope_templates
  for each row execute function public.set_updated_at();

alter table public.scope_templates enable row level security;
create policy "scope templates: agency all" on public.scope_templates
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));

insert into public.scope_templates (title, body, category_code, sort_order) values
  ('Daily home cleaning',
   'Sweeping and mopping all rooms, dusting furniture, cleaning kitchen counters and sink, washing utensils and taking out the trash.',
   'home_care', 1),
  ('Cooking – breakfast & lunch',
   'Preparing breakfast and lunch for the household as per the family''s menu, chopping and prep, and cleaning the kitchen after cooking.',
   'cooking', 2),
  ('Nanny – day care',
   'Feeding, bathing and dressing the child, play and nap routine, keeping the child''s room tidy and sharing daily updates with parents.',
   'child_care', 3),
  ('Elder care – daytime',
   'Companionship, help with mobility and bathing, medication reminders, simple meals and light housekeeping of the room.',
   'elder_care', 4),
  ('Deep cleaning',
   'Full home deep clean: bathrooms, kitchen degreasing, windows, fans and fixtures, cupboards and balconies.',
   'housekeeping', 5),
  ('Live-in help',
   'Full-time live-in help: daily cleaning, cooking assistance, laundry and household support. Weekly off as agreed.',
   'live_in', 6);

-- ---------------------------------------------------------------------------
-- Storage: profile photos and staff photos
-- Files are stored under random names; the app stores the object path.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('staff-photos', 'staff-photos', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "avatars: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "staff photos: agency upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'staff-photos' and (select public.is_agency()));
create policy "staff photos: agency delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'staff-photos' and (select public.is_agency()));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on public.agency_settings, public.scope_templates from anon;
revoke insert, delete on public.agency_settings from authenticated;  -- single row: update only

revoke execute on function
  public.submit_payment(uuid, text, text),
  public.confirm_payment(uuid, numeric, text, text),
  public.reject_payment(uuid, text),
  public.get_agency_support(),
  public._payment_event(public.bookings, text),
  public.staff_before_write()
from public, anon;

revoke execute on function public._payment_event(public.bookings, text) from authenticated;

grant execute on function
  public.submit_payment(uuid, text, text),
  public.confirm_payment(uuid, numeric, text, text),
  public.reject_payment(uuid, text),
  public.get_agency_support()
to authenticated;
