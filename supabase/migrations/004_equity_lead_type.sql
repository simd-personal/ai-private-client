-- Support equity Move Up Plan leads

alter table public.leads drop constraint if exists leads_lead_type_check;

alter table public.leads add constraint leads_lead_type_check
  check (lead_type in ('buyer', 'seller', 'equity'));
