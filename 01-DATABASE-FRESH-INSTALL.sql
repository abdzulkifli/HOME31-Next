-- HOME31 Enterprise Management Platform V7.7.1 FRESH INSTALL
-- Run this complete file ONCE in a brand-new Supabase project.
-- Do not run any upgrade SQL before or after this fresh-install file.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  department text,
  role text not null default 'normal_user'
    check (role in (
      'super_admin',
      'department_admin',
      'hr_admin',
      'finance_admin',
      'auditor',
      'viewer',
      'normal_user'
    )),
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  account_status text not null default 'active'
    check (account_status in ('active','disabled','locked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists must_change_password boolean not null default true,
  add column if not exists password_changed_at timestamptz,
  add column if not exists account_status text not null default 'active';

create table if not exists public.initiatives (
  id uuid primary key default gen_random_uuid(),
  initiative_name text not null check (char_length(initiative_name) between 1 and 150),
  department text not null,
  strategic_pillar text not null,
  accountable_owner text not null,
  executive_sponsor text,
  delivery_lead text,
  priority text not null default 'High',
  start_date date,
  value_measure text,
  value_baseline text,
  value_target text,
  value_frequency text,
  value_owner text,
  people_impact_level text,
  affected_workforce_groups text,
  roles_affected_count integer not null default 0 check (roles_affected_count >= 0),
  hr_owner text,
  new_roles_required boolean not null default false,
  redeployment_required boolean not null default false,
  organisation_design_impact text,
  capability_gap text,
  training_required text,
  training_plan_status text,
  change_management_required text,
  change_plan_status text,
  communication_plan_status text,
  hr_review_status text,
  hr_comments text,
  evidence_problem_status text,
  evidence_baseline_status text,
  evidence_business_case_status text,
  evidence_financial_status text,
  evidence_risk_status text,
  evidence_implementation_status text,
  evidence_hr_status text,
  evidence_stakeholder_status text,
  evidence_reference text,
  evidence_notes text,
  evidence_completeness integer not null default 0 check (evidence_completeness between 0 and 100),
  status text not null default 'Planning'
    check (status in ('Planning','In Progress','At Risk','On Hold','Completed')),
  risk_level text not null default 'Medium'
    check (risk_level in ('Low','Medium','High','Extreme')),
  progress integer not null default 0 check (progress between 0 and 100),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  target_date date,
  hr_collaboration_status text not null default 'Not required'
    check (hr_collaboration_status in ('Not required','Required','To be confirmed')),
  problem_opportunity text,
  expected_outcome text,
  next_action text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.initiatives
  add column if not exists source_reference_no text,
  add column if not exists implementation_year integer not null default 2027,
  add column if not exists project_description text,
  add column if not exists initiative_category text,
  add column if not exists priority_status text,
  add column if not exists strategic_thrust text,
  add column if not exists strategic_priority_area text,
  add column if not exists system_type text,
  add column if not exists ict_classification text,
  add column if not exists ict_remarks text,
  add column if not exists action_plan text,
  add column if not exists cba_ratio numeric(12,4),
  add column if not exists estimated_cost numeric(18,2) not null default 0,
  add column if not exists estimated_cost_post_challenge numeric(18,2) not null default 0,
  add column if not exists proposed_budget_post_retreat numeric(18,2),
  add column if not exists approved_budget numeric(18,2),
  add column if not exists post_challenge_remarks text,
  add column if not exists finance_remarks text,
  add column if not exists general_remarks text,
  add column if not exists evidence_ict_status text,
  add column if not exists evidence_challenge_status text,
  add column if not exists hr_collaboration_status text not null default 'Not required',
  add column if not exists problem_opportunity text,
  add column if not exists expected_outcome text,
  add column if not exists next_action text,
  add column if not exists executive_sponsor text,
  add column if not exists delivery_lead text,
  add column if not exists priority text not null default 'High',
  add column if not exists start_date date,
  add column if not exists value_measure text,
  add column if not exists value_baseline text,
  add column if not exists value_target text,
  add column if not exists value_frequency text,
  add column if not exists value_owner text,
  add column if not exists people_impact_level text,
  add column if not exists affected_workforce_groups text,
  add column if not exists roles_affected_count integer not null default 0,
  add column if not exists hr_owner text,
  add column if not exists new_roles_required boolean not null default false,
  add column if not exists redeployment_required boolean not null default false,
  add column if not exists organisation_design_impact text,
  add column if not exists capability_gap text,
  add column if not exists training_required text,
  add column if not exists training_plan_status text,
  add column if not exists change_management_required text,
  add column if not exists change_plan_status text,
  add column if not exists communication_plan_status text,
  add column if not exists hr_review_status text,
  add column if not exists hr_comments text,
  add column if not exists evidence_problem_status text,
  add column if not exists evidence_baseline_status text,
  add column if not exists evidence_business_case_status text,
  add column if not exists evidence_financial_status text,
  add column if not exists evidence_risk_status text,
  add column if not exists evidence_implementation_status text,
  add column if not exists evidence_hr_status text,
  add column if not exists evidence_stakeholder_status text,
  add column if not exists evidence_reference text,
  add column if not exists evidence_notes text,
  add column if not exists evidence_completeness integer not null default 0;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and account_status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    department,
    role,
    must_change_password
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'department', ''),
    'normal_user',
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    department = coalesce(nullif(excluded.department, ''), public.profiles.department),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, department, role, must_change_password)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', email),
  coalesce(raw_user_meta_data->>'department', ''),
  'normal_user',
  true
from auth.users
on conflict (id) do nothing;

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Super-admin access required';
  end if;

  if new_role not in (
    'super_admin',
    'department_admin',
    'hr_admin',
    'finance_admin',
    'auditor',
    'viewer',
    'normal_user'
  ) then
    raise exception 'Invalid role';
  end if;

  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists initiatives_set_updated_at on public.initiatives;
create trigger initiatives_set_updated_at
before update on public.initiatives
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.initiatives enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_super_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update to authenticated
using (id = auth.uid() or public.is_super_admin())
with check (id = auth.uid() or public.is_super_admin());

drop policy if exists "Users view initiatives" on public.initiatives;
create policy "Users view initiatives"
on public.initiatives for select to authenticated
using (created_by = auth.uid() or public.is_super_admin());

drop policy if exists "Users create initiatives" on public.initiatives;
create policy "Users create initiatives"
on public.initiatives for insert to authenticated
with check (created_by = auth.uid() or public.is_super_admin());

drop policy if exists "Users update initiatives" on public.initiatives;
create policy "Users update initiatives"
on public.initiatives for update to authenticated
using (created_by = auth.uid() or public.is_super_admin())
with check (created_by = auth.uid() or public.is_super_admin());

drop policy if exists "Users delete initiatives" on public.initiatives;
create policy "Users delete initiatives"
on public.initiatives for delete to authenticated
using (created_by = auth.uid() or public.is_super_admin());

drop policy if exists "Super admins view audit log" on public.audit_log;
create policy "Super admins view audit log"
on public.audit_log for select to authenticated
using (public.is_super_admin());

grant usage on schema public to authenticated;
grant select on public.profiles, public.initiatives, public.audit_log to authenticated;
grant insert, update, delete on public.initiatives to authenticated;
grant update (full_name, department, must_change_password, password_changed_at, updated_at)
  on public.profiles to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- After registering your own account, promote the first super admin:
-- update public.profiles
-- set role = 'super_admin', must_change_password = false
-- where email = 'YOUR-ADMIN-EMAIL';

-- HOME31 V7.7.1 integrated security and data-integrity controls.
-- These statements are part of this fresh installation, not a separate upgrade.

-- 1. Distinguish unassessed financial values from confirmed zero values.
alter table public.initiatives
  add column if not exists estimated_cost_confirmed boolean not null default false,
  add column if not exists post_challenge_cost_confirmed boolean not null default false,
  add column if not exists proposed_budget_confirmed boolean not null default false,
  add column if not exists approved_budget_confirmed boolean not null default false,
  add column if not exists home31_fit_override text;

update public.initiatives
set estimated_cost_confirmed = true
where estimated_cost is not null and estimated_cost <> 0;

update public.initiatives
set post_challenge_cost_confirmed = true
where estimated_cost_post_challenge is not null and estimated_cost_post_challenge <> 0;

update public.initiatives
set proposed_budget_confirmed = true
where proposed_budget_post_retreat is not null;

update public.initiatives
set approved_budget_confirmed = true
where approved_budget is not null;

alter table public.initiatives
  alter column estimated_cost drop not null,
  alter column estimated_cost drop default,
  alter column estimated_cost_post_challenge drop not null,
  alter column estimated_cost_post_challenge drop default;

alter table public.initiatives
  drop constraint if exists initiatives_home31_fit_override_check,
  add constraint initiatives_home31_fit_override_check check (
    home31_fit_override is null or home31_fit_override in (
      'Core Initiative',
      'Enabler',
      'Supporting Activity',
      'BAU · Supporting Enhancement',
      'Duplicate / Consolidate',
      'Needs Validation',
      'Policy Review'
    )
  );

-- 2. Access helpers enforce active accounts and completed first-login password changes.
create or replace function public.can_access_platform()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_status = 'active'
      and must_change_password = false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and account_status = 'active'
      and must_change_password = false
  );
