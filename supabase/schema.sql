create table if not exists public.boss_records (
  boss_id text primary key,
  last_seen_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_users (
  username text primary key,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

drop policy if exists "Public register app users" on public.app_users;
create policy "Public register app users"
on public.app_users
for insert
to anon, authenticated
with check (is_active = false);

create or replace function public.normalize_app_username(value text)
returns text
language sql
immutable
as $$
  select lower(trim(value));
$$;

create or replace function public.get_app_user(p_username text)
returns table (
  username text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select app_users.username, app_users.is_active
  from public.app_users
  where app_users.username = public.normalize_app_username(p_username)
  limit 1;
$$;

create or replace function public.is_active_app_user(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where username = public.normalize_app_username(p_username)
      and is_active = true
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username
  )
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_active_user()
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
      and is_active = true
  );
$$;

alter table public.boss_records enable row level security;

drop policy if exists "Public read boss records" on public.boss_records;
create policy "Public read boss records"
on public.boss_records
for select
to anon
using (true);

drop policy if exists "Authenticated read boss records" on public.boss_records;
drop policy if exists "Active users read boss records" on public.boss_records;
create policy "Authenticated read boss records"
on public.boss_records
for select
to authenticated
using (true);

drop policy if exists "Public upsert boss records" on public.boss_records;
drop policy if exists "Active users insert boss records" on public.boss_records;
create policy "Active users insert boss records"
on public.boss_records
for insert
to authenticated
with check (public.is_active_user());

drop policy if exists "Public update boss records" on public.boss_records;
drop policy if exists "Active users update boss records" on public.boss_records;
create policy "Active users update boss records"
on public.boss_records
for update
to authenticated
using (public.is_active_user())
with check (public.is_active_user());

alter table public.boss_records
add column if not exists last_notified_window text;

alter table public.boss_records
add column if not exists changed_by_user_id uuid references public.profiles(id);

alter table public.boss_records
add column if not exists changed_by_username text;

create or replace function public.set_boss_record_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_username text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select username
  into actor_username
  from public.profiles
  where id = auth.uid();

  new.changed_by_user_id = auth.uid();
  new.changed_by_username = actor_username;

  return new;
end;
$$;

drop trigger if exists boss_record_actor_trigger on public.boss_records;
create trigger boss_record_actor_trigger
before insert or update on public.boss_records
for each row
execute function public.set_boss_record_actor();

create or replace function public.save_boss_record(
  p_username text,
  p_boss_id text,
  p_last_seen_at timestamptz,
  p_last_notified_window text default null
)
returns table (
  boss_id text,
  last_seen_at timestamptz,
  updated_at timestamptz,
  last_notified_window text,
  changed_by_user_id uuid,
  changed_by_username text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text := public.normalize_app_username(p_username);
begin
  if not public.is_active_app_user(normalized_username) then
    raise exception 'El usuario no esta activo.';
  end if;

  return query
  insert into public.boss_records (
    boss_id,
    last_seen_at,
    updated_at,
    last_notified_window,
    changed_by_user_id,
    changed_by_username
  )
  values (
    p_boss_id,
    p_last_seen_at,
    now(),
    p_last_notified_window,
    null,
    normalized_username
  )
  on conflict (boss_id) do update
  set
    last_seen_at = excluded.last_seen_at,
    updated_at = excluded.updated_at,
    last_notified_window = excluded.last_notified_window,
    changed_by_user_id = null,
    changed_by_username = normalized_username
  returning
    public.boss_records.boss_id,
    public.boss_records.last_seen_at,
    public.boss_records.updated_at,
    public.boss_records.last_notified_window,
    public.boss_records.changed_by_user_id,
    public.boss_records.changed_by_username;
end;
$$;

create table if not exists public.boss_record_history (
  id bigserial primary key,
  boss_id text not null,
  operation text not null default 'UPDATE',
  previous_last_seen_at timestamptz,
  new_last_seen_at timestamptz not null,
  previous_record jsonb,
  new_record jsonb,
  changed_by_user_id uuid references public.profiles(id),
  changed_by_username text,
  changed_at timestamptz not null default now()
);

alter table public.boss_record_history
add column if not exists operation text not null default 'UPDATE';

alter table public.boss_record_history
add column if not exists previous_record jsonb;

alter table public.boss_record_history
add column if not exists new_record jsonb;

alter table public.boss_record_history
add column if not exists changed_by_user_id uuid references public.profiles(id);

alter table public.boss_record_history
add column if not exists changed_by_username text;

alter table public.boss_record_history enable row level security;

drop policy if exists "Public read boss record history" on public.boss_record_history;
create policy "Public read boss record history"
on public.boss_record_history
for select
to anon
using (true);

drop policy if exists "Authenticated read boss record history" on public.boss_record_history;
drop policy if exists "Active users read boss record history" on public.boss_record_history;
create policy "Authenticated read boss record history"
on public.boss_record_history
for select
to authenticated
using (true);

create or replace function public.log_boss_record_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.boss_record_history (
      boss_id,
      operation,
      previous_last_seen_at,
      new_last_seen_at,
      previous_record,
      new_record,
      changed_by_user_id,
      changed_by_username
    )
    values (
      new.boss_id,
      'INSERT',
      null,
      new.last_seen_at,
      null,
      to_jsonb(new),
      new.changed_by_user_id,
      new.changed_by_username
    );
  elsif tg_op = 'UPDATE' and old is distinct from new then
    insert into public.boss_record_history (
      boss_id,
      operation,
      previous_last_seen_at,
      new_last_seen_at,
      previous_record,
      new_record,
      changed_by_user_id,
      changed_by_username
    )
    values (
      new.boss_id,
      'UPDATE',
      old.last_seen_at,
      new.last_seen_at,
      to_jsonb(old),
      to_jsonb(new),
      new.changed_by_user_id,
      new.changed_by_username
    );
  elsif tg_op = 'DELETE' then
    insert into public.boss_record_history (
      boss_id,
      operation,
      previous_last_seen_at,
      new_last_seen_at,
      previous_record,
      new_record,
      changed_by_user_id,
      changed_by_username
    )
    values (
      old.boss_id,
      'DELETE',
      old.last_seen_at,
      old.last_seen_at,
      to_jsonb(old),
      null,
      old.changed_by_user_id,
      old.changed_by_username
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists boss_record_history_trigger on public.boss_records;
create trigger boss_record_history_trigger
after insert or update or delete on public.boss_records
for each row
execute function public.log_boss_record_history();

insert into public.boss_record_history (
  boss_id,
  operation,
  previous_last_seen_at,
  new_last_seen_at,
  previous_record,
  new_record,
  changed_by_user_id,
  changed_by_username,
  changed_at
)
select
  boss_id,
  'INSERT',
  null,
  last_seen_at,
  null,
  to_jsonb(records),
  changed_by_user_id,
  changed_by_username,
  updated_at
from public.boss_records records
where not exists (
  select 1
  from public.boss_record_history history
  where history.boss_id = records.boss_id
    and history.previous_last_seen_at is null
    and history.new_last_seen_at = records.last_seen_at
    and history.operation = 'INSERT'
);

update public.boss_record_history history
set
  operation = coalesce(operation, 'UPDATE'),
  previous_record = case
    when previous_record is not null then previous_record
    when previous_last_seen_at is null then null
    else jsonb_build_object(
      'boss_id', boss_id,
      'last_seen_at', previous_last_seen_at
    )
  end,
  new_record = coalesce(
    new_record,
    jsonb_build_object(
      'boss_id', boss_id,
      'last_seen_at', new_last_seen_at
    )
  );

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'boss_records'
  ) then
    alter publication supabase_realtime add table public.boss_records;
  end if;
end $$;
