-- Fast deterministic public brief for immediate result page usefulness

alter table public.leads
  add column if not exists fast_public_brief jsonb,
  add column if not exists fast_public_brief_generated_at timestamptz,
  add column if not exists public_result_ready_at timestamptz;
