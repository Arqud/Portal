# Leads & Campaigns Upgrade + Lead Archive — Design Spec

**Date:** 2026-06-24
**Repo:** C:/dev/arqud-portal (Next.js, Tailwind v4 CSS-first, Supabase)
**Owner:** Morne / ARQUD · Client surface: Arno (Sparkling Investment Group)

## Goal
Make the portal's Leads and Campaigns tabs self-explanatory ("no teaching people how to use it") and add a never-delete **archive** for handled leads so they can be re-engaged later (warm-up / recovery SMS campaigns run elsewhere).

## Requirements

### 1. Branch rosters (always-visible, brand-scoped)
- Add a constants module `src/lib/leads/branches.ts`:
  - `WE_WASH_BRANCHES` (7): Eldo Glen (Centurion); Old Farm Road / Faerie Glen (Pretoria); Sunnyside (Pretoria); Greenhills (Randfontein); Maraisburg (Roodepoort); Sunward (Boksburg); Lagoon / Stamford Hill (Durban).
  - `SPARKLING_BRANCHES` (5): Menlyn (Pretoria); Glen Village / Faerie Glen (Pretoria); Rustenburg; Amanzimtoti (Durban); Somerset West (Cape Town).
- The branch filter pills show the **full roster for the selected brand tab**, even before any leads exist. Append any branch found in leads that isn't in the roster (defensive).
- When brand tab = "All", show both rosters (optionally grouped).
- **Fix the current bug:** pills are derived from all leads regardless of brand → scope them to the selected brand.

### 2. Brand-qualified branch labels
- In the leads table (and pills where sensible), show the branch as `<Brand> — <branch>` e.g. "We Wash — Sunward (Boksburg)". Brand derived via existing `getBrand()`.
- Rationale: two branches share "Faerie Glen" across brands; the brand prefix disambiguates at a glance.

### 3. Lead archive (never-delete, monthly)
- **Trigger (when a lead leaves Active → Archive): DEFAULT = B — status is `converted` OR `lost`** (resolved/finished). Active view = status `new` or `contacted`.
  - (Alternative the user may choose: A = on `contacted`. Build B unless told otherwise; keep the rule in one place so it's a one-line change.)
- Add an **Archive view** reachable from the Leads page (e.g. an "Active / Archive" segment or tab). Archive lists resolved leads **grouped by month** (month headers from `created_at`, newest first), same columns, retains ALL captured info (name, phone, branch, brand, campaign, status, dates).
- **Never auto-delete.** Archive is a status-derived view, not a destructive move. No schema change required.

### 4. Delete action (for junk/test leads only)
- Add a per-row **Delete** action (admin/owner) + a server action that **hard-deletes** a lead row, behind a **confirm dialog** ("Delete permanently? This can't be undone.").
- Purpose: clean up test/junk leads (e.g. "ZZ TEST", "MAP_FULL_NAME", "POSTREVAMP", dummy). NOT for real leads — those get archived, not deleted.

### 5. Modern polish (within existing design system)
- Tidy spacing/visual hierarchy on Leads + Campaigns using the existing `@theme` tokens and `src/components/ui` primitives. No redesign, no new dependencies. Keep it consistent with the dark-luxury aesthetic.

## Data model
- `leads` already has `status` (new|contacted|converted|lost) and `created_at`. Archive = status-derived filter. No migration needed.
- Delete = hard-delete row via Supabase admin client in a server action (owner-gated).

## Files (likely)
- `src/lib/leads/branches.ts` (new — rosters + helper)
- `src/app/client/leads/LeadsClient.tsx` (pills scoping, brand-qualified labels, Active/Archive segment, monthly grouping, delete row action)
- `src/app/client/leads/actions.ts` (new or existing — `deleteLead` server action, owner-gated)
- Reuse `getBrand`, `BRAND_TONE` from `src/lib/leads/brand.ts`.

## Out of scope (future)
- Actually SENDING SMS (needs an SMS provider) — archive only organises the audience for it.
- "Recovery SMS for people who didn't complete a form" — Meta provides no data for non-submitters; not buildable. Re-engagement targets submitted-but-not-converted leads (which the archive holds).
- Per-package campaign-name mapping in Make.com (separate, optional).

## Verification
- `npm run build` clean.
- Pills show all 7 WW under We Wash tab, all 5 under Sparkling, scoped correctly, before any leads exist.
- Branch labels read "We Wash — …" / "Sparkling — …".
- Archive view groups converted/lost leads by month; Active view excludes them.
- Delete removes a row after confirm; real leads are never auto-deleted.
