-- supabase-migration-sites.sql
-- Adds a sites table between clients and reports.
-- Run AFTER supabase-setup.sql and any seed files.
-- Client → Sites → Reports

-- ── 1. Create sites table ────────────────────────────────────────────────────
create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  address     text,
  created_at  timestamptz default now()
);

alter table sites enable row level security;
create policy "authenticated only" on sites
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── 2. Add site_id to reports ────────────────────────────────────────────────
alter table reports add column if not exists site_id uuid references sites(id) on delete cascade;

-- ── 3. Migrate existing data ─────────────────────────────────────────────────
-- Creates one site per client using the client's existing address.
-- Links all reports for that client to the new site.
do $$
declare
  c record;
  sid uuid;
begin
  for c in select * from clients loop
    sid := gen_random_uuid();
    insert into sites (id, client_id, address)
    values (sid, c.id, coalesce(c.address, ''));

    update reports set site_id = sid where client_id = c.id and site_id is null;
  end loop;
end $$;