$$;

-- Restrict stored roles to the two roles implemented by this release.
alter table public.profiles
  drop constraint if exists profiles_role_check,
  add constraint profiles_role_check
    check (role in ('super_admin', 'normal_user'));

-- 3. Restrict the role-management RPC to implemented roles and preserve one active super admin.
create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
  target_status text;
  active_super_admins integer;
begin
  if not public.is_super_admin() then
    raise exception 'Super-admin access required';
  end if;

  if new_role not in ('super_admin', 'normal_user') then
    raise exception 'Only Super Admin and Normal User roles are implemented in this release';
  end if;

  select role, account_status
  into target_role, target_status
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'Target profile not found';
  end if;

  if target_role = 'super_admin'
     and target_status = 'active'
     and new_role <> 'super_admin' then
    select count(*) into active_super_admins
    from public.profiles
    where role = 'super_admin' and account_status = 'active';

    if active_super_admins <= 1 then
      raise exception 'The last active super admin cannot be demoted';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- 4. Replace direct profile and initiative access policies.
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_super_admin());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update to authenticated
using (
  (id = auth.uid() and account_status = 'active' and must_change_password = false)
  or public.is_super_admin()
)
with check (
  (id = auth.uid() and account_status = 'active' and must_change_password = false)
  or public.is_super_admin()
);

