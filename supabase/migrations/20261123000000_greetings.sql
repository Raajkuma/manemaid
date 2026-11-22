-- =============================================================================
-- Celebration greetings (e.g. Diwali wishes) posted by the agency.
--   * Shown to customers as a pop-up the first time they open the app while the
--     greeting is live (dates are India calendar days, Asia/Kolkata).
--   * Once per customer per greeting: greeting_deliveries records who has seen it.
--   * Optional: also drop it into the customer's Inbox when they first see it.
--   * Audience: all customers, or "active customers" = with a confirmed or
--     active booking.
-- Customers never read the table directly: get_my_greetings() (read-only) and
-- mark_greeting_seen() (records the view + Inbox item) are the only way in.
-- =============================================================================

create or replace function public.india_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

create table public.greetings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 60),
  message text not null check (length(trim(message)) between 3 and 500),
  image_path text,
  audience text not null default 'all' check (audience in ('all', 'active_customers')),
  starts_on date not null,
  ends_on date not null,
  push_to_inbox boolean not null default true,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index greetings_live_idx on public.greetings (active, starts_on, ends_on);

create trigger greetings_updated_at before update on public.greetings
  for each row execute function public.set_updated_at();
create trigger greetings_audit after insert or update or delete on public.greetings
  for each row execute function public._audit();

alter table public.greetings enable row level security;
create policy "greetings: agency all" on public.greetings
  for all to authenticated using ((select public.is_agency())) with check ((select public.is_agency()));
revoke all on public.greetings from anon;

create table public.greeting_deliveries (
  greeting_id uuid not null references public.greetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (greeting_id, user_id)
);

alter table public.greeting_deliveries enable row level security;
-- Agency can count views; customers have no direct access.
create policy "greeting deliveries: agency read" on public.greeting_deliveries
  for select to authenticated using ((select public.is_agency()));
revoke all on public.greeting_deliveries from anon;
revoke insert, update, delete, truncate on public.greeting_deliveries from authenticated;

-- "Active customer": has a confirmed or active booking.
create or replace function public._greeting_for(p_greeting public.greetings, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_greeting.active
     and public.india_today() between p_greeting.starts_on and p_greeting.ends_on
     and exists (select 1 from public.profiles p where p.id = p_user and p.role = 'customer')
     and (p_greeting.audience = 'all'
          or exists (select 1 from public.bookings b
                     where b.customer_id = p_user and b.status in ('confirmed', 'active')));
$$;

-- Read-only: live greetings this customer has not seen yet (newest first).
create or replace function public.get_my_greetings()
returns setof public.greetings
language sql
stable
security definer
set search_path = ''
as $$
  select g.* from public.greetings g
  where auth.uid() is not null
    and public._greeting_for(g, auth.uid())
    and not exists (select 1 from public.greeting_deliveries d where d.greeting_id = g.id and d.user_id = auth.uid())
  order by g.starts_on desc, g.created_at desc;
$$;

-- Record that the customer saw it; add the Inbox item only on the first view.
create or replace function public.mark_greeting_seen(p_greeting_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_greeting public.greetings;
  v_new int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select * into v_greeting from public.greetings where id = p_greeting_id;
  if not found or not public._greeting_for(v_greeting, auth.uid()) then
    return; -- ended, hidden, or not for this customer: nothing to record
  end if;
  insert into public.greeting_deliveries (greeting_id, user_id)
  values (p_greeting_id, auth.uid())
  on conflict do nothing;
  get diagnostics v_new = row_count;
  if v_new = 1 and v_greeting.push_to_inbox then
    insert into public.notifications (user_id, title, body)
    values (auth.uid(), '🎉 ' || v_greeting.title, v_greeting.message);
  end if;
end;
$$;

revoke execute on function
  public.india_today(),
  public._greeting_for(public.greetings, uuid),
  public.get_my_greetings(),
  public.mark_greeting_seen(uuid)
from public, anon;
revoke execute on function public._greeting_for(public.greetings, uuid) from authenticated;
grant execute on function public.india_today(), public.get_my_greetings(), public.mark_greeting_seen(uuid) to authenticated;

-- Greeting pictures share the agency-managed promotions bucket (folder greetings/).

-- Realtime: portal and app agency screens refresh when greetings change; staff
-- and support tables too, so both consoles stay in step.
alter publication supabase_realtime add table
  public.greetings, public.greeting_deliveries, public.staff, public.scope_templates, public.quotations, public.assignments, public.agency_settings;
