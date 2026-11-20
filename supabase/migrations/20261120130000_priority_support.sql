-- =============================================================================
-- Priority support: customer support requests with a message thread.
--   * Customers raise a request (optionally linked to a booking).
--   * Priority is set by the server, never the client:
--       safety            -> urgent   (respond within 1 hour)
--       paying customer   -> high     (respond within 4 hours) + "priority customer"
--       everyone else     -> normal   (respond within 24 hours)
--   * Agency triages, replies, changes priority/status. Every change notifies the
--     other side. All writes go through RPCs; tables are read-only via RLS.
-- =============================================================================

create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ticket_priority as enum ('normal', 'high', 'urgent');

create sequence public.ticket_ref_seq start 1001;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SR-' || nextval('public.ticket_ref_seq')),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  category text not null check (category in
    ('punctuality', 'behaviour', 'quality', 'absence', 'replacement', 'safety', 'payment', 'privacy', 'other')),
  subject text not null check (length(trim(subject)) between 3 and 120),
  priority public.ticket_priority not null default 'normal',
  is_priority_customer boolean not null default false,
  status public.ticket_status not null default 'open',
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_customer_idx on public.support_tickets (customer_id, last_message_at desc);
create index support_tickets_queue_idx on public.support_tickets (status, priority, last_message_at desc);

create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references public.profiles (id),
  author_role public.user_role,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- Inbox items can now point at a support request.
alter table public.notifications add column ticket_id uuid references public.support_tickets (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- RLS: read own (customer) or all (agency). No direct writes.
-- ---------------------------------------------------------------------------
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;

create policy "tickets: read own or agency" on public.support_tickets
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_agency()));

create policy "ticket messages: read own or agency" on public.ticket_messages
  for select to authenticated
  using (
    (select public.is_agency())
    or exists (select 1 from public.support_tickets t where t.id = ticket_id and t.customer_id = (select auth.uid()))
  );

revoke all on public.support_tickets, public.ticket_messages from anon;
revoke insert, update, delete on public.support_tickets, public.ticket_messages from authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.ticket_response_target(p public.ticket_priority)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p when 'urgent' then 'within 1 hour' when 'high' then 'within 4 hours' else 'within 24 hours' end;
$$;

create or replace function public._notify_ticket(p_ticket public.support_tickets, p_to_agency boolean, p_title text, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, booking_id, ticket_id, title, body)
  select id, p_ticket.booking_id, p_ticket.id, p_title, p_body
  from public.profiles
  where (p_to_agency and role in ('admin', 'coordinator'))
     or (not p_to_agency and id = p_ticket.customer_id);
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_support_ticket(
  p_category text,
  p_subject text,
  p_message text,
  p_booking_id uuid default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid boolean;
  v_priority public.ticket_priority;
  v_ticket public.support_tickets;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if public.is_agency() then
    raise exception 'Support requests are raised by customers' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_message, '')), '') is null then
    raise exception 'Please describe the issue' using errcode = 'P0001';
  end if;
  if p_booking_id is not null and not exists (
    select 1 from public.bookings where id = p_booking_id and customer_id = auth.uid()
  ) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  v_paid := exists (select 1 from public.bookings where customer_id = auth.uid() and payment_status = 'paid');
  v_priority := case when p_category = 'safety' then 'urgent' when v_paid then 'high' else 'normal' end;

  insert into public.support_tickets (customer_id, booking_id, category, subject, priority, is_priority_customer)
  values (auth.uid(), p_booking_id, p_category, trim(p_subject), v_priority, v_paid)
  returning * into v_ticket;

  insert into public.ticket_messages (ticket_id, author_id, author_role, body)
  values (v_ticket.id, auth.uid(), 'customer', trim(p_message));

  perform public._notify_ticket(
    v_ticket, true,
    case v_priority when 'urgent' then '🚨 URGENT ' when 'high' then '⭐ Priority ' else '' end
      || 'support request ' || v_ticket.reference,
    trim(p_subject)
  );
  perform public._notify_ticket(
    v_ticket, false,
    v_ticket.reference || ': request received',
    'We will respond ' || public.ticket_response_target(v_priority) || '.'
  );
  return v_ticket;
