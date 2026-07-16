# Migration: lead webhook — fail-closed auth (on branch `webhook-fail-closed`; NOT in production until PR #27 is deployed)

**Branch:** `webhook-fail-closed` (PR #27)
**Affects:** `POST /api/leads/webhook` (production: `https://arqudportal.co.za/api/leads/webhook`)
**Status:** prepared, NOT deployed. Production deployment is gated on Acend's narrow authorization.

## What changed

The webhook previously skipped signature verification entirely whenever `META_APP_SECRET`
was unset — which it is in production. In that state a **structurally valid, lead-bearing
unauthenticated POST could be ingested, forwarded to the partner endpoint and trigger a real
SMS** to whatever number it carried. (An empty or malformed POST created nothing; the exposure
was a well-formed lead payload.) This was a known, accepted-at-launch risk (see
`docs/launch/2026-07-03-arno-meta-lead-launch-pack.md`). **This branch closes it — but the fix
is NOT yet deployed: production remains fail-open until a production deployment containing
PR #27 is READY and serving the production alias (a merge alone is not sufficient).**

A request is accepted only if it satisfies **one** of:

- **Path A (Meta native):** valid `x-hub-signature-256`, HMAC-SHA256 over the exact raw body
  keyed with `META_APP_SECRET`.
- **Path B (Make / trusted forwarder):** `x-arqud-ingest-token` header matching the
  `MAKE_INGEST_TOKEN` env var, compared in constant time.

In the branch code, anything else gets a `401` — **including when no secrets are configured at
all** — so there is no longer any state (on this branch) in which an unauthenticated request is
processed. This becomes true in production only once PR #27 is deployed.

Ingestion itself is untouched: the `leads` insert, the forward payload and `sendSignedForward`
all behave exactly as before — this is an auth-gate change only. The `GET` `hub.challenge`
handshake was **also changed**: it now requires a **non-empty** `META_WEBHOOK_VERIFY_TOKEN`, so a
blank or unset env var can no longer match a blank `hub.verify_token` (previously it could open
the handshake). It is covered by tests for the unset, blank-env/blank-query and omitted-query cases.

## Credential design (per-environment, no shared secrets)

`MAKE_INGEST_TOKEN` **must be a distinct value in each Vercel environment**:

- **Production** — its own unique token. This is the only value the two live Make scenarios
  (We Wash + Sparkling) may send. It must never equal the Preview or Development value.
- **Preview** — a separate token, used only for the Preview canaries below.
- **Development** — a separate token, used only for local work.

A single shared value would let a Preview/Dev test or leak authenticate against Production, so
the values are scoped. The Path-B token is a reusable bearer accepted as immediate containment
only; body-bound HMAC, timestamp/replay controls, request-size limits and preferably a
separate Meta/Make endpoint are follow-up hardening.

## ⚠️ Rollout order — environment first, THEN deploy, Make BEFORE the endpoint tightens

On Vercel the environment is fixed at build time: **a variable added in the dashboard takes
effect only on the next deployment built AFTER it was set — never on the already-running
deployment.** Reading `process.env` per request does not change this. So:

1. **Set the Production `MAKE_INGEST_TOKEN`** (unique value) in Vercel, and set the distinct
   Preview and Development values.
2. **Add the header on BOTH live Make scenarios** (We Wash + Sparkling) — request header
   `x-arqud-ingest-token: <the Production token>`, exact match, no whitespace, no quotes.
   Sender side first, so a valid caller exists before the endpoint starts rejecting
   unauthenticated calls. Missing one scenario silently 401s that brand's leads on deploy.
3. **Run the Preview canaries (below) BEFORE any production deploy** — they confirm the
   fail-closed gate on a real deployment (absent/wrong → 401, correct → 200) without touching
   production.
4. **Deploy this branch to Production.** Because the deploy is built after step 1, it reads the
   new value. Confirm the production deployment's build timestamp is later than the variable's
   "updated" time.
5. **After deploy, watch the armed monitoring** (below) and confirm health by **passive
   observation of the next naturally-arriving lead from each brand** — never a production probe
   or generated lead.

## Verification — Preview-only canaries (no production probe, no live-form test)

Run these against the **Preview deployment** for this branch (behind Vercel Deployment
Protection — use a Protection-Bypass-for-Automation token via the
`x-vercel-protection-bypass` header so the request reaches the function rather than the SSO
edge). Each uses an **empty-entry** body `{"entry":[]}`, which authenticates/rejects without
creating any lead, forward or SMS:

- **absent token** → expect `401`.
- **wrong token** → expect `401`.
- **correct (Preview) token** in `x-arqud-ingest-token` → expect `200`.

Do **not** submit a lead through a live form, and do **not** send an unsigned or lead-bearing
POST to production — that path is mutating and can trigger a real SMS. The mocked route tests
are **regression coverage** of the auth gate and its side effects — they are **not** end-to-end
production proof. End-to-end confirmation happens after deploy as **passive observation of the
next naturally-arriving lead from each brand**, never a generated or probe lead.

## Rollback — must stay fail-closed

Do **not** `git revert` the fail-closed commit and do **not** redeploy the previous
(fail-open) production build: either one restores the unauthenticated endpoint. Choose a
rollback that keeps the gate shut:

1. **Token mismatch (leads 401ing, code fine)** — the cause is a Production token mismatch
   between Make and Vercel. Correct the value on whichever side is wrong and redeploy. The
   endpoint stays fail-closed throughout.
2. **Auth code defect** — deploy a forward compatibility fix that still rejects unauthenticated
   requests. Never roll back to a build that processes unauthenticated POSTs.
3. **Under a 401 storm, keep BOTH scenarios RUNNING and rely on retention (preferred).** With
   "Store incomplete executions" enabled on each scenario, a 401 becomes a stored incomplete
   execution that Make retries/replays — so failed bundles are retained while both scenarios
   stay live, no pause required. Do **not** pause Make as a first resort: a pause is only safe
   if Watch-Leads checkpoint catch-up **and** Meta-export recovery are proven, otherwise pausing
   can drop the window. Retain-and-replay while running is the fail-closed-safe default.

Because the change is auth-only — no schema change, no data migration — options 1 and 2 are a
single redeploy.

## Monitoring (armed for this deployment, not proposed)

See `MONITORING.md`. For this auth-only deploy the alerts are armed, not theoretical:

- **First route-level 401 → immediate alert.** A rejected lead fails the Make HTTP module;
  with "Store incomplete executions" on, that errors the scenario and fires **Make's
  execution-error notification on the FIRST failure** (not the third). This is the primary armed
  alert and it also covers 400/5xx and processing exceptions.
- **Live Vercel log watch during the deploy window** for route-level 401s on `/api/leads/webhook`.
- **Per-brand last-successful-ingest** tracked separately (We Wash vs Sparkling) from the CRM's
  latest lead timestamp per brand, with **brand-calibrated windows** from the actual arrival
  distribution — a 1-hour zero-lead alarm is invalid at ~11–12 leads/day.
- **No** database table or heartbeat cron is added for this auth-only deployment.

## Notes

- `META_APP_SECRET` remains unset in prod and can stay that way; it is only consulted for
  Path A. Setting it does not break Make (Path B is checked independently).
- Both secrets are read per-request rather than captured at module load, which avoids stale
  module-scope capture within a running deployment. It does **not** substitute for redeploying
  after an environment change — see the rollout note above.
- If a second trusted forwarder is added later, give it its own token rather than sharing this
  one.