drop policy if exists "Users view initiatives" on public.initiatives;
create policy "Users view initiatives"
on public.initiatives for select to authenticated
using (
  public.can_access_platform()
  and (created_by = auth.uid() or public.is_super_admin())
);

drop policy if exists "Users create initiatives" on public.initiatives;
create policy "Users create initiatives"
on public.initiatives for insert to authenticated
with check (
  public.can_access_platform()
  and (created_by = auth.uid() or public.is_super_admin())
);

drop policy if exists "Users update initiatives" on public.initiatives;
create policy "Users update initiatives"
on public.initiatives for update to authenticated
using (
  public.can_access_platform()
  and (created_by = auth.uid() or public.is_super_admin())
)
with check (
  public.can_access_platform()
  and (created_by = auth.uid() or public.is_super_admin())
);

drop policy if exists "Users delete initiatives" on public.initiatives;
create policy "Users delete initiatives"
on public.initiatives for delete to authenticated
using (
  public.can_access_platform()
  and (created_by = auth.uid() or public.is_super_admin())
);

-- Remove direct control of password-governance and role fields from browser clients.
revoke update on public.profiles from authenticated;
grant update (full_name, department, updated_at) on public.profiles to authenticated;
grant execute on function public.can_access_platform() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 5. Keep audit records when a profile is removed.
alter table public.audit_log
  drop constraint if exists audit_log_actor_id_fkey;
alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

-- 6. Audit initiative changes and privileged profile changes.
create or replace function public.write_home31_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_id uuid;
begin
  if tg_op = 'DELETE' then
    record_id := old.id;
  else
    record_id := new.id;
  end if;

  insert into public.audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  ) values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    record_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists initiatives_audit on public.initiatives;
create trigger initiatives_audit
after insert or update or delete on public.initiatives
for each row execute function public.write_home31_audit();

drop trigger if exists profiles_governance_audit on public.profiles;
create trigger profiles_governance_audit
after update on public.profiles
for each row
when (
  old.role is distinct from new.role
  or old.account_status is distinct from new.account_status
  or old.must_change_password is distinct from new.must_change_password
)
execute function public.write_home31_audit();