end;
$$;

create or replace function public.reply_to_ticket(p_ticket_id uuid, p_message text)
returns public.ticket_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency boolean := public.is_agency();
  v_ticket public.support_tickets;
  v_msg public.ticket_messages;
begin
  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found or (not v_agency and v_ticket.customer_id <> auth.uid()) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if nullif(trim(coalesce(p_message, '')), '') is null then
    raise exception 'Message cannot be empty' using errcode = 'P0001';
  end if;
  if v_ticket.status = 'closed' and not v_agency then
    raise exception 'This request is closed. Please raise a new one.' using errcode = 'P0001';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, author_role, body)
  select p_ticket_id, auth.uid(), p.role, trim(p_message) from public.profiles p where p.id = auth.uid()
  returning * into v_msg;

  update public.support_tickets
  set last_message_at = now(),
      status = case
        when v_agency and status = 'open' then 'in_progress'::public.ticket_status
        when not v_agency and status = 'resolved' then 'open'::public.ticket_status   -- customer follow-up reopens
        else status end,
      resolved_at = case when not v_agency and status = 'resolved' then null else resolved_at end
  where id = p_ticket_id
  returning * into v_ticket;

  perform public._notify_ticket(
    v_ticket, not v_agency,
    v_ticket.reference || ': new reply',
    left(trim(p_message), 140)
  );
  return v_msg;
end;
$$;

-- Agency: any status. Customer: may close their request, or reopen a resolved one.
create or replace function public.set_ticket_status(p_ticket_id uuid, p_status public.ticket_status, p_note text default null)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agency boolean := public.is_agency();
  v_ticket public.support_tickets;
  v_label text;
begin
  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if not found or (not v_agency and v_ticket.customer_id <> auth.uid()) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if not v_agency and not (
    p_status = 'closed'
    or (p_status = 'open' and v_ticket.status in ('resolved', 'closed'))
  ) then
    raise exception 'You can close this request or reopen it once resolved' using errcode = '42501';
  end if;
  if v_ticket.status = p_status then
    return v_ticket;
  end if;

  update public.support_tickets
  set status = p_status,
      resolved_at = case when p_status = 'resolved' then now() when p_status = 'open' then null else resolved_at end
  where id = p_ticket_id
  returning * into v_ticket;

  v_label := case p_status
    when 'open' then 'reopened' when 'in_progress' then 'in progress'
    when 'resolved' then 'resolved' else 'closed' end;

  insert into public.ticket_messages (ticket_id, author_id, author_role, body)
  select p_ticket_id, auth.uid(), p.role,
         'Marked ' || v_label || coalesce(' · ' || nullif(trim(p_note), ''), '')
  from public.profiles p where p.id = auth.uid();

  perform public._notify_ticket(
    v_ticket, not v_agency,
    v_ticket.reference || ': ' || v_label,
    coalesce(nullif(trim(p_note), ''), 'Your support request was updated.')
  );
  return v_ticket;
end;
$$;

create or replace function public.set_ticket_priority(p_ticket_id uuid, p_priority public.ticket_priority)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.support_tickets;
begin
  perform public._require_agency();
  update public.support_tickets set priority = p_priority where id = p_ticket_id returning * into v_ticket;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants + realtime
-- ---------------------------------------------------------------------------
revoke execute on function
  public.create_support_ticket(text, text, text, uuid),
  public.reply_to_ticket(uuid, text),
  public.set_ticket_status(uuid, public.ticket_status, text),
  public.set_ticket_priority(uuid, public.ticket_priority),
  public.ticket_response_target(public.ticket_priority),
  public._notify_ticket(public.support_tickets, boolean, text, text)
from public, anon;

revoke execute on function public._notify_ticket(public.support_tickets, boolean, text, text) from authenticated;

grant execute on function
  public.create_support_ticket(text, text, text, uuid),
  public.reply_to_ticket(uuid, text),
  public.set_ticket_status(uuid, public.ticket_status, text),
  public.set_ticket_priority(uuid, public.ticket_priority),
  public.ticket_response_target(public.ticket_priority)
to authenticated;

alter publication supabase_realtime add table public.support_tickets, public.ticket_messages;
