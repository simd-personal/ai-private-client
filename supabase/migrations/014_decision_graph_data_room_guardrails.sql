-- Private Client Decision Layer — graph, data room, timeline, meeting notes

alter table public.leads
  add column if not exists ai_decision_graph jsonb,
  add column if not exists ai_compliance_guardrails jsonb,
  add column if not exists ai_decision_timeline_summary jsonb,
  add column if not exists ai_data_room_suggestions jsonb,
  add column if not exists decision_stage text default 'exploration';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_decision_stage_check'
  ) then
    alter table public.leads
      add constraint leads_decision_stage_check
      check (decision_stage in (
        'exploration',
        'planning',
        'advisor_review',
        'execution_preparation'
      ));
  end if;
end $$;

create index if not exists leads_decision_stage_idx
  on public.leads (decision_stage);

create table if not exists public.decision_data_room_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  category text not null,
  item_name text not null,
  description text,
  requested_from text,
  advisor_owner text,
  status text not null default 'not_requested',
  priority text not null default 'medium',
  visibility text not null default 'admin',
  due_date timestamptz,
  storage_path text,
  file_name text,
  file_mime_type text,
  file_size_bytes integer,
  ai_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_data_room_status_check
    check (status in (
      'not_requested', 'requested', 'received', 'reviewed', 'not_needed'
    )),
  constraint decision_data_room_priority_check
    check (priority in ('low', 'medium', 'high')),
  constraint decision_data_room_visibility_check
    check (visibility in ('public', 'admin'))
);

create index if not exists decision_data_room_lead_id_idx
  on public.decision_data_room_items (lead_id);

create index if not exists decision_data_room_tenant_id_idx
  on public.decision_data_room_items (tenant_id);

create index if not exists decision_data_room_category_idx
  on public.decision_data_room_items (category);

create table if not exists public.decision_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  version_number integer not null,
  change_source text not null,
  changed_by text,
  previous_snapshot jsonb,
  new_snapshot jsonb,
  ai_change_summary jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists decision_versions_lead_version_idx
  on public.decision_versions (lead_id, version_number);

create index if not exists decision_versions_lead_id_idx
  on public.decision_versions (lead_id);

create table if not exists public.lead_meeting_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  note_title text,
  note_body text not null,
  meeting_date timestamptz,
  attendees jsonb not null default '[]'::jsonb,
  ai_summary jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_meeting_notes_lead_id_idx
  on public.lead_meeting_notes (lead_id);

alter table public.decision_data_room_items enable row level security;
alter table public.decision_versions enable row level security;
alter table public.lead_meeting_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'decision_data_room_items'
      and policyname = 'No public access to decision_data_room_items'
  ) then
    create policy "No public access to decision_data_room_items"
      on public.decision_data_room_items for all using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'decision_versions'
      and policyname = 'No public access to decision_versions'
  ) then
    create policy "No public access to decision_versions"
      on public.decision_versions for all using (false) with check (false);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'lead_meeting_notes'
      and policyname = 'No public access to lead_meeting_notes'
  ) then
    create policy "No public access to lead_meeting_notes"
      on public.lead_meeting_notes for all using (false) with check (false);
  end if;
end $$;

-- Optional upload bucket foundation
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'private-client-data-room',
  'private-client-data-room',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
