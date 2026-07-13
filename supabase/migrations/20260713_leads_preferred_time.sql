-- Preferred-time answer from the Meta lead form dropdown ("When would you like your car done?").
-- Run manually in Supabase SQL Editor → Dashboard > SQL Editor > New query.
alter table public.leads add column if not exists preferred_time text;
