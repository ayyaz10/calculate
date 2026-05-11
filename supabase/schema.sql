create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type text not null,
  goal_type text not null default 'performance',
  start_value numeric,
  target_value numeric,
  unit text not null default '',
  deadline date,
  allow_multiple_entries_per_day boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  name text not null,
  unit text not null default '',
  color_key text not null default 'lime',
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  date date not null,
  completed boolean,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, goal_id, date)
);

alter table public.goals
  add column if not exists goal_type text not null default 'performance';

alter table public.goals
  add column if not exists start_value numeric;

alter table public.goals
  add column if not exists allow_multiple_entries_per_day boolean not null default false;

alter table public.goals
  add column if not exists sort_order integer not null default 0;

alter table public.entries
  add column if not exists completed boolean;

alter table public.entries
  drop constraint if exists entries_user_id_goal_id_date_key;

update public.goals
set goal_type = case
  when type in ('walking', 'pomodoro') then 'accumulative'
  when type = 'selfControl' then 'binary'
  else 'performance'
end
where goal_type = 'performance';

update public.goals
set
  goal_type = split_part(type, ':', 1),
  start_value = coalesce(
    start_value,
    nullif(substring(type from ':start=([-0-9.]+)'), '')::numeric
  ),
  allow_multiple_entries_per_day = case
    when type like '%:multi=1%' then true
    else allow_multiple_entries_per_day
  end,
  type = coalesce(nullif(split_part(type, ':', 2), ''), 'custom')
where type ~ '^(performance|accumulative|binary):';

alter table public.goals
  drop constraint if exists goals_goal_type_check;

alter table public.goals
  add constraint goals_goal_type_check
  check (goal_type in ('performance', 'accumulative', 'binary'));

create table if not exists public.entry_values (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  value numeric not null,
  unique (entry_id, metric_id)
);

create table if not exists public.calculator_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tool_id text not null,
  summary text not null,
  detail text not null,
  created_at timestamptz not null default now(),
  unique (user_id, tool_id, summary, detail)
);

