create extension if not exists pgcrypto;
create extension if not exists citext;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  full_name text not null,
  role text not null check (role in ('admin', 'member')),
  locale text not null default 'es-DO',
  currency_code text not null default 'DOP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  client_name text not null,
  location text not null,
  status text not null check (status in ('draft', 'active', 'paused', 'completed')),
  start_date date not null,
  end_date date,
  notes text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists public.budget_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  version_name text not null,
  status text not null check (status in ('draft', 'approved', 'archived')),
  is_locked boolean not null default false,
  approved_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  budget_version_id uuid not null references public.budget_versions (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete restrict,
  phase text,
  area text,
  line_code text,
  description text not null,
  quantity numeric(14, 2),
  unit text,
  unit_price numeric(14, 2),
  total_budgeted numeric(14, 2) not null default 0,
  notes text not null default '',
  sort_order integer not null default 0,
  is_manual_total boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  budget_line_id uuid references public.budget_lines (id) on delete set null,
  category_id uuid references public.categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete restrict,
  transaction_type text not null check (transaction_type in ('expense', 'income')),
  transaction_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  detail text not null,
  payee_or_source text not null,
  payment_method text not null,
  external_reference text not null default '',
  contractor_contract_id uuid,
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  full_name text not null,
  trade text not null default '',
  phone text not null default '',
  email citext,
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  project_id uuid not null references public.projects (id) on delete restrict,
  contractor_id uuid not null references public.contractors (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  subcategory_id uuid references public.subcategories (id) on delete restrict,
  scope_description text not null,
  agreed_total numeric(14, 2) not null check (agreed_total > 0),
  status text not null check (status in ('draft', 'active', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  contractor_contract_id uuid not null references public.contractor_contracts (id) on delete restrict,
  transaction_id uuid not null unique references public.transactions (id) on delete restrict,
  payment_date date not null,
  amount numeric(14, 2) not null check (amount > 0),
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractor_payment_contract_fk'
  ) then
    alter table public.transactions
      add constraint contractor_payment_contract_fk
      foreign key (contractor_contract_id)
      references public.contractor_contracts (id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists budget_versions_one_approved_per_project
  on public.budget_versions (project_id)
  where status = 'approved';

create index if not exists projects_org_status_idx
  on public.projects (organization_id, status);

create index if not exists categories_org_sort_idx
  on public.categories (organization_id, sort_order);

create index if not exists subcategories_category_sort_idx
  on public.subcategories (category_id, sort_order);

create index if not exists budget_versions_org_project_idx
  on public.budget_versions (organization_id, project_id, status);

create index if not exists budget_lines_project_version_idx
  on public.budget_lines (organization_id, project_id, budget_version_id)
  where deleted_at is null;

create index if not exists transactions_project_date_idx
  on public.transactions (organization_id, project_id, transaction_date desc)
  where deleted_at is null;

create index if not exists transactions_project_type_idx
  on public.transactions (organization_id, project_id, transaction_type)
  where deleted_at is null;

create index if not exists contractor_contracts_project_idx
  on public.contractor_contracts (organization_id, project_id, contractor_id);

create index if not exists contractor_payments_contract_idx
  on public.contractor_payments (organization_id, contractor_contract_id)
  where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles as p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.assert_subcategory_category_match()
returns trigger
language plpgsql
as $$
begin
  if new.subcategory_id is null then
    return new;
  end if;

  if new.category_id is null then
    raise exception 'subcategory_id requires category_id';
  end if;

  if not exists (
    select 1
    from public.subcategories as s
    where s.id = new.subcategory_id
      and s.category_id = new.category_id
      and s.organization_id = new.organization_id
  ) then
    raise exception 'subcategory does not belong to category';
  end if;

  return new;
end;
$$;

create or replace function public.assert_budget_version_project_match()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.budget_versions as v
    where v.id = new.budget_version_id
      and v.project_id = new.project_id
      and v.organization_id = new.organization_id
  ) then
    raise exception 'budget version does not belong to project';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_locked_budget_version_changes()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked then
    raise exception 'locked budget versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_locked_budget_line_changes()
returns trigger
language plpgsql
as $$
declare
  target_version_id uuid := coalesce(new.budget_version_id, old.budget_version_id);
begin
  if exists (
    select 1
    from public.budget_versions as v
    where v.id = target_version_id
      and v.is_locked = true
  ) then
    raise exception 'budget lines in locked versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists subcategories_set_updated_at on public.subcategories;
create trigger subcategories_set_updated_at
before update on public.subcategories
for each row
execute function public.set_updated_at();

drop trigger if exists budget_versions_set_updated_at on public.budget_versions;
create trigger budget_versions_set_updated_at
before update on public.budget_versions
for each row
execute function public.set_updated_at();

drop trigger if exists budget_lines_set_updated_at on public.budget_lines;
create trigger budget_lines_set_updated_at
before update on public.budget_lines
for each row
execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

drop trigger if exists contractors_set_updated_at on public.contractors;
create trigger contractors_set_updated_at
before update on public.contractors
for each row
execute function public.set_updated_at();

drop trigger if exists contractor_contracts_set_updated_at on public.contractor_contracts;
create trigger contractor_contracts_set_updated_at
before update on public.contractor_contracts
for each row
execute function public.set_updated_at();

drop trigger if exists contractor_payments_set_updated_at on public.contractor_payments;
create trigger contractor_payments_set_updated_at
before update on public.contractor_payments
for each row
execute function public.set_updated_at();

drop trigger if exists budget_lines_category_guard on public.budget_lines;
create trigger budget_lines_category_guard
before insert or update on public.budget_lines
for each row
execute function public.assert_subcategory_category_match();

drop trigger if exists transactions_category_guard on public.transactions;
create trigger transactions_category_guard
before insert or update on public.transactions
for each row
execute function public.assert_subcategory_category_match();

drop trigger if exists contractor_contracts_category_guard on public.contractor_contracts;
create trigger contractor_contracts_category_guard
before insert or update on public.contractor_contracts
for each row
execute function public.assert_subcategory_category_match();

drop trigger if exists budget_lines_project_guard on public.budget_lines;
create trigger budget_lines_project_guard
before insert or update on public.budget_lines
for each row
execute function public.assert_budget_version_project_match();

drop trigger if exists budget_versions_locked_guard on public.budget_versions;
create trigger budget_versions_locked_guard
before update or delete on public.budget_versions
for each row
execute function public.prevent_locked_budget_version_changes();

drop trigger if exists budget_lines_locked_guard on public.budget_lines;
create trigger budget_lines_locked_guard
before insert or update or delete on public.budget_lines
for each row
execute function public.prevent_locked_budget_line_changes();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.budget_versions enable row level security;
alter table public.budget_lines enable row level security;
alter table public.transactions enable row level security;
alter table public.contractors enable row level security;
alter table public.contractor_contracts enable row level security;
alter table public.contractor_payments enable row level security;

drop policy if exists organizations_same_org on public.organizations;
create policy organizations_same_org
on public.organizations
for all
using (id = public.current_organization_id())
with check (id = public.current_organization_id());

drop policy if exists profiles_same_org on public.profiles;
create policy profiles_same_org
on public.profiles
for select
using (organization_id = public.current_organization_id());

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists projects_same_org on public.projects;
create policy projects_same_org
on public.projects
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists categories_same_org on public.categories;
create policy categories_same_org
on public.categories
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists subcategories_same_org on public.subcategories;
create policy subcategories_same_org
on public.subcategories
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists budget_versions_same_org on public.budget_versions;
create policy budget_versions_same_org
on public.budget_versions
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists budget_lines_same_org on public.budget_lines;
create policy budget_lines_same_org
on public.budget_lines
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists transactions_same_org on public.transactions;
create policy transactions_same_org
on public.transactions
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists contractors_same_org on public.contractors;
create policy contractors_same_org
on public.contractors
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists contractor_contracts_same_org on public.contractor_contracts;
create policy contractor_contracts_same_org
on public.contractor_contracts
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

drop policy if exists contractor_payments_same_org on public.contractor_payments;
create policy contractor_payments_same_org
on public.contractor_payments
for all
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create or replace view public.budget_vs_actual
with (security_invoker = true) as
with budget_totals as (
  select
    bl.organization_id,
    bl.project_id,
    bl.category_id,
    bl.subcategory_id,
    sum(bl.total_budgeted) as budgeted
  from public.budget_lines as bl
  inner join public.budget_versions as bv
    on bv.id = bl.budget_version_id
  where bl.deleted_at is null
    and (bv.status = 'approved' or bv.is_locked = true)
  group by bl.organization_id, bl.project_id, bl.category_id, bl.subcategory_id
),
actual_totals as (
  select
    t.organization_id,
    t.project_id,
    t.category_id,
    t.subcategory_id,
    sum(t.amount) as actual
  from public.transactions as t
  where t.deleted_at is null
    and t.transaction_type = 'expense'
  group by t.organization_id, t.project_id, t.category_id, t.subcategory_id
)
select
  concat_ws(
    ':',
    coalesce(coalesce(b.category_id, a.category_id)::text, 'none'),
    coalesce(coalesce(b.subcategory_id, a.subcategory_id)::text, 'none')
  ) as key,
  coalesce(b.organization_id, a.organization_id) as organization_id,
  coalesce(b.project_id, a.project_id) as project_id,
  coalesce(b.category_id, a.category_id) as category_id,
  coalesce(c.name, 'Sin categoria') as category_name,
  coalesce(b.subcategory_id, a.subcategory_id) as subcategory_id,
  coalesce(s.name, 'Sin subcategoria') as subcategory_name,
  coalesce(b.budgeted, 0)::numeric(14, 2) as budgeted,
  coalesce(a.actual, 0)::numeric(14, 2) as actual,
  (coalesce(b.budgeted, 0) - coalesce(a.actual, 0))::numeric(14, 2) as remaining,
  (coalesce(a.actual, 0) - coalesce(b.budgeted, 0))::numeric(14, 2) as variance,
  case
    when coalesce(b.budgeted, 0) > 0 then
      round(((coalesce(a.actual, 0) - coalesce(b.budgeted, 0)) / b.budgeted) * 100, 2)
    else 0
  end as variance_percent,
  case
    when coalesce(a.actual, 0) > coalesce(b.budgeted, 0) then 'over_budget'
    else 'on_track'
  end as status
from budget_totals as b
full outer join actual_totals as a
  on a.organization_id = b.organization_id
 and a.project_id = b.project_id
 and a.category_id is not distinct from b.category_id
 and a.subcategory_id is not distinct from b.subcategory_id
left join public.categories as c
  on c.id = coalesce(b.category_id, a.category_id)
left join public.subcategories as s
  on s.id = coalesce(b.subcategory_id, a.subcategory_id);

create or replace view public.project_cashflow
with (security_invoker = true) as
select
  t.organization_id,
  t.project_id,
  to_char(t.transaction_date, 'YYYY-MM') as month_key,
  sum(case when t.transaction_type = 'income' then t.amount else 0 end)::numeric(14, 2) as total_income,
  sum(case when t.transaction_type = 'expense' then t.amount else 0 end)::numeric(14, 2) as total_expense,
  sum(case when t.transaction_type = 'income' then t.amount else -t.amount end)::numeric(14, 2) as net_cashflow
from public.transactions as t
where t.deleted_at is null
group by t.organization_id, t.project_id, to_char(t.transaction_date, 'YYYY-MM');

create or replace view public.monthly_control
with (security_invoker = true) as
select
  t.organization_id,
  t.project_id,
  t.id as transaction_id,
  to_char(t.transaction_date, 'YYYY-MM') as month_key,
  t.transaction_date,
  coalesce(c.name, 'Sin categoria') as category_name,
  coalesce(s.name, 'Sin subcategoria') as subcategory_name,
  t.detail,
  t.payee_or_source as vendor,
  t.amount,
  t.payment_method
from public.transactions as t
left join public.categories as c
  on c.id = t.category_id
left join public.subcategories as s
  on s.id = t.subcategory_id
where t.deleted_at is null
  and t.transaction_type = 'expense';

create or replace view public.contractor_balances
with (security_invoker = true) as
with payment_totals as (
  select
    cp.organization_id,
    cp.contractor_contract_id,
    sum(cp.amount) as total_paid,
    max(cp.payment_date) as last_payment_date
  from public.contractor_payments as cp
  where cp.deleted_at is null
  group by cp.organization_id, cp.contractor_contract_id
)
select
  cc.organization_id,
  cc.project_id,
  cc.id as contractor_contract_id,
  cc.contractor_id,
  c.full_name as contractor_name,
  cc.scope_description,
  cc.agreed_total,
  coalesce(pt.total_paid, 0)::numeric(14, 2) as total_paid,
  (cc.agreed_total - coalesce(pt.total_paid, 0))::numeric(14, 2) as pending_balance,
  pt.last_payment_date
from public.contractor_contracts as cc
inner join public.contractors as c
  on c.id = cc.contractor_id
left join payment_totals as pt
  on pt.contractor_contract_id = cc.id
 and pt.organization_id = cc.organization_id;
