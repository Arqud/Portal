create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  priority text not null default 'med' check (priority in ('low','med','high')),
  due_date date,
  client_id uuid references public.clients(id) on delete set null,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_client_idx on public.tasks (client_id);
