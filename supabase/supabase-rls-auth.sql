-- supabase-rls-auth.sql
-- Run this AFTER setting up auth (creating the shared user account).
-- Replaces allow-all policies with authenticated-only policies.
--
-- Step 1: Create the shared user account
--   Go to Supabase dashboard → Authentication → Users → Add user
--   Enter the shared email and password your team will use.
--
-- Step 2: Run this SQL

-- ── Clients ─────────────────────────────────────────────────────────────────
drop policy if exists "allow all" on clients;

create policy "authenticated only" on clients
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Reports ──────────────────────────────────────────────────────────────────
drop policy if exists "allow all" on reports;

create policy "authenticated only" on reports
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ── Storage ──────────────────────────────────────────────────────────────────
-- Photo reads stay public (URLs are embedded in reports/PDFs)
drop policy if exists "allow all uploads" on storage.objects;
drop policy if exists "allow all deletes" on storage.objects;

create policy "authenticated uploads" on storage.objects
  for insert
  with check (bucket_id = 'report-photos' and auth.role() = 'authenticated');

create policy "authenticated deletes" on storage.objects
  for delete
  using (bucket_id = 'report-photos' and auth.role() = 'authenticated');
