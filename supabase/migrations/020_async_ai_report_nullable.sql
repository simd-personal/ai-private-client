-- Async lead generation inserts the row before ai_report is generated.

alter table public.leads
  alter column ai_report drop not null;
