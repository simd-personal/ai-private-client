-- Private Client Property Desk — schema verification
-- Run in Supabase Dashboard → SQL Editor
--
-- NEW EMPTY PROJECT? Run supabase/cloud-bootstrap.sql FIRST, then re-run this file.

create temp table if not exists _verify_issues (
  issue text not null,
  detail text not null
);
truncate _verify_issues;

-- 1) Core tables
insert into _verify_issues (issue, detail)
with expected(name) as (
  values
    ('leads'),
    ('lead_events'),
    ('tenants'),
    ('site_events'),
    ('lead_comments'),
    ('tenant_domains')
)
select 'MISSING TABLE', e.name
from expected e
where not exists (
  select 1
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_name = e.name
);

-- 2) Critical leads columns
insert into _verify_issues (issue, detail)
with expected(col) as (
  values
    ('public_result_token'),
    ('report_source'),
    ('tenant_id'),
    ('lead_status'),
    ('next_follow_up_at'),
    ('estimated_deal_value'),
    ('ai_strategy_room'),
    ('ai_scenario_comparison'),
    ('ai_advisor_coordination_map'),
    ('ai_advisor_specific_briefs'),
    ('ai_deal_readiness'),
    ('ai_relationship_map'),
    ('ai_meeting_prep_pack'),
    ('ai_white_glove_follow_up'),
    ('ai_red_flags_missing_info'),
    ('ai_presentation_mode'),
    ('ai_demo_version'),
    ('ai_generated_at'),
    ('ai_generation_source'),
    ('ai_generation_model')
)
select 'MISSING COLUMN (leads)', e.col
from expected e
where to_regclass('public.leads') is not null
  and not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'leads'
      and c.column_name = e.col
  );

-- 3) lead_type check
insert into _verify_issues (issue, detail)
select 'INVALID lead_type CHECK', pg_get_constraintdef(c.oid)
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'leads'
  and c.conname = 'leads_lead_type_check'
  and pg_get_constraintdef(c.oid) not like '%wealth_forecast%';

-- 4) Tenant seed rows (safe — only runs when tenants table exists)
do $body$
begin
  if to_regclass('public.tenants') is not null then
    insert into _verify_issues (issue, detail)
    select 'MISSING TENANT ROW', required.slug
    from (values ('private-client'), ('demo-agent')) as required(slug)
    where not exists (
      select 1 from public.tenants t where t.slug = required.slug
    );
  end if;
end;
$body$;

-- 5) Storage bucket (optional)
do $body$
begin
  if to_regclass('storage.buckets') is not null then
    if not exists (select 1 from storage.buckets where id = 'tenant-logos') then
      insert into _verify_issues (issue, detail)
      values ('MISSING STORAGE BUCKET', 'tenant-logos');
    end if;
  end if;
end;
$body$;

-- Results: empty = all good
select issue, detail from _verify_issues order by issue, detail;

-- Summary
select
  'SUMMARY' as issue,
  format(
    '%s / 6 tables, %s leads columns — %s',
    (select count(*) from information_schema.tables
     where table_schema = 'public'
       and table_name in ('leads','lead_events','tenants','site_events','lead_comments','tenant_domains')),
    (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'leads'),
    case
      when to_regclass('public.leads') is null
        then 'Database is empty — run supabase/cloud-bootstrap.sql first'
      when exists (select 1 from _verify_issues)
        then 'Issues found above — run supabase/cloud-bootstrap.sql to fix'
      else 'All checks passed'
    end
  ) as detail;
