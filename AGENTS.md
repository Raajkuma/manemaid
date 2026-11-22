# ManeMaid

Agency-managed home-help booking platform. Three parts share one Supabase backend:

| Folder | What | Run |
|---|---|---|
| `supabase/` | Postgres schema, row-level security, business logic (RPCs), pgTAP tests | `npx supabase start` (Docker) from the repo root |
| `mobile/` | Expo (React Native) app for customers and agency staff — iOS, Android, web | `cd mobile && npx expo start --port 8082` |
| `portal/` | Web console for agency staff (offers) and developers (logs, live configuration) | `cd portal && npm run dev` → http://localhost:5173 |

`PRD.md` is the product requirements document.

## Rules that matter

- **One backend, no secret keys in clients.** Apps and portal use only the Supabase *publishable* key. Every write goes through RLS or a `security definer` function with role checks. Never put the service-role key in `mobile/` or `portal/`.
- **Roles** (`profiles.role`): `customer`, `admin`, `coordinator`, `developer`. `public.is_agency()` is true for admin/coordinator/developer; `public.is_developer()` only for developers. Staff access comes from `admin_phones` (managed with `set_staff_access` / `remove_staff_access`).
- **Phone numbers**: the apps send `+91` + 10 digits; the database stores `91XXXXXXXXXX`. Use `public.normalize_in_phone` server-side and `portal/src/lib/phone.ts` in the portal so one person never gets two accounts.
- **Schema changes = a new migration** in `supabase/migrations/` (never edit an applied one). Adding an enum value needs its own migration. If a function's signature changes, `drop` + `create` it and re-apply grants (an overload makes PostgREST calls ambiguous). Then regenerate types:
  `npx supabase gen types typescript --local > mobile/src/lib/database.types.ts` and copy it to `portal/src/lib/database.types.ts`.
- **Live configuration**: day-to-day settings live in `public.app_config` (read by `mobile/src/lib/config.tsx`, edited in the portal's developer console) — prefer a config key over a code change when something should be adjustable without an app release.
- **Activity log**: `public.audit_log` is append-only, written by the `_audit()` trigger. Add the trigger to new business tables.
- The mobile app also has an **offline demo backend** (`mobile/src/lib/demo/`) that mirrors server rules — update it when you add tables or RPCs the app uses.

## Checks

```bash
npx supabase test db                      # pgTAP (from repo root)
cd mobile && npx tsc --noEmit && npx expo lint
cd mobile && npm run test:live            # end-to-end against local Supabase
cd mobile && npm run test:demo            # offline demo backend
cd portal && npm run build                # typecheck + production build
```

Test logins (local only, code `123456`): `99999 00001` / `99999 00002` customers, `99999 00099` agency admin, `99999 00098` developer.
