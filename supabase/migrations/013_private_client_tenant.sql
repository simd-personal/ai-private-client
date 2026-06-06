-- Seed Private Client Property Desk as the default production tenant

insert into public.tenants (
  slug,
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  notification_email,
  contact_email,
  phone,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text,
  seo_base_title,
  seo_base_description
)
values (
  'private-client',
  'Private Client Property Desk',
  'Your Advisory Team',
  'Licensed Real Estate & Advisory Coordination',
  'Private Client Advisory Group',
  'leads@private-client-desk.local',
  'hello@private-client-desk.local',
  '(949) 555-5555',
  array['CA']::text[],
  array[
    'Newport Beach',
    'Irvine',
    'Costa Mesa',
    'Laguna Beach',
    'Orange County',
    'Aspen'
  ]::text[],
  'CA',
  'This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice. Tax topics should be reviewed with a CPA, legal and entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent.',
  'Private Client Property Desk | AI Strategy Room',
  'AI-powered planning and coordination for complex real estate decisions involving agents, wealth advisors, CPAs, attorneys, and lenders.'
)
on conflict (slug) do update
set
  brand_name = excluded.brand_name,
  agent_name = excluded.agent_name,
  agent_title = excluded.agent_title,
  brokerage_name = excluded.brokerage_name,
  notification_email = excluded.notification_email,
  contact_email = excluded.contact_email,
  phone = excluded.phone,
  supported_states = excluded.supported_states,
  service_areas = excluded.service_areas,
  default_state = excluded.default_state,
  disclaimer_text = excluded.disclaimer_text,
  seo_base_title = excluded.seo_base_title,
  seo_base_description = excluded.seo_base_description,
  updated_at = now();

-- Backwards-compatible slug used by older links and localStorage keys
insert into public.tenants (
  slug,
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text,
  seo_base_title,
  seo_base_description
)
select
  'astoria',
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text,
  seo_base_title,
  seo_base_description
from public.tenants
where slug = 'private-client'
on conflict (slug) do update
set
  brand_name = excluded.brand_name,
  agent_name = excluded.agent_name,
  agent_title = excluded.agent_title,
  brokerage_name = excluded.brokerage_name,
  supported_states = excluded.supported_states,
  service_areas = excluded.service_areas,
  default_state = excluded.default_state,
  disclaimer_text = excluded.disclaimer_text,
  seo_base_title = excluded.seo_base_title,
  seo_base_description = excluded.seo_base_description,
  updated_at = now();
