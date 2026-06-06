-- Run once in Supabase Cloud → SQL Editor (new project with no schema yet).
-- Order: 001 → 002 → 003 → 004

-- ========== 001_initial.sql ==========
create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_type text not null check (lead_type in ('buyer', 'seller')),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  preferred_contact_method text not null,
  consent_given boolean not null default false,
  quiz_data jsonb not null,
  ai_report jsonb not null,
  lead_score integer not null check (lead_score >= 0 and lead_score <= 100),
  lead_temperature text not null check (lead_temperature in ('cold', 'warm', 'hot')),
  internal_lead_summary text not null,
  suggested_follow_up_message text not null,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'booked', 'closed', 'not qualified')
  )
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  created_at timestamptz not null default now(),
  event_type text not null,
  event_data jsonb
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_lead_type_idx on public.leads (lead_type);
create index if not exists leads_lead_temperature_idx on public.leads (lead_temperature);
create index if not exists lead_events_lead_id_idx on public.lead_events (lead_id);

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

drop policy if exists "No public access to leads" on public.leads;
create policy "No public access to leads"
  on public.leads for all using (false) with check (false);

drop policy if exists "No public access to lead_events" on public.lead_events;
create policy "No public access to lead_events"
  on public.lead_events for all using (false) with check (false);

-- ========== 002_phase2_attribution_and_tokens.sql ==========
alter table public.leads
  add column if not exists public_result_token text unique,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists landing_page text,
  add column if not exists referrer text,
  add column if not exists user_agent text,
  add column if not exists gclid text,
  add column if not exists fbclid text,
  add column if not exists admin_notes text;

create index if not exists leads_public_result_token_idx
  on public.leads (public_result_token);
create index if not exists leads_utm_source_idx on public.leads (utm_source);
create index if not exists leads_status_idx on public.leads (status);

-- ========== 003_report_source.sql ==========
alter table public.leads
  add column if not exists report_source text
    check (report_source in ('openai', 'fallback'));

create index if not exists leads_report_source_idx on public.leads (report_source);

-- ========== 004_equity_lead_type.sql ==========
alter table public.leads drop constraint if exists leads_lead_type_check;

alter table public.leads add constraint leads_lead_type_check
  check (lead_type in ('buyer', 'seller', 'equity', 'wealth_forecast'));
