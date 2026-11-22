# ManeMaid portal (web console)

Vite + React + TypeScript + Tailwind v4, using the same Supabase backend as the app.

```bash
npm install
cp .env.example .env.local     # set the Supabase URL + publishable key (npx supabase status)
npm run dev                    # http://localhost:5173
npm run build                  # typecheck + production build → dist/
```

Sign in with the same phone number as the app. Only phones in **Staff access** (`admin_phones`) get in; customers are told to use the app.

## What's in it

**Landing page** (`/`) and **sign-in** (`/login`, phone + 6-digit code).

**Agency** (admin, coordinator, developer) — the same features and data as the app's agency login, refreshed live (`src/lib/realtime.tsx`):
- **Overview** and **Work queue** — the app's exact groups (Needs action / Payments / Waiting / Live / Closed).
- **Bookings** — details, timeline, payment (confirm / reject / record cash), status actions, **Send quotation**, **Propose staff**.
- **Support** — requests urgent-first, thread with replies, priority and status.
- **Staff** — roster, profile, add/edit form (same fields and checks as the app).
- **Inbox** (unread badge), **Account** (name, photo), **Scope templates**, **Agency settings**.
- **Offers** — create / edit / schedule / hide / delete promotions with banner image, audience, dates and a live preview. Claims are counted per offer.
- **Greetings** — festival / celebration wishes shown to customers as a pop-up once on the chosen days (India dates), optional picture, audience (all or customers with a confirmed/active booking), optional Inbox copy; shows how many customers saw it.

**Developer** (developer role only)
- **Activity log** — every create/change/delete on bookings, offers, staff, settings…, with who did it and before → after values (phone numbers masked). Read-only; nobody can edit or delete it.
- **Sign-ins** — from Supabase Auth's own log.
- **App errors** — crashes and failures reported by the app and this console, grouped, with stack, screen, version and device.
- **Configuration** — `app_config`: feature switches, app text, minimum app version (force update), maintenance mode. Open apps update immediately.
- **Services & areas** — services and PIN-code areas (agency contact and UPI details are under Agency → Agency settings).
- **Staff access** — give, change or remove agency/developer access by phone (updates people who already signed up).
- **Terms & privacy** — publish new versions of the legal texts shown in the app.
- **Supabase** — links to the dashboard for SQL, backups and auth settings.

## Security

The portal holds only the **publishable** key. All permissions are enforced in the database (row-level security and role-checked functions), so the browser can never do more than the signed-in person's role allows. Raw database control stays in the Supabase dashboard on purpose: it needs the secret service-role key, which must never be in a web page.

Database types: `npm run types` (regenerates `src/lib/database.types.ts` from the local database).
