-- Phase 2: public result tokens, attribution, admin notes

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
