-- Brand-scoped staff logins.
-- When profiles.brand is set ('We Wash' | 'Sparkling'), the client portal:
--   * filters the Leads page (server-side) to that brand only, and
--   * locks the sidebar/nav to Leads (all other client pages redirect there).
-- NULL = a full client account (e.g. Arno) or an admin — behaviour unchanged.
alter table public.profiles
  add column if not exists brand text;
