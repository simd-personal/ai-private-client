-- Tenant custom domains and platform subdomains

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  domain text not null unique,
  domain_type text not null default 'custom_domain',
  status text not null default 'pending',
  verification_token text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_domains_status_check
    check (status in ('pending', 'verified', 'active', 'failed')),
  constraint tenant_domains_type_check
    check (domain_type in ('platform_subdomain', 'custom_domain'))
);

create index if not exists tenant_domains_tenant_id_idx
  on public.tenant_domains (tenant_id);

create index if not exists tenant_domains_domain_idx
  on public.tenant_domains (domain);

alter table public.tenant_domains enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenant_domains'
      and policyname = 'No public access to tenant_domains'
  ) then
    create policy "No public access to tenant_domains"
      on public.tenant_domains
      for all
      using (false)
      with check (false);
  end if;
end $$;
