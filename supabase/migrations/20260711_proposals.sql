-- Proposals feature: pitch documents shared via public tokenized link with
-- typed-name acceptance. Run this in Supabase SQL Editor
-- (Dashboard > SQL Editor > New query). Spec: docs/superpowers/specs/2026-07-11-proposals-design.md

-- =============================================
-- 1. Proposals
-- =============================================
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_number text not null unique,          -- PRO-2026-001 via existing numbering pattern
  client_id uuid references public.clients(id),  -- nullable: prospect proposals have no client yet
  prospect_name text,                            -- required when client_id is null
  prospect_company text,
  prospect_email text,
  title text not null,
  intro text,                                    -- short pitch paragraph
  sections jsonb not null default '[]'::jsonb,   -- [{ "heading": text, "bullets": text[] }]
  terms text,
  valid_until date,
  status text not null default 'draft',          -- draft | sent | accepted | declined
  share_token text not null unique,              -- 32+ hex chars, crypto-random
  first_viewed_at timestamptz,                   -- set on first public GET while status='sent'
  accepted_by_name text,
  accepted_at timestamptz,
  accepted_ip text,
  declined_at timestamptz,
  decline_reason text,
  converted_to_invoice_id uuid references public.invoices(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_client_id_idx on public.proposals(client_id);
create index proposals_share_token_idx on public.proposals(share_token);

-- =============================================
-- 2. Proposal line items
-- =============================================
create table public.proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  rate numeric not null default 0,
  amount numeric not null default 0,
  sort_order int not null default 0
);
create index proposal_line_items_proposal_id_idx on public.proposal_line_items(proposal_id);

-- =============================================
-- 3. Document sequence seed (PRO numbering)
-- =============================================
-- The increment_document_sequence RPC lives in the database (not in repo
-- migrations); seed the ('proposal', 2026) row defensively so numbering works
-- even if the RPC expects an existing row — harmless otherwise.
insert into public.document_sequences (type, year, last_number)
values ('proposal', 2026, 0)
on conflict (type, year) do nothing;

-- =============================================
-- 4. RLS (posture mirrors migration 0003)
-- =============================================
-- All app access is server-side via the service-role admin client; RLS keeps
-- anon/authenticated roles out entirely (admin-only policies, no client read —
-- proposals are Morne<->recipient via link, never in the client portal).
alter table public.proposals           enable row level security;
alter table public.proposal_line_items enable row level security;

create policy "proposals: admin full"
  on public.proposals for all
  using (public.is_admin()) with check (public.is_admin());

create policy "proposal_line_items: admin full"
  on public.proposal_line_items for all
  using (public.is_admin()) with check (public.is_admin());
