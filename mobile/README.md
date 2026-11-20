# ManeMaid — mobile app (Expo, iOS + Android)

One Expo app for both **customers** and **agency staff**. The screens a user sees are
chosen by their role in the database (`profiles.role`), not by anything in the app.

Backend: Supabase (Postgres + phone OTP auth + Realtime). Schema, rules and tests live in
`../supabase/` — see `../supabase/README.md`.

## Run it locally

```bash
# 1. Start the backend (from the project root; needs Docker Desktop running)
npx supabase start

# 2. Configure the app
cd mobile
cp .env.example .env.local     # then set the URL + publishable key (see below)
npm install

# 3. Start Expo
npx expo start                 # scan the QR code with Expo Go (iPhone or Android)
                               # or press "a" for the Android emulator
```

`.env.local`:

| Where the app runs | `EXPO_PUBLIC_SUPABASE_URL` |
|---|---|
| Phone with Expo Go (same Wi-Fi) | `http://<your PC's Wi-Fi IP>:55421` (e.g. `http://192.168.1.3:55421`) |
| Android emulator | `http://10.0.2.2:55421` or the Wi-Fi IP |
| Hosted Supabase | `https://<project-ref>.supabase.co` |

`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is printed by `npx supabase status`. Never put the
secret / service-role key in the app.

If a phone can't connect, allow Node.js (Metro, port 8081) and inbound TCP 55421 (Supabase) in
Windows Firewall for Private networks, and make sure the phone and PC are on the same Wi-Fi.

### Test logins (local only, no SMS is sent, code `123456`)

| Phone | Role |
|---|---|
| 99999 00001 | Customer A |
| 99999 00002 | Customer B |
| 99999 00099 | Agency admin |

## What's in the app

**Design**: Manrope + DM Sans type, gradient heroes, 3D-style lit icon tiles (perspective tilt,
float and pop-in), spring/tilt press feedback with haptics, animated page transitions, and
animated pop-ups (3D flip-in confirmations, success check with rings) for every submit,
accept, reject and cancel.

**Customer**: phone OTP sign-in · profile with photo, stats and saved addresses · address form
with required fields and a PIN-code serviceability check · step-by-step service request ·
accept / ask for changes on a quotation · approve / reject the proposed staff member · pay by UPI
and submit the transaction reference · agency support line (call, WhatsApp, alternate, email)
unlocked after the payment is confirmed · cancel with a reason · live inbox.

**Agency**: work queue (needs action / payments / waiting / live / closed) · send quotation with a
scope-template dropdown or custom scope, service price and optional tax · manage scope templates ·
ranked candidates and propose staff · confirm / reject payments or record cash · start /
complete / cancel · staff roster with search, profiles (call / WhatsApp / SMS / email) and an
add / edit form (photo, address, mobile, alternate, WhatsApp, email, preferred contact,
emergency contact, services, languages, verification) · agency settings (support numbers, UPI ID).

**Priority support**: customers raise support requests (9 categories, optionally linked to a
booking) and chat with the agency in a thread. Priority is set by the server: safety = urgent
(1 hour), paying customers = priority (4 hours), others = standard (24 hours). The agency has a
Support tab (urgent first) to reply, re-prioritise, resolve and close.

**Terms & Privacy**: in-app Terms of Service and Privacy Policy (`src/content/legal.ts`), reachable
from the profile, the agency account and the sign-in screen. This is a draft and needs legal review before launch.

Payments are **manual UPI / cash, verified by the agency** — no payment gateway is integrated yet.

## Offline demo APK (no backend)

Set `EXPO_PUBLIC_DEMO_MODE=1` at build time and the app swaps Supabase for a small database stored
on the phone (`src/lib/demo/`): the same booking rules, sample customers and staff, and
**Try as Customer / Try as Agency** buttons on sign-in. Calls, WhatsApp, SMS, email and UPI are
switched off. Account → Demo lets testers switch views or reset the data. Each phone has its own
separate demo data.

```powershell
# needs JDK 17 + Android SDK (Gradle downloads the NDK)
subst M: "C:\path\to\Create Complete Application Pages"   # short path avoids Windows path-length errors
cd M:\mobile
npx expo prebuild -p android --no-install                     # generates android/ (not committed)
#  android/gradle.properties: reactNativeArchitectures=arm64-v8a  (smaller APK, faster build)
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue   # force a fresh JS bundle
$env:EXPO_PUBLIC_DEMO_MODE = "1"; $env:NODE_ENV = "production"
cd android; .\gradlew.bat assembleRelease
# -> android\app\build\outputs\apk\release\app-release.apk
```

Test the demo backend without a phone: `npx tsx scripts/demo-backend.test.ts`.

## Project layout

```
src/app/                 Expo Router routes
  _layout.tsx            Session provider + role-based Stack.Protected guards
  sign-in.tsx
  (customer)/            (tabs)/index, bookings, inbox, profile · new-request · address-form · booking/[id]
  (admin)/               (tabs)/queue, staff, alerts, account · manage/[id] · send-quote · propose-staff
src/components/          ui.tsx (design system), booking.tsx, inbox.tsx, account.tsx
src/lib/                 supabase.ts, session.tsx, hooks.ts, format.ts, theme.ts, database.types.ts
```

Regenerate DB types after changing the schema (from the project root):

```bash
npx supabase gen types typescript --local > mobile/src/lib/database.types.ts
```

## Checks

```bash
npm run typecheck && npx expo lint && npx expo-doctor
npm run test:live    # regression: every feature end to end against the local Supabase (needs `npx supabase start`)
npm run test:demo    # same flows against the offline demo backend
npx expo export --platform android --platform ios --platform web   # bundles all platforms
```

## Shipping to the stores

Uses only Expo Go–compatible modules, so it runs in Expo Go today. For store builds use
EAS (`npx eas-cli@latest build -p ios|android`); no Mac needed for iOS cloud builds.
Bundle IDs are set to `com.manemaid.app` in `app.json` — change before publishing.

Not yet built (next phases from the PRD): a payment gateway (Razorpay / Cashfree), remote push
notifications (needs a development build + expo-notifications), attendance, leave/replacement,
complaints, invoices and ratings. Service areas and categories are edited in Supabase Studio.
