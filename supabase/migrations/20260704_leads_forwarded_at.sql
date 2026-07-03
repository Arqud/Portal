-- Tracks when a lead was successfully forwarded to the speed-to-lead partner (Duan).
-- NULL = not yet forwarded (the backfill cron re-attempts these). Set to now() only
-- when the partner endpoint returns 2xx, so a failed/skipped forward is retried.
alter table public.leads add column if not exists forwarded_at timestamptz;

-- Speeds up the backfill query (find recent, un-forwarded, textable leads).
create index if not exists leads_forwarded_at_null_idx
  on public.leads (created_at)
  where forwarded_at is null;
