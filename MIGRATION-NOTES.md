# Migration: lead webhook now fails closed

**Branch:** `fix/webhook-fail-closed-auth`
**Affects:** `POST /api/leads/webhook` (live at `https://arno.arqudportal.co.za/api/leads/webhook`)

## What changed

The webhook previously skipped signature verification entirely whenever `META_APP_SECRET`
was unset — which it is in production. Any POST to the URL was ingested, forwarded to the
partner endpoint and triggered a real SMS to whatever number it carried. This was a known,
accepted-at-launch risk (see `docs/launch/2026-07-03-arno-meta-lead-launch-pack.md`, notes
under §"VERIFY MANUALLY before go-live") and is now closed.

A request is now accepted only if it satisfies **one** of:

- **Path A (Meta native):** valid `x-hub-signature-256`, HMAC-SHA256 over the exact raw body
  keyed with `META_APP_SECRET`.
- **Path B (Make / trusted forwarder):** `x-arqud-ingest-token` header matching the
  `MAKE_INGEST_TOKEN` env var, compared in constant time.

Anything else gets a `401` — **including when no secrets are configured at all**. There is no
longer any state in which an unauthenticated request is processed.

Ingestion itself is untouched: the `leads` insert, the forward payload and `sendSignedForward`
all behave exactly as before. This is an auth-gate change only.

The `GET` `hub.challenge` handshake (`META_WEBHOOK_VERIFY_TOKEN`) is unchanged.

## ⚠️ Rollout order — Make MUST be updated FIRST

Make.com is the only live caller and it does **not** sign its posts. **If you deploy this branch
before Make sends the token, every incoming lead will 401 and be silently lost** — no SMS, no CRM
row, no error surfaced to anyone. Leads are not retried by Meta on our behalf here. Do these in
order:

1. **Make + Vercel first (before any deploy).**
   - Generate a token, e.g. `openssl rand -hex 32`.
   - In the Make scenario's HTTP module for the portal webhook, add request header:
     `x-arqud-ingest-token: <token>`.
   - In Vercel (Production), add env var `MAKE_INGEST_TOKEN` = the same value.
   - Both sides must match exactly — no whitespace, no quotes.
2. **Then deploy this branch.** The new env var must exist in Vercel *before* the deploy that
   reads it.
3. **Verify a real lead flows.** Submit a test lead through the live form and confirm it lands in
   the CRM and the SMS fires, as normal.
4. **Confirm the hole is shut.** An unsigned, tokenless POST must now return `401`:
   ```
   curl -i -X POST https://arno.arqudportal.co.za/api/leads/webhook \
     -H 'Content-Type: application/json' -d '{"entry":[]}'
   ```
   Expect `HTTP/1.1 401 Unauthorized`. If this returns `200`, the fix is not live — stop and
   investigate before assuming the endpoint is protected.

## Rollback

Revert the deploy. Do **not** "fix" a lead outage by unsetting `MAKE_INGEST_TOKEN` — under the new
behaviour that rejects everything rather than opening the endpoint back up. If leads are 401ing,
the cause is a token mismatch between Make and Vercel; compare the two values.

## Notes

- `META_APP_SECRET` remains unset in prod and can stay that way. It is now only consulted for
  Path A. Setting it does **not** break Make (Path B is checked independently) — but per the
  launch pack this was previously a footgun, and that is no longer true.
- Both secrets are read per-request rather than at module load, so an env change takes effect on
  the next request rather than the next cold start.
- If a second trusted forwarder is added later, give it its own token rather than sharing this one.
