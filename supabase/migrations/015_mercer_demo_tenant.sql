-- Mercer Newport demo tenant (Demo only — not affiliated with Mercer Advisors)

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
  'mercer-newport-demo',
  'Private Property Planning Desk',
  'Mercer Newport Beach Advisory Team',
  'Private Wealth Advisory Team',
  'Mercer Advisors Demo',
  'demo@private-client-desk.local',
  'demo@private-client-desk.local',
  '(949) 555-0199',
  array['CA', 'CO']::text[],
  array[
    'Newport Beach',
    'Orange County',
    'Aspen',
    'Los Angeles',
    'Southern California'
  ]::text[],
  'CA',
  'This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice. Tax topics should be reviewed with a CPA, legal/entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent. Demo tenant only — example workflow; not affiliated with or endorsed by Mercer Advisors.',
  'Private Property Planning Desk | Demo',
  'Demo private client property planning workspace — example wealth advisory coordination (not affiliated with Mercer Advisors).'
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
