-- HSX Field Reports: read-only storage/database audit
-- Run the whole file in the Supabase SQL editor and share the result sets.

-- 1. Database quota usage and the largest tables/indexes.
select
  pg_size_pretty(pg_database_size(current_database())) as database_size;

select
  schemaname,
  relname as relation,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) as total_size,
  pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) as total_bytes
from pg_stat_user_tables
order by total_bytes desc;

-- 2. Object count and bytes by bucket.
with sized_objects as (
  select
    bucket_id,
    coalesce(nullif(metadata->>'size', '')::bigint, 0) as bytes
  from storage.objects
)
select
  bucket_id,
  count(*) as object_count,
  pg_size_pretty(sum(bytes)::bigint) as total_size,
  sum(bytes)::bigint as total_bytes,
  pg_size_pretty(avg(bytes)::bigint) as average_size,
  pg_size_pretty(max(bytes)::bigint) as largest_object
from sized_objects
group by bucket_id
order by total_bytes desc;

-- 3. Formats and sizes. This shows how much legacy JPEG data remains and
-- whether PDFs, rather than source photos, dominate storage.
with sized_objects as (
  select
    bucket_id,
    coalesce(metadata->>'mimetype', '(unknown)') as mime_type,
    coalesce(nullif(metadata->>'size', '')::bigint, 0) as bytes
  from storage.objects
)
select
  bucket_id,
  mime_type,
  count(*) as object_count,
  pg_size_pretty(sum(bytes)::bigint) as total_size,
  pg_size_pretty(avg(bytes)::bigint) as average_size,
  pg_size_pretty((percentile_disc(0.95) within group (order by bytes))::bigint) as p95_size
from sized_objects
group by bucket_id, mime_type
order by bucket_id, sum(bytes) desc;

-- 4. The 30 largest stored objects.
select
  bucket_id,
  name,
  metadata->>'mimetype' as mime_type,
  pg_size_pretty(coalesce(nullif(metadata->>'size', '')::bigint, 0)) as size,
  created_at,
  updated_at
from storage.objects
order by coalesce(nullif(metadata->>'size', '')::bigint, 0) desc
limit 30;

-- 5. Storage objects that no current report owns.
with referenced_photos as (
  select photo->>'path' as name
  from public.reports r
  cross join lateral jsonb_array_elements(
    coalesce(r.data #> '{photos,before}', '[]'::jsonb) ||
    coalesce(r.data #> '{photos,progress}', '[]'::jsonb) ||
    coalesce(r.data #> '{photos,after}', '[]'::jsonb)
  ) photo
  where photo ? 'path'
), photo_orphans as (
  select o.bucket_id, o.name,
    coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as bytes
  from storage.objects o
  left join referenced_photos p on p.name = o.name
  where o.bucket_id = 'report-photos'
    and p.name is null
), pdf_orphans as (
  select o.bucket_id, o.name,
    coalesce(nullif(o.metadata->>'size', '')::bigint, 0) as bytes
  from storage.objects o
  left join public.reports r
    on o.name = r.pdf_path
    and r.pdf_storage = 'supabase'
  where o.bucket_id = 'report-pdfs'
    and r.id is null
)
select
  bucket_id,
  count(*) as orphan_count,
  pg_size_pretty(sum(bytes)::bigint) as orphan_size,
  sum(bytes)::bigint as orphan_bytes
from (
  select * from photo_orphans
  union all
  select * from pdf_orphans
) orphans
group by bucket_id
order by orphan_bytes desc;

-- 6. Report-row footprint and redundant public URLs stored in JSON.
select
  count(*) as report_count,
  pg_size_pretty(sum(pg_column_size(data))::bigint) as report_json_size,
  pg_size_pretty(avg(pg_column_size(data))::bigint) as average_report_json_size,
  pg_size_pretty(max(pg_column_size(data))::bigint) as largest_report_json
from public.reports;

with photos as (
  select photo
  from public.reports r
  cross join lateral jsonb_array_elements(
    coalesce(r.data #> '{photos,before}', '[]'::jsonb) ||
    coalesce(r.data #> '{photos,progress}', '[]'::jsonb) ||
    coalesce(r.data #> '{photos,after}', '[]'::jsonb)
  ) photo
)
select
  count(*) filter (where photo ? 'path') as live_photo_references,
  count(*) filter (where photo ? 'url') as stored_url_count,
  pg_size_pretty(coalesce(sum(octet_length(photo->>'url')) filter (where photo ? 'url'), 0)::bigint) as url_bytes_before_json_overhead
from photos;

-- 7. Current retention state. These counts help detect a stalled cron.
select
  count(*) as reports,
  count(*) filter (where photos_purged_at is null) as photos_not_marked_purged,
  count(*) filter (where pdf_path is not null) as pdfs_retained,
  count(*) filter (where pdf_path is not null and pdf_storage = 'supabase') as pdfs_in_supabase,
  count(*) filter (where pdf_path is not null and pdf_storage = 'r2') as pdfs_in_r2,
  count(*) filter (where pdf_deleted_at is not null) as pdfs_deleted,
  count(*) filter (
    where photos_purged_at is null
      and updated_at < now() - interval '60 days'
  ) as overdue_photo_purges,
  count(*) filter (
    where pdf_path is not null
      and pdf_deleted_at is null
      and updated_at < now() - interval '365 days'
  ) as overdue_pdf_purges
from public.reports;
