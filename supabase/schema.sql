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