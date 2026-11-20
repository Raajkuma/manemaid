# ManeMaid — backend (Supabase)

Postgres schema, security rules and business logic for the core booking flow (PRD §4–6).

```bash
npx supabase start      # local stack (Docker). API http://127.0.0.1:55421, Studio http://127.0.0.1:55423
npx supabase db reset   # re-apply migrations + seed.sql
npx supabase test db    # pgTAP tests (supabase/tests)
npx supabase stop
```

Ports are shifted to `5542x` (see `config.toml`) so this project can run next to another
local Supabase project on the default `5432x` ports.

## Booking lifecycle

```
enquiry_submitted → under_review → quotation_sent → staff_matching → staff_proposed → confirmed → active → completed
                         ↑   customer asks for changes ┘        ↑ customer asks for someone else ┘
Exits: cancelled_by_customer · cancelled_by_agency · unable_to_serve (reason required)
```

Allowed moves, who may make them, and whether a reason is required are rows in
`public.booking_transitions`. Every change goes through `_transition_booking`, which locks
the row, validates the move, writes `booking_events` (audit trail) and notifies the other side.

## API (RPCs the app calls)

| Who | Function | Does |
|---|---|---|
| customer | `submit_enquiry(...)` | Creates a booking; checks address ownership and PIN serviceability. `p_language_prefs text[]` = preferred languages (empty = any) |
| customer | `respond_quotation(id, accept, note)` | Accept → staff matching (sets agreed price); decline → back to review |
| customer | `respond_staff_proposal(id, approve, note)` | Approve → confirmed (re-checks clashes under a lock); reject → matching |
| both | `update_booking_status(id, to, reason)` | Review / withdraw / start / complete / cancel, as the transition table allows |
| both | `get_booking_staff(booking_id)` | Limited staff profile (no phone, no documents) for your own booking |
| both | `check_serviceable(pincode)`, `mark_notifications_read(ids?)` | |
| agency | `send_quotation(...)` | Supersedes any open quote; moves to `quotation_sent` |
| agency | `staff_candidates(booking_id)` | Ranked candidates with verification / area / language / clash flags |
| agency | `propose_staff(booking_id, staff_id, note)` | Only verified staff, right category, no schedule clash |

## Security

- RLS on every table. Customers read only their own rows; agency users read everything.
- Bookings, quotations, assignments, events and notifications can't be written directly —
  only through the RPCs above. `anon` has no access at all.
- New users are always `customer`. Agency accounts come from `public.admin_phones`
  (an allowlist checked when the user first signs in). Users can't change their own role.
- Customers never query `staff` directly.
- Double booking: proposing and approving staff both check overlapping weekday/time
  windows against the worker's confirmed/active bookings, holding a row lock on the worker.

## Going to production

1. Create a Supabase project, then `npx supabase link --project-ref <ref>` and `npx supabase db push`.
2. Add agency phones: `insert into public.admin_phones (phone, role, full_name) values ('91XXXXXXXXXX', 'admin', 'Name');`
   (digits only, with country code). Load real categories, zones and staff instead of `seed.sql`.
3. Auth → Phone: enable a real SMS provider (Twilio / MessageBird / Vonage / TextLocal, with
   DLT-registered templates for India). Remove the test OTP numbers.
4. Point the app at the hosted URL + publishable key (`mobile/.env.local`, or EAS env vars).
