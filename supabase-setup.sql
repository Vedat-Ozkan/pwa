-- ─────────────────────────────────────────────────────────────
-- HSX Field Reports — Supabase setup
-- Run in Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- ── Drop old tables ──────────────────────────────────────────
drop table if exists reports cascade;
drop table if exists sites cascade;
drop table if exists job_sites cascade;
drop table if exists clients cascade;

-- ── Clients ──────────────────────────────────────────────────
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  client_name     text not null,
  client_address  text,
  billing_address text,
  contact_person  text,
  email           text,
  phone           text,
  created_at      timestamptz default now()
);

-- ── Job Sites ────────────────────────────────────────────────
create table if not exists job_sites (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  job_address text,
  created_at  timestamptz default now()
);

-- ── Reports ──────────────────────────────────────────────────
create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  job_site_id  uuid not null references job_sites(id) on delete cascade,
  supervisor   text,
  po_number    text,
  wo_number    text,
  report_date  date,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table clients   enable row level security;
alter table job_sites enable row level security;
alter table reports   enable row level security;

create policy "authenticated only" on clients
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated only" on job_sites
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "authenticated only" on reports
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Storage ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict do nothing;

drop policy if exists "allow all reads" on storage.objects;
create policy "allow all reads" on storage.objects
  for select using (bucket_id = 'report-photos');

drop policy if exists "authenticated uploads" on storage.objects;
create policy "authenticated uploads" on storage.objects
  for insert with check (bucket_id = 'report-photos' and auth.role() = 'authenticated');

drop policy if exists "authenticated deletes" on storage.objects;
create policy "authenticated deletes" on storage.objects
  for delete using (bucket_id = 'report-photos' and auth.role() = 'authenticated');
