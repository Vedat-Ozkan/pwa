-- Add corporation_name to job_sites (UI calls them "Properties")
alter table job_sites add column if not exists corporation_name text;

-- Singleton company_settings table (one row, editable HSX info shown atop every PDF)
create table if not exists company_settings (
  id              int primary key default 1,
  company_name    text not null default 'HSX INCORPORATED',
  contact_name    text not null default 'Roberto Hamasato',
  phone           text not null default '(416) 880-8134',
  email           text not null default 'Roberto@hsxroofing.com',
  roles           text not null default 'Roofing Contractor & Roof Consultant',
  updated_at      timestamptz not null default now(),
  constraint company_settings_singleton check (id = 1)
);

insert into company_settings (id) values (1) on conflict (id) do nothing;

alter table company_settings enable row level security;

drop policy if exists "auth read company_settings" on company_settings;
create policy "auth read company_settings" on company_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "auth update company_settings" on company_settings;
create policy "auth update company_settings" on company_settings
  for update using (auth.role() = 'authenticated');
