create table if not exists public.boss_records (
  boss_id text primary key,
  last_seen_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.boss_records enable row level security;

drop policy if exists "Public read boss records" on public.boss_records;
create policy "Public read boss records"
on public.boss_records
for select
to anon
using (true);

drop policy if exists "Public upsert boss records" on public.boss_records;
create policy "Public upsert boss records"
on public.boss_records
for insert
to anon
with check (true);

drop policy if exists "Public update boss records" on public.boss_records;
create policy "Public update boss records"
on public.boss_records
for update
to anon
using (true)
with check (true);
alter table public.boss_records
add column if not exists last_notified_window text;

create table if not exists public.boss_record_history (
  id bigserial primary key,
  boss_id text not null,
  operation text not null default 'UPDATE',
  previous_last_seen_at timestamptz,
  new_last_seen_at timestamptz not null,
  previous_record jsonb,
  new_record jsonb,
  changed_at timestamptz not null default now()
);

alter table public.boss_record_history
add column if not exists operation text not null default 'UPDATE';

alter table public.boss_record_history
add column if not exists previous_record jsonb;

alter table public.boss_record_history
add column if not exists new_record jsonb;

alter table public.boss_record_history enable row level security;

drop policy if exists "Public read boss record history" on public.boss_record_history;
create policy "Public read boss record history"
on public.boss_record_history
for select
to anon
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
      new_record
    )
    values (
      new.boss_id,
      'INSERT',
      null,
      new.last_seen_at,
      null,
      to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' and old is distinct from new then
    insert into public.boss_record_history (
      boss_id,
      operation,
      previous_last_seen_at,
      new_last_seen_at,
      previous_record,
      new_record
    )
    values (
      new.boss_id,
      'UPDATE',
      old.last_seen_at,
      new.last_seen_at,
      to_jsonb(old),
      to_jsonb(new)
    );
  elsif tg_op = 'DELETE' then
    insert into public.boss_record_history (
      boss_id,
      operation,
      previous_last_seen_at,
      new_last_seen_at,
      previous_record,
      new_record
    )
    values (
      old.boss_id,
      'DELETE',
      old.last_seen_at,
      old.last_seen_at,
      to_jsonb(old),
      null
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
  changed_at
)
select
  boss_id,
  'INSERT',
  null,
  last_seen_at,
  null,
  to_jsonb(records),
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
