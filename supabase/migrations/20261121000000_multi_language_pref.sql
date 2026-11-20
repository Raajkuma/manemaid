-- =============================================================================
-- Preferred language becomes multi-select.
--   bookings.language_pref (text, null = any)  ->  bookings.language_prefs (text[], '{}' = any)
--   submit_enquiry takes p_language_prefs text[]   (old single-text signature dropped)
--   staff_candidates.language_match = staff speaks at least one preferred language
-- Existing bookings keep their preference: 'Hindi' -> '{Hindi}', null -> '{}'.
-- =============================================================================

alter table public.bookings rename column language_pref to language_prefs;
alter table public.bookings
  alter column language_prefs type text[]
    using case when nullif(trim(language_prefs), '') is null then '{}'::text[] else array[trim(language_prefs)] end,
  alter column language_prefs set default '{}',
  alter column language_prefs set not null;

-- Clean a list of languages: trim, drop blanks, "Any" and duplicates, keep the order given.
create or replace function public._clean_languages(p_langs text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(l order by first_pos), '{}')
  from (
    select trim(x) as l, min(pos) as first_pos
    from unnest(coalesce(p_langs, '{}')) with ordinality as u(x, pos)
    where nullif(trim(x), '') is not null and lower(trim(x)) <> 'any'
    group by trim(x)
  ) s;
$$;

-- The parameter type changes, so replace the function rather than add an overload
-- (an overload would make PostgREST calls ambiguous).
drop function public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text, text, boolean);

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
    time_start, time_end, hours_per_day, household_size, rooms, language_prefs,
    special_instructions, trial_requested
  ) values (
    auth.uid(), p_address_id, p_category_code, p_engagement_type, p_start_date, p_days_of_week,
    p_time_start, p_time_end, p_hours_per_day, p_household_size, p_rooms,
    public._clean_languages(p_language_prefs), nullif(trim(p_special_instructions), ''),
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

-- A worker matches when they speak at least one of the preferred languages
-- (or the customer has no preference).
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
         cardinality(b.language_prefs) = 0 or b.language_prefs && s.languages,
         exists (select 1 from public._staff_conflicts(s.id, b.id))
  from public.bookings b
  join public.customer_addresses addr on addr.id = b.address_id
  join public.staff s on b.category_code = any (s.categories)
  where b.id = p_booking_id
    and s.status <> 'inactive'
  order by (s.verification_status = 'verified') desc,
           exists (select 1 from public._staff_conflicts(s.id, b.id)) asc,
           (s.zone_pincode = addr.pincode) desc,
           (cardinality(b.language_prefs) = 0 or b.language_prefs && s.languages) desc,
           s.rating desc nulls last;
end;
$$;

revoke execute on function
  public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text[], text, boolean),
  public._clean_languages(text[])
from public, anon;
revoke execute on function public._clean_languages(text[]) from authenticated;

grant execute on function
  public.submit_enquiry(uuid, text, public.engagement_type, date, smallint[], time, time, numeric, int, int, text[], text, boolean)
to authenticated;
