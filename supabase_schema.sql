-- Execute no SQL Editor do seu projeto Supabase.
-- Uma linha de dados por usuário autenticado.
create table if not exists public.financeiro_workspace (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.financeiro_workspace enable row level security;
revoke all on public.financeiro_workspace from anon;
grant select,insert,update on public.financeiro_workspace to authenticated;
drop policy if exists "workspace_select_own" on public.financeiro_workspace;
create policy "workspace_select_own" on public.financeiro_workspace for select to authenticated using (auth.uid() = user_id);
drop policy if exists "workspace_insert_own" on public.financeiro_workspace;
create policy "workspace_insert_own" on public.financeiro_workspace for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "workspace_update_own" on public.financeiro_workspace;
create policy "workspace_update_own" on public.financeiro_workspace for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
