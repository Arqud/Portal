-- Meta attribution forward: add the columns needed to persist + forward the full
-- 6-field attribution set to Duan's endpoint. meta_lead_id, meta_ad_id and
-- meta_campaign_id already exist on public.leads (0004_leads.sql) — this adds the
-- three that don't. meta_campaign_id starts being POPULATED by the capture paths
-- (poll cron + webhook Graph enrichment) as part of this change.
-- Run in Supabase SQL Editor → Dashboard > SQL Editor > New query.
-- MUST be applied to the prod DB BEFORE this code is deployed.

alter table public.leads add column if not exists meta_form_id      text;
alter table public.leads add column if not exists meta_form_version text; -- Meta does not expose this; stored null for now
alter table public.leads add column if not exists meta_adset_id     text;