create table if not exists public.user_tool_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists public.data_migrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists goals_user_created_idx on public.goals (user_id, created_at desc);
create index if not exists goals_user_goal_type_idx on public.goals (user_id, goal_type);
create index if not exists goals_user_sort_idx on public.goals (user_id, sort_order asc, created_at desc);
create index if not exists metrics_goal_created_idx on public.metrics (goal_id, created_at asc);
create index if not exists entries_user_goal_date_idx on public.entries (user_id, goal_id, date desc);
create index if not exists entry_values_entry_idx on public.entry_values (entry_id);
create index if not exists calculator_results_user_tool_created_idx on public.calculator_results (user_id, tool_id, created_at desc);
create index if not exists user_tool_preferences_user_key_idx on public.user_tool_preferences (user_id, key);
create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.metrics enable row level security;
alter table public.entries enable row level security;
alter table public.entry_values enable row level security;
alter table public.calculator_results enable row level security;
alter table public.user_tool_preferences enable row level security;
alter table public.data_migrations enable row level security;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(trim(new.raw_user_meta_data ->> 'username'));

  insert into public.profiles (user_id, username, email)
  values (new.id, requested_username, lower(new.email));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create or replace function public.resolve_login_email(login_identifier text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when position('@' in login_identifier) > 0 then lower(trim(login_identifier))
    else (
      select profiles.email
      from public.profiles
      where profiles.username = lower(trim(login_identifier))
      limit 1
    )
  end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (user_id = auth.uid());

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using (user_id = auth.uid());

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert with check (user_id = auth.uid());

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals
  for delete using (user_id = auth.uid());

drop policy if exists "metrics_select_own" on public.metrics;
create policy "metrics_select_own" on public.metrics
  for select using (
    exists (
      select 1 from public.goals
      where goals.id = metrics.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "metrics_insert_own" on public.metrics;
create policy "metrics_insert_own" on public.metrics
  for insert with check (
    exists (
      select 1 from public.goals
      where goals.id = metrics.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "metrics_update_own" on public.metrics;
create policy "metrics_update_own" on public.metrics
  for update using (
    exists (
      select 1 from public.goals
      where goals.id = metrics.goal_id
        and goals.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.goals
      where goals.id = metrics.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "metrics_delete_own" on public.metrics;
create policy "metrics_delete_own" on public.metrics
  for delete using (
    exists (
      select 1 from public.goals
      where goals.id = metrics.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "entries_select_own" on public.entries;
create policy "entries_select_own" on public.entries
  for select using (user_id = auth.uid());

drop policy if exists "entries_insert_own" on public.entries;
create policy "entries_insert_own" on public.entries
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.goals
      where goals.id = entries.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "entries_update_own" on public.entries;
create policy "entries_update_own" on public.entries
  for update using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.goals
      where goals.id = entries.goal_id
        and goals.user_id = auth.uid()
    )
  );

drop policy if exists "entries_delete_own" on public.entries;
create policy "entries_delete_own" on public.entries
  for delete using (user_id = auth.uid());

drop policy if exists "entry_values_select_own" on public.entry_values;
create policy "entry_values_select_own" on public.entry_values
  for select using (
    exists (
      select 1 from public.entries
      where entries.id = entry_values.entry_id
        and entries.user_id = auth.uid()
    )
  );

drop policy if exists "entry_values_insert_own" on public.entry_values;
create policy "entry_values_insert_own" on public.entry_values
  for insert with check (
    exists (
      select 1
      from public.entries
      join public.metrics on metrics.id = entry_values.metric_id
      where entries.id = entry_values.entry_id
        and entries.user_id = auth.uid()
        and metrics.goal_id = entries.goal_id
    )
  );

drop policy if exists "entry_values_update_own" on public.entry_values;
create policy "entry_values_update_own" on public.entry_values
  for update using (
    exists (
      select 1 from public.entries
      where entries.id = entry_values.entry_id
        and entries.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.entries
      join public.metrics on metrics.id = entry_values.metric_id
      where entries.id = entry_values.entry_id
        and entries.user_id = auth.uid()
        and metrics.goal_id = entries.goal_id
    )
  );

drop policy if exists "entry_values_delete_own" on public.entry_values;
create policy "entry_values_delete_own" on public.entry_values
  for delete using (
    exists (
      select 1 from public.entries
      where entries.id = entry_values.entry_id
        and entries.user_id = auth.uid()
    )
  );

drop policy if exists "calculator_results_select_own" on public.calculator_results;
create policy "calculator_results_select_own" on public.calculator_results
  for select using (user_id = auth.uid());

drop policy if exists "calculator_results_insert_own" on public.calculator_results;
create policy "calculator_results_insert_own" on public.calculator_results
  for insert with check (user_id = auth.uid());

drop policy if exists "calculator_results_update_own" on public.calculator_results;
create policy "calculator_results_update_own" on public.calculator_results
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "calculator_results_delete_own" on public.calculator_results;
create policy "calculator_results_delete_own" on public.calculator_results
  for delete using (user_id = auth.uid());

drop policy if exists "user_tool_preferences_select_own" on public.user_tool_preferences;
create policy "user_tool_preferences_select_own" on public.user_tool_preferences
  for select using (user_id = auth.uid());

drop policy if exists "user_tool_preferences_insert_own" on public.user_tool_preferences;
create policy "user_tool_preferences_insert_own" on public.user_tool_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists "user_tool_preferences_update_own" on public.user_tool_preferences;
create policy "user_tool_preferences_update_own" on public.user_tool_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "user_tool_preferences_delete_own" on public.user_tool_preferences;
create policy "user_tool_preferences_delete_own" on public.user_tool_preferences
  for delete using (user_id = auth.uid());

drop policy if exists "data_migrations_select_own" on public.data_migrations;
create policy "data_migrations_select_own" on public.data_migrations
  for select using (user_id = auth.uid());

drop policy if exists "data_migrations_insert_own" on public.data_migrations;
create policy "data_migrations_insert_own" on public.data_migrations
  for insert with check (user_id = auth.uid());

drop policy if exists "data_migrations_update_own" on public.data_migrations;
create policy "data_migrations_update_own" on public.data_migrations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "data_migrations_delete_own" on public.data_migrations;
create policy "data_migrations_delete_own" on public.data_migrations
  for delete using (user_id = auth.uid());
