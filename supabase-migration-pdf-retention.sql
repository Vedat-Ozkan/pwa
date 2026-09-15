-- supabase-migration-pdf-retention.sql
-- PDFs older than a year get deleted from report-pdfs too (by then the
-- source photos are already long purged, so there's no way to regenerate
-- them anyway). Run AFTER supabase-migration-photo-cleanup.sql.

alter table reports add column if not exists pdf_deleted_at timestamptz;

-- No trigger change needed: the existing update_updated_at() exemption for
-- pdf_path/pdf_generated_at changes (with data/supervisor/etc. untouched)
-- already covers this write, since pdf_deleted_at isn't checked there.
