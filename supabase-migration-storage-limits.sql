-- Restrict new uploads to the formats the app actually produces. The 2 MB
-- ceiling leaves rollout headroom for older installed clients; current clients
-- target 0.5 MB before upload.
-- Existing objects are unaffected. Run once in the Supabase SQL editor.

update storage.buckets
set
  file_size_limit = 2097152,
  allowed_mime_types = array['image/webp', 'image/jpeg']
where id = 'report-photos';

update storage.buckets
set allowed_mime_types = array['application/pdf']
where id = 'report-pdfs';
