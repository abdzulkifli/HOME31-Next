-- HOME31 V7.7.1 database verification
-- Run after 01-DATABASE-FRESH-INSTALL.sql.

select
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.initiatives') as initiatives_table,
  to_regclass('public.audit_log') as audit_log_table;

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('can_access_platform','is_super_admin','admin_set_user_role')
order by routine_name;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='initiatives'
  and column_name in (
    'implementation_year','estimated_cost','estimated_cost_confirmed',
    'estimated_cost_post_challenge','post_challenge_cost_confirmed',
    'approved_budget','approved_budget_confirmed','home31_fit_override'
  )
order by column_name;

select tablename, policyname, cmd
from pg_policies
where schemaname='public' and tablename in ('profiles','initiatives','audit_log')
order by tablename, policyname;
