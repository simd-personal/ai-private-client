-- First-party website activity tracking (anonymous until lead submission)

create table if not exists public.site_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null,
  lead_id uuid references public.leads (id) on delete set null,
  event_name text not null,
  page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  ip_hash text
);

create index if not exists site_events_created_at_idx
  on public.site_events (created_at desc);

create index if not exists site_events_session_id_idx
  on public.site_events (session_id);

create index if not exists site_events_lead_id_idx
  on public.site_events (lead_id);

create index if not exists site_events_event_name_idx
  on public.site_events (event_name);

create index if not exists site_events_page_path_idx
  on public.site_events (page_path);

create index if not exists site_events_utm_source_idx
  on public.site_events (utm_source);

create index if not exists site_events_utm_campaign_idx
  on public.site_events (utm_campaign);

alter table public.site_events enable row level security;

create policy "No public access to site_events"
  on public.site_events
  for all
  using (false)
  with check (false);
