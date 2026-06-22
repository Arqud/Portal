# ARQUD Portal UI Revamp — Wave 2 (Admin + Login) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Re-skin the ARQUD **admin** dashboard and the **login/auth** pages in the elevated dark-luxury system already built in Wave 1, with zero changes to data or business logic.

**Architecture:** Reuse the existing component library (`src/components/ui/`) and design tokens (`globals.css`) shipped in Wave 1. Swap the admin layout from the old top-nav (`TopNav`) to the existing `Sidebar` (admin variant already supported), then re-compose each admin page + the login/auth pages from the shared components, wiring in existing server data unchanged.

**Tech Stack:** Next.js (this repo's pinned build), TypeScript, Tailwind v4 (CSS-first, no config), React Server + Client Components.

**Reference:** Match the look already shipped on the client side — read `src/app/client/dashboard/page.tsx` and `src/app/client/leads/LeadsClient.tsx` for the established pattern (PageHeader, Card, KpiCard, DataTable, Pill, Button, Tabs). Design spec: `docs/superpowers/specs/2026-06-20-arqud-portal-ui-revamp-design.md` (section 6, Wave 2).

## Global Constraints
- **No logic/data changes.** Presentation only — preserve every query, server action, route, form submission, modal behaviour, and prop.
- Reuse `@/components/ui` (Button, Pill, Card, KpiCard, Field/Input/Select/Textarea, Tabs, FilterPill, Table/Tr/Td/Avatar, PageHeader, AreaChart, Sidebar). Do NOT create parallel one-off styles when a component exists.
- Real data only — no fabricated metrics.
- Tailwind v4 CSS-first; no `tailwind.config.ts`. Tokens already defined; old token aliases exist (`arqud-black/night/ink/gold-glow`).
- This repo's Next.js is non-standard — read `node_modules/next/dist/docs/` before editing layouts/components.
- Commit per task, conventional messages. Ship via GitHub → Vercel.

## File Structure
- Modify: `src/app/admin/layout.tsx` (TopNav → Sidebar admin variant)
- Modify: `src/app/admin/overview/page.tsx`
- Modify: `src/app/admin/clients/page.tsx`, `src/app/admin/clients/[id]/page.tsx` + `ClientDetailClient.tsx`, `LeadsTab.tsx`, `EditClientForm.tsx`, `ClientDetailActions.tsx`, `UploadReportForm.tsx`, `UploadDocumentForm.tsx`, `clients/new/page.tsx` + `AddClientFormClient.tsx`
- Modify: `src/app/admin/finances/*` (FinancesClient, RevenueSummary, InvoiceTable, QuoteTable, TransactionsTab, InvoiceForm, QuoteForm, ConvertModal, InvoiceDetailModal, QuoteDetailModal)
- Modify: `src/app/admin/files/FilesClient.tsx` (+ `files/page.tsx`)
- Modify: `src/app/admin/settings/SettingsClient.tsx` (+ `settings/page.tsx`)
- Modify: `src/app/login/page.tsx`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`
- Can delete after: `src/components/TopNav.tsx` (only once no layout imports it)

**Verification per task (UI work):**
1. `npx tsc --noEmit` → no new errors
2. `npm run build` → success
3. `npm run dev` → eyeball the page against the client-side look
4. Commit

---

## Task 1: Admin layout → Sidebar
**Files:** Modify `src/app/admin/layout.tsx`
- [ ] **Step 1:** Read `src/app/admin/layout.tsx` and the existing `src/components/ui/Sidebar.tsx`. The `Sidebar` already supports `variant="admin"` with `ADMIN_NAV` (Overview, Clients, Campaigns, Finances, Files). Keep the existing admin `verifySession("admin")`/session + props.
- [ ] **Step 2:** Replace `<TopNav variant="admin" .../>` with the flex shell: `<Sidebar variant="admin" brandName="ARQUD" user={{...existing...}} />` + `<main className="flex-1 min-w-0">{children}</main>`. Pass the same user name/label the layout already has.
- [ ] **Step 3:** Verify `npm run build` clean; admin pages render inside the sidebar shell.
- [ ] **Step 4:** Commit: `feat(ui): admin sidebar layout shell`

## Task 2: Admin Overview
**Files:** Modify `src/app/admin/overview/page.tsx`
- [ ] **Step 1:** Read the current page — it has KPIs (Invoiced/Collected/Outstanding/YTD, Active Clients, Campaign Leads, Invoices this month), Recent Invoices table, Clients list. Note exact data.
- [ ] **Step 2:** Re-compose with `PageHeader`, `KpiCard` grid for the money/count stats, `Table`/`Tr`/`Td` for Recent Invoices (with status `Pill`: paid→converted, pending→contacted, overdue→danger), and a `Card` list for Clients (with `Avatar` + status `Pill`). `+ New Client` as a `Button`. Real data only.
- [ ] **Step 3:** Verify build clean.
- [ ] **Step 4:** Commit: `feat(ui): redesign admin overview`

## Task 3: Admin Clients (list + detail)
**Files:** Modify `clients/page.tsx`, `clients/[id]/page.tsx`, `ClientDetailClient.tsx`, `LeadsTab.tsx`, `ClientDetailActions.tsx`, `EditClientForm.tsx`, `UploadReportForm.tsx`, `UploadDocumentForm.tsx`, `clients/new/page.tsx`, `AddClientFormClient.tsx`
- [ ] **Step 1:** Read each file; preserve all queries, server actions (create/edit client, uploads), and the LeadsTab logic (reuse the same `getBrand` from `src/lib/leads/brand.ts`).
- [ ] **Step 2:** Re-skin: Clients list as a `Table` with `Avatar`+status `Pill`; client detail with `PageHeader`, `Card` sections, `Tabs` for sub-sections if present, `LeadsTab` reusing the client Leads styling (DataTable + Pills); forms use `Input`/`Select`/`Textarea` + `Button`. Preserve every form field + submit handler.
- [ ] **Step 3:** Verify build clean; create/edit/upload still work.
- [ ] **Step 4:** Commit (may be 2 commits: list, then detail+forms): `feat(ui): redesign admin clients`

## Task 4: Admin Finances
**Files:** Modify `finances/page.tsx`, `FinancesClient.tsx`, `RevenueSummary.tsx`, `InvoiceTable.tsx`, `QuoteTable.tsx`, `TransactionsTab.tsx`, `InvoiceForm.tsx`, `QuoteForm.tsx`, `ConvertModal.tsx`, `InvoiceDetailModal.tsx`, `QuoteDetailModal.tsx`
- [ ] **Step 1:** Read each; preserve all logic (invoice/quote CRUD, convert quote→invoice, transactions CSV upload, PDF, status updates, totals/VAT math). This is the most complex page — do NOT alter any calculation or action.
- [ ] **Step 2:** Re-skin: `RevenueSummary` → `KpiCard`s; `InvoiceTable`/`QuoteTable`/`TransactionsTab` → `Table` primitives + status `Pill`s + `Tabs` for the three sections; forms/modals → `Card`/`Input`/`Select`/`Button` (keep modal open/close + submit behaviour). Match the client look.
- [ ] **Step 3:** Verify build clean; create invoice/quote, convert, upload transactions, view/download still work.
- [ ] **Step 4:** Commit: `feat(ui): redesign admin finances`

## Task 5: Admin Files
**Files:** Modify `files/page.tsx`, `FilesClient.tsx`
- [ ] **Step 1:** Read; preserve upload + category logic + file list/download.
- [ ] **Step 2:** Re-skin with `PageHeader`, `Card` grid of files, `Input`/`Select`/`Button` for upload, category grouping preserved.
- [ ] **Step 3:** Verify build clean.
- [ ] **Step 4:** Commit: `feat(ui): redesign admin files`

## Task 6: Admin Settings
**Files:** Modify `settings/page.tsx`, `SettingsClient.tsx`
- [ ] **Step 1:** Read; preserve all settings fields + save action.
- [ ] **Step 2:** Re-skin with `PageHeader`, `Card` sections, `Input`/`Select`/`Textarea` + `Button`.
- [ ] **Step 3:** Verify build clean.
- [ ] **Step 4:** Commit: `feat(ui): redesign admin settings`

## Task 7: Login + auth pages
**Files:** Modify `login/page.tsx`, `auth/forgot-password/page.tsx`, `auth/reset-password/page.tsx`
- [ ] **Step 1:** Read each; preserve the auth server actions, subdomain branding logic in login, and form fields.
- [ ] **Step 2:** Re-skin a centered auth card: `Card` (or panel) with serif heading, `Input` fields, gold `Button`, on the dark gradient background. Keep the existing branding/logo logic. Match the premium feel.
- [ ] **Step 3:** Verify build clean; login + password reset flows still submit.
- [ ] **Step 4:** Commit: `feat(ui): redesign login + auth pages`

## Task 8: Cleanup + verify + ship
- [ ] **Step 1:** If no file imports `src/components/TopNav.tsx` anymore, delete it. Run `grep -rn "TopNav" src` to confirm zero imports first.
- [ ] **Step 2:** `npx tsc --noEmit` + `npm run build` both clean.
- [ ] **Step 3:** `npm run dev` walkthrough: admin sidebar nav + every admin page + login, all using the new system, no broken data/actions.
- [ ] **Step 4:** Commit any cleanup: `chore(ui): remove unused TopNav`. Push branch, open PR for Morne to test the admin preview.

## Out of scope
- No backend/data/logic changes. No new features. Client portal (Wave 1) already shipped.
