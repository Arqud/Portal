alter table public.clients
  add column if not exists meta_access_token text;
