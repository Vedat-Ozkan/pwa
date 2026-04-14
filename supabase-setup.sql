-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────

-- Clients table
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  building    text,
  address     text,
  billing     text,
  contact     text,
  phone       text,
  email       text,
  created_at  timestamptz default now()
);

-- Reports table
create table if not exists reports (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  job_name     text,
  report_date  date,
  supervisor   text,
  po_number    text,
  wo_number    text,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Auto-update updated_at on reports
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

-- RLS: allow all operations with the anon key (internal tool, no auth)
alter table clients enable row level security;
alter table reports enable row level security;

create policy "allow all" on clients for all using (true) with check (true);
create policy "allow all" on reports for all using (true) with check (true);

-- Storage bucket for report photos
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict do nothing;

create policy "allow all uploads" on storage.objects
  for insert with check (bucket_id = 'report-photos');

create policy "allow all reads" on storage.objects
  for select using (bucket_id = 'report-photos');

create policy "allow all deletes" on storage.objects
  for delete using (bucket_id = 'report-photos');
