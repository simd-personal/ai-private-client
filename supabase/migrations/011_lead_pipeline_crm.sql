-- Lead pipeline CRM: status tracking, follow-ups, deal value, and comment history

alter table public.leads
  add column if not exists lead_status text not null default 'new',
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists lead_notes text,
  add column if not exists lost_reason text,
  add column if not exists estimated_deal_value numeric,
  add column if not exists estimated_commission numeric,
  add column if not exists closed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_lead_status_check'
  ) then
    alter table public.leads
      add constraint leads_lead_status_check
      check (lead_status in (
        'new',
        'contacted',
        'appointment_scheduled',
        'listing_appointment',
        'buyer_consultation',
        'active_client',
        'under_contract',
        'closed',
        'lost'
      ));
  end if;
end $$;

create index if not exists leads_lead_status_idx
  on public.leads (lead_status);

create index if not exists leads_next_follow_up_at_idx
  on public.leads (next_follow_up_at);

create index if not exists leads_closed_at_idx
  on public.leads (closed_at);

create table if not exists public.lead_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  comment_text text not null,
  comment_type text not null default 'note',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint lead_comments_type_check
    check (comment_type in (
      'note',
      'call',
      'sms',
      'email',
      'meeting',
      'status_change',
      'system'
    ))
);

create index if not exists lead_comments_tenant_id_idx
  on public.lead_comments (tenant_id);

create index if not exists lead_comments_lead_id_idx
  on public.lead_comments (lead_id);

create index if not exists lead_comments_created_at_idx
  on public.lead_comments (created_at);

alter table public.lead_comments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lead_comments'
      and policyname = 'No public access to lead_comments'
  ) then
    create policy "No public access to lead_comments"
      on public.lead_comments
      for all
      using (false)
      with check (false);
  end if;
end $$;
