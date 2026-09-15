-- supabase-migration-photo-cleanup.sql
-- Source photos in report-photos are purged once they're no longer needed
-- (report-pdfs already has them baked in as base64). Keeps storage usage
-- on the free tier instead of growing forever.
-- Run AFTER supabase-migration-pdf-cache.sql.

alter table reports add column if not exists photos_purged_at timestamptz;

-- Purging rewrites `data` (stripping photo url/path) via the cleanup cron.
-- That write must not count as a real edit, or it invalidates the PDF cache
-- and the next regen would try to re-fetch photos that no longer exist.
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

  if new.photos_purged_at is distinct from old.photos_purged_at
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
