# Monitoring — armed for the auth-only PR #27 deployment

Scope: the narrow, auth-only `POST /api/leads/webhook` fail-closed deploy. This describes
**armed** alerts and an **active** deploy-window watch — not proposals. Per Acend's direction,
**no database table and no heartbeat cron** are introduced for this deployment.

## Failure modes this must catch

1. A legitimate caller (Make) fails auth → leads rejected → silent lead loss.
2. Ingestion stops for any reason → no leads landing.

## Signal 1 — first route-level 401 → immediate alert (ARMED)

**Mechanism (already in place): Make execution-error notifications.** A rejected lead makes the
Make HTTP module receive a `401`; with "Return error if HTTP request fails = Yes" (set) that is
an error, and with "Store incomplete executions = Yes" (set) the scenario records an incomplete
execution and Make sends its **execution-error notification**. This fires on the **first** failed
forward, per scenario (We Wash and Sparkling separately), and inherently covers `400`, `5xx` and
processing exceptions too — anything that makes the module error.

- **Escalate on the first 401, not the third.** Make notifies on the first error; treat that
  email as an escalation trigger, not something to wait-and-see.
- **Retained + replayable.** The same errored bundle is stored as an incomplete execution and
  is retryable, so a 401 during rollout loses nothing while both scenarios keep running.

**Arming checklist (one-time):**
- Confirm Make **email/error notifications are enabled** for the account/organisation owning both
  scenarios (Make → profile/organisation notification settings), so execution errors email out.
- Both scenarios have **Store incomplete executions = Yes** and the HTTP module has **Return
  error if HTTP request fails = Yes** (both set — see the Make evidence screenshots).

**Prove the channel fires (before go):** run one scenario **Run once** against a deployment that
returns 401 for it (e.g. the Preview URL without the bypass, or a temporary wrong token in a
non-production copy) and confirm the execution-error email arrives. Do this off production — never
send a lead-bearing probe to the live endpoint.

## Signal 2 — live Vercel log watch during the deploy window (ACTIVE)

During the deploy itself, tail production logs and watch for route-level `401`s on
`/api/leads/webhook`:

```
vercel logs <production-deployment-url> --scope arqud
```

Watch from the moment the new build goes live until the first naturally-arriving lead per brand
has been observed to ingest (200). A burst of `401`s here = a Make↔Vercel token mismatch; roll
back per the runbook (keep scenarios running, retain/replay). This watch is manual and bounded to
the rollout window — not a standing service.

## Signal 3 — per-brand last-successful-ingest (PASSIVE, calibrated)

Track the **latest successful lead timestamp separately for We Wash and Sparkling** from the CRM
(the `leads` table / portal lead list filtered by brand). This is observation of data that
already exists — no new table, no cron.

**Calibrated windows, not a fixed hour.** Total volume is ~11–12 leads/day across both brands, so
zero arrivals in any given hour is normal and a 1-hour zero-lead alarm would be pure noise. Derive
a per-brand "unexpectedly quiet" threshold from each brand's actual inter-arrival distribution
(e.g. the 95th–99th percentile gap between consecutive leads for that brand), and only treat a gap
beyond that as a signal. Recalibrate as volume changes.

## Explicitly out of scope for this deployment

- No `webhook_auth_failures` (or similar) database table.
- No `/api/cron/lead-heartbeat` or any heartbeat cron.

These were considered and are **not** part of the auth-only change.
