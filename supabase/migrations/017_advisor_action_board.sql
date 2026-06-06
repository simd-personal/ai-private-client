-- Advisor Action Intelligence Board — lead columns + action items table

alter table public.leads
  add column if not exists ai_advisor_action_board jsonb,
  add column if not exists ai_advisor_action_board_generated_at timestamptz,
  add column if not exists ai_advisor_action_board_source text,
  add column if not exists ai_advisor_action_board_model text,
  add column if not exists ai_advisor_action_board_stale boolean default false;

create table if not exists public.advisor_action_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  lane_role text not null,
  title text not null,
  description text,
  status text not null default 'open',
  priority text not null default 'medium',
  owner_name text,
  owner_role text,
  due_date timestamptz,
  related_data_room_item_id uuid references public.decision_data_room_items(id) on delete set null,
  client_visible boolean not null default false,
  admin_notes text,
  created_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advisor_action_items_status_check
    check (status in (
      'open',
      'in_progress',
      'waiting_on_client',
      'waiting_on_advisor',
      'complete',
      'not_needed'
    )),
  constraint advisor_action_items_priority_check
    check (priority in ('low', 'medium', 'high'))
);

create index if not exists advisor_action_items_lead_id_idx
  on public.advisor_action_items (lead_id);

create index if not exists advisor_action_items_tenant_id_idx
  on public.advisor_action_items (tenant_id);

alter table public.advisor_action_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'advisor_action_items'
      and policyname = 'No public access to advisor_action_items'
  ) then
    create policy "No public access to advisor_action_items"
      on public.advisor_action_items
      for all
      using (false);
  end if;
end $$;
