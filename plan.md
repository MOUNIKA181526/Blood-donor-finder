## Overview

Add real donor accounts so donors register, log in, and manage their own listing. The public search page will then show real donors from the database instead of the current static demo list. Aadhaar is self-declared (12-digit Verhoeff-checksum verified, no third-party KYC).

## What the user will see

**New `/auth` page** with three sign-in options in tabs:
- Email + password (sign up / sign in)
- Continue with Google
- Phone (SMS OTP) — enter number, receive code, verify

**New `/profile` page** (authenticated only) where a donor fills or edits:
- Name
- Blood group
- State + City
- Contact phone
- Aadhaar number (12 digits, self-declared — validated client-side with Verhoeff checksum)
- "List me publicly" toggle so donors can hide their listing without deleting the account

**Home page (`/`) — updated:**
- Header shows "Sign in" when signed out, and an account menu (My profile, Sign out) when signed in.
- Donor search results are read from the database (donors who have completed their profile and enabled public listing). The demo static list is removed. If the database is empty, the results panel invites donors to sign up and list themselves.
- Aadhaar-verified donors get a small "Aadhaar ✓ self-declared" badge on their card.

## Data model (Lovable Cloud)

A single `donors` table linked one-to-one with the built-in auth user (no separate profiles table — donors are the only user type):

```text
donors
  id             uuid  PK, references auth.users(id) on delete cascade
  name           text
  blood_group    text  (O+/O-/A+/A-/B+/B-/AB+/AB-)
  state          text
  city           text
  contact        text  (phone shown on card)
  aadhaar_last4  text  (only last 4 digits stored; full number never persisted)
  aadhaar_ok     bool  (Verhoeff checksum passed at submit time)
  is_listed      bool  (public listing toggle, default true)
  created_at, updated_at
```

Row-Level Security:
- Anyone (anon + authenticated) can `SELECT` rows where `is_listed = true` AND `name`, `blood_group`, `state`, `city`, `contact` are all filled — that's how the public search works.
- A donor can `SELECT` / `INSERT` / `UPDATE` only their own row (`id = auth.uid()`).
- No `DELETE` from clients — account deletion is out of scope for this pass.
- A database trigger creates an empty `donors` row on `auth.users` signup so the profile page always has a row to edit.

**Aadhaar note (privacy):** we never store the full 12-digit Aadhaar number. The client validates the Verhoeff checksum, and only the last 4 digits + a boolean flag are saved. That still lets the donor confirm which Aadhaar they self-declared without holding a sensitive full ID number.

## Auth configuration

- Enable Lovable Cloud, then configure providers: Email/password (auto-confirm ON so donors don't need to check email during testing), Google, Phone OTP.
- Phone OTP: use Lovable Cloud's built-in phone provider. If the workspace requires a third-party SMS provider (e.g. GatewayAPI, Twilio) I'll surface that as a follow-up — the flow itself will be wired.
- Google: uses the built-in managed provider (no client-side setup needed from you).

## Files touched / added

- `src/routes/auth.tsx` — new: tabbed sign-in / sign-up UI.
- `src/routes/_authenticated.tsx` (or the integration-managed equivalent) — gate for `/profile`.
- `src/routes/_authenticated/profile.tsx` — new: donor profile form.
- `src/routes/index.tsx` — swap static `DONORS` for a Supabase query; header shows auth state.
- `src/routes/__root.tsx` — root auth-state subscriber that invalidates the router on sign-in / sign-out.
- `src/lib/aadhaar.ts` — Verhoeff checksum helper + input mask.
- Migration: `donors` table, RLS policies, GRANTs, signup trigger.

## Out of scope for this pass

- Real UIDAI / DigiLocker Aadhaar KYC (would require a paid third-party provider).
- Admin dashboard, donation history, donor availability calendar, donor ratings.
- Account deletion / data export flows.
- Password reset UI (can add next if you want it — it's a small follow-up).

If this looks right I'll enable Lovable Cloud and start building. Say the word and I'll go.