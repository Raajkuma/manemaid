-- Staff phone numbers: store as country code + number (91XXXXXXXXXX) so tel: / wa.me links work
-- even when a bare 10-digit Indian number is entered.
create or replace function public.normalize_in_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when public.normalize_phone(p) is null then null
    when length(public.normalize_phone(p)) = 10 then '91' || public.normalize_phone(p)
    when length(public.normalize_phone(p)) = 11 and left(public.normalize_phone(p), 1) = '0'
      then '91' || substr(public.normalize_phone(p), 2)
    else public.normalize_phone(p)
  end;
$$;

create or replace function public.staff_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.phone := public.normalize_in_phone(new.phone);
  new.alternate_phone := public.normalize_in_phone(new.alternate_phone);
  new.whatsapp_phone := public.normalize_in_phone(new.whatsapp_phone);
  new.emergency_contact_phone := public.normalize_in_phone(new.emergency_contact_phone);
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

-- Re-normalise existing rows (the trigger does the work).
update public.staff set phone = phone;

revoke execute on function public.normalize_in_phone(text) from public, anon;
