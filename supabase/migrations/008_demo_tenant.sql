-- Seed a second demo tenant for isolation verification

insert into public.tenants (
  slug,
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  agent_license_number,
  brokerage_license_number,
  notification_email,
  contact_email,
  phone,
  booking_url,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text
)
values (
  'demo-agent',
  'Demo Luxury Realty',
  'Sarah Morgan',
  'Luxury Real Estate Advisor',
  'Demo Brokerage',
  'California DRE 00000000',
  'California DRE 11111111',
  'demo@example.com',
  'demo@example.com',
  '5555555555',
  'https://example.com/book-demo-agent',
  array['CA']::text[],
  array['Newport Beach', 'Irvine', 'Laguna Beach', 'Orange County']::text[],
  'CA',
  'Sarah Morgan will provide licensed California real estate guidance before any buying or selling decision. Demo Luxury Realty currently supports California real estate inquiries only.'
)
on conflict (slug) do update
set
  brand_name = excluded.brand_name,
  agent_name = excluded.agent_name,
  agent_title = excluded.agent_title,
  brokerage_name = excluded.brokerage_name,
  agent_license_number = excluded.agent_license_number,
  brokerage_license_number = excluded.brokerage_license_number,
  notification_email = excluded.notification_email,
  contact_email = excluded.contact_email,
  phone = excluded.phone,
  booking_url = excluded.booking_url,
  supported_states = excluded.supported_states,
  service_areas = excluded.service_areas,
  default_state = excluded.default_state,
  disclaimer_text = excluded.disclaimer_text,
  updated_at = now();
