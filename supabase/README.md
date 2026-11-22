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
| customer | `submit_enquiry(...)` | Creates a booking; checks address ownership and PIN serviceability. `p_language_prefs text[]` = preferred languages (empty = any). `p_offer_id` = claimed offer (checked again; the booking keeps `offer_id` + `offer_title`) |
| customer | `get_my_offers()` | Offers this customer can see now (active, within dates, audience) — customers never read `offers` directly |
| customer | `respond_quotation(id, accept, note)` | Accept → staff matching (sets agreed price); decline → back to review |
| customer | `respond_staff_proposal(id, approve, note)` | Approve → confirmed (re-checks clashes under a lock); reject → matching |
| both | `update_booking_status(id, to, reason)` | Review / withdraw / start / complete / cancel, as the transition table allows |
| both | `get_booking_staff(booking_id)` | Limited staff profile (no phone, no documents) for your own booking |
| both | `check_serviceable(pincode)`, `mark_notifications_read(ids?)` | |
| agency | `send_quotation(...)` | Supersedes any open quote; moves to `quotation_sent` |
| agency | `staff_candidates(booking_id)` | Ranked candidates with verification / area / language / clash flags |
| agency | `propose_staff(booking_id, staff_id, note)` | Only verified staff, right category, no schedule clash |
| agency | table `offers` + bucket `offer-images` | Agency-managed promotions (app + web portal) |
| agency | table `greetings` (+ `greeting_deliveries`, read) | Celebration greetings; pictures in `offer-images/greetings/` |
| customer | `get_my_greetings()`, `mark_greeting_seen(id)` | Live greetings not yet seen (India dates, audience); mark-seen records the view once and adds the Inbox copy once |
| developer | `list_staff_access()`, `set_staff_access(phone, role, name)`, `remove_staff_access(phone)` | Manage `admin_phones` **and** existing users' roles; the last developer can't be removed |
| developer | `get_signin_log(limit, offset)` | Sign-ins from Supabase Auth's log |
| developer | tables `app_config`, `legal_documents`, `audit_log` (read), `app_errors` (read) | Live configuration, legal texts, activity log, error reports |
| anyone | `get_public_config()`, `report_error(...)`, table `legal_documents` (read) | The **only** things available before sign-in: maintenance / force-update settings, error reports (rate-limited), Terms & Privacy |

## Security

- RLS on every table. Customers read only their own rows; agency users read everything.
- Bookings, quotations, assignments, events and notifications can't be written directly —
  only through the RPCs above. `anon` has no access except the public config, error
  reports and legal texts listed above (needed on the sign-in / maintenance screens).
- Roles: `customer`, `admin`, `coordinator`, `developer`. `is_agency()` covers admin,
  coordinator and developer; `is_developer()` only developers (logs, live config, staff access).
- New users are always `customer`. Agency/developer accounts come from `public.admin_phones`
  (an allowlist checked at first sign-in; `set_staff_access` also updates existing users).
  Users can't change their own role.
- `audit_log` (written by the `_audit()` trigger on business tables; phone numbers masked)
  and `app_errors` are append-only: developers can read them, nobody can edit or delete them.
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
