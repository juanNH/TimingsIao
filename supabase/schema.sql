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
  previous_last_seen_at timestamptz,
  new_last_seen_at timestamptz not null,
  changed_at timestamptz not null default now()
);

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
      previous_last_seen_at,
      new_last_seen_at
    )
    values (
      new.boss_id,
      null,
      new.last_seen_at
    );
  elsif tg_op = 'UPDATE' and old.last_seen_at is distinct from new.last_seen_at then
    insert into public.boss_record_history (
      boss_id,
      previous_last_seen_at,
      new_last_seen_at
    )
    values (
      new.boss_id,
      old.last_seen_at,
      new.last_seen_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists boss_record_history_trigger on public.boss_records;
create trigger boss_record_history_trigger
after insert or update on public.boss_records
for each row
execute function public.log_boss_record_history();

insert into public.boss_record_history (
  boss_id,
  previous_last_seen_at,
  new_last_seen_at,
  changed_at
)
select
  boss_id,
  null,
  last_seen_at,
  updated_at
from public.boss_records records
where not exists (
  select 1
  from public.boss_record_history history
  where history.boss_id = records.boss_id
    and history.previous_last_seen_at is null
    and history.new_last_seen_at = records.last_seen_at
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
