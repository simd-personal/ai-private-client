-- Async lead generation status tracking

alter table public.leads
  add column if not exists generation_status text default 'intake_received',
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_completed_at timestamptz,
  add column if not exists generation_error text,
  add column if not exists generation_progress jsonb default '{}'::jsonb,
  add column if not exists base_report_status text default 'pending',
  add column if not exists strategy_room_status text default 'pending',
  add column if not exists decision_layer_status text default 'pending',
  add column if not exists advisor_action_board_status text default 'pending',
  add column if not exists presentation_status text default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_generation_status_check'
  ) then
    alter table public.leads
      add constraint leads_generation_status_check
      check (generation_status in (
        'intake_received',
        'generating',
        'partially_ready',
        'complete',
        'failed'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_base_report_status_check'
  ) then
    alter table public.leads
      add constraint leads_base_report_status_check
      check (base_report_status in ('pending', 'running', 'ready', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_strategy_room_status_check'
  ) then
    alter table public.leads
      add constraint leads_strategy_room_status_check
      check (strategy_room_status in ('pending', 'running', 'ready', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_decision_layer_status_check'
  ) then
    alter table public.leads
      add constraint leads_decision_layer_status_check
      check (decision_layer_status in ('pending', 'running', 'ready', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_advisor_action_board_status_check'
  ) then
    alter table public.leads
      add constraint leads_advisor_action_board_status_check
      check (advisor_action_board_status in ('pending', 'running', 'ready', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'leads_presentation_status_check'
  ) then
    alter table public.leads
      add constraint leads_presentation_status_check
      check (presentation_status in ('pending', 'running', 'ready', 'failed', 'skipped'));
  end if;
end $$;

create index if not exists leads_generation_status_idx
  on public.leads (generation_status);
