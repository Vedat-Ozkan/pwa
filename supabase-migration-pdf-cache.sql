-- supabase-migration-pdf-cache.sql
-- Adds server-side PDF caching for report exports.
-- Run AFTER supabase-setup.sql.

-- ── 1. Cache columns on reports ───────────────────────────────────────────────
alter table reports add column if not exists pdf_path         text;
alter table reports add column if not exists pdf_generated_at timestamptz;

-- ── 2. Public bucket for generated PDFs ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('report-pdfs', 'report-pdfs', true)
on conflict do nothing;

drop policy if exists "public read report-pdfs" on storage.objects;
create policy "public read report-pdfs" on storage.objects
  for select using (bucket_id = 'report-pdfs');

-- Writes happen from the serverless function using the service role,
-- which bypasses RLS — no insert/update/delete policies needed.

-- ── 3. Don't bump updated_at for cache-only writes ───────────────────────────
-- Without this, writing pdf_generated_at would bump updated_at and immediately
-- invalidate the cache we just stored.
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  if (new.pdf_path         is distinct from old.pdf_path
      or new.pdf_generated_at is distinct from old.pdf_generated_at)
     and new.data         is not distinct from old.data
     and new.supervisor   is not distinct from old.supervisor
     and new.po_number    is not distinct from old.po_number
     and new.wo_number    is not distinct from old.wo_number
     and new.report_date  is not distinct from old.report_date
     and new.job_site_id  is not distinct from old.job_site_id then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
