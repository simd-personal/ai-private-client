-- Multi-tenant core: tenants table + tenant scoping columns

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand_name text not null,
  agent_name text not null,
  agent_title text,
  brokerage_name text,
  agent_license_number text,
  brokerage_license_number text,
  notification_email text,
  contact_email text,
  phone text,
  booking_url text,
  logo_url text,
  primary_color text,
  accent_color text,
  supported_states text[] not null default array['CA']::text[],
  service_areas text[] not null default array[]::text[],
  default_state text not null default 'CA',
  disclaimer_text text,
  seo_base_title text,
  seo_base_description text,
  custom_domain text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

create policy "No public access to tenants"
  on public.tenants
  for all
  using (false)
  with check (false);

insert into public.tenants (
  slug,
  brand_name,
  agent_name,
  brokerage_name,
  agent_license_number,
  brokerage_license_number,
  supported_states,
  service_areas
)
values (
  'astoria',
  'Astoria Luxury Estates',
  'Justin Kuo',
  'Real Brokerage Technologies',
  'California DRE 02113892',
  'California DRE 02022092',
  array['CA']::text[],
  array[
    'Newport Beach',
    'Irvine',
    'Costa Mesa',
    'Laguna Beach',
    'Orange County'
  ]::text[]
)
on conflict (slug) do update
set
  brand_name = excluded.brand_name,
  agent_name = excluded.agent_name,
  brokerage_name = excluded.brokerage_name,
  agent_license_number = excluded.agent_license_number,
  brokerage_license_number = excluded.brokerage_license_number,
  supported_states = excluded.supported_states,
  service_areas = excluded.service_areas,
  updated_at = now();

alter table public.leads
  add column if not exists tenant_id uuid references public.tenants(id);

update public.leads
set tenant_id = t.id
from public.tenants t
where t.slug = 'astoria'
  and public.leads.tenant_id is null;

create index if not exists leads_tenant_id_idx
  on public.leads (tenant_id);

alter table public.site_events
  add column if not exists tenant_id uuid references public.tenants(id);

update public.site_events
set tenant_id = t.id
from public.tenants t
where t.slug = 'astoria'
  and public.site_events.tenant_id is null;

create index if not exists site_events_tenant_id_idx
  on public.site_events (tenant_id);
