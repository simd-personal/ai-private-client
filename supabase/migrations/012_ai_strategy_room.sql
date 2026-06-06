-- Private Client Property Desk — AI Strategy Room demo layer

alter table public.leads
  add column if not exists ai_strategy_room jsonb,
  add column if not exists ai_scenario_comparison jsonb,
  add column if not exists ai_advisor_coordination_map jsonb,
  add column if not exists ai_advisor_specific_briefs jsonb,
  add column if not exists ai_deal_readiness jsonb,
  add column if not exists ai_relationship_map jsonb,
  add column if not exists ai_meeting_prep_pack jsonb,
  add column if not exists ai_white_glove_follow_up jsonb,
  add column if not exists ai_red_flags_missing_info jsonb,
  add column if not exists ai_presentation_mode jsonb,
  add column if not exists ai_demo_version text default 'strategy-room-v1',
  add column if not exists ai_generated_at timestamptz,
  add column if not exists ai_generation_source text,
  add column if not exists ai_generation_model text;

create index if not exists leads_ai_generated_at_idx
  on public.leads (ai_generated_at desc nulls last);
