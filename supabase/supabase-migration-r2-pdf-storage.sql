-- Track whether each generated PDF currently lives in Supabase or Cloudflare R2.
-- Run after the existing PDF cache, photo cleanup, and PDF retention migrations.

alter table reports
  add column if not exists pdf_storage text not null default 'supabase';

alter table reports
  add column if not exists pdf_migrated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reports_pdf_storage_valid'
      and conrelid = 'public.reports'::regclass
  ) then
    alter table reports
      add constraint reports_pdf_storage_valid
      check (pdf_storage in ('supabase', 'r2'));
  end if;
end $$;

-- Moving a cached PDF between object stores is storage bookkeeping, not a
-- report edit. Preserve updated_at so the six-day inactivity calculation and
-- PDF freshness check continue to describe the report content itself.
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  if (new.pdf_path is distinct from old.pdf_path
      or new.pdf_generated_at is distinct from old.pdf_generated_at
      or new.pdf_deleted_at is distinct from old.pdf_deleted_at
      or new.pdf_storage is distinct from old.pdf_storage
      or new.pdf_migrated_at is distinct from old.pdf_migrated_at)
     and new.data             is not distinct from old.data
     and new.supervisor       is not distinct from old.supervisor
     and new.po_number        is not distinct from old.po_number
     and new.wo_number        is not distinct from old.wo_number
     and new.report_date      is not distinct from old.report_date
     and new.job_site_id      is not distinct from old.job_site_id
     and new.photos_purged_at is not distinct from old.photos_purged_at then
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
