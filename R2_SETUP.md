# Cloudflare R2 PDF archive setup

The app keeps active PDFs in Supabase. After six days without a report edit,
the daily archive job copies each fresh PDF to private Cloudflare R2 storage,
verifies its byte size, updates the report row, and then deletes the Supabase
copy. Report photos live in the same bucket under `photos/`: the browser
uploads them directly with a signed URL from `/api/photos`, and they are
purged under the existing 30-day policy.

## 1. Create a bucket-scoped API token

In Cloudflare, open **Storage & databases → R2 → Overview → Manage API Tokens**.
Create an account API token with **Object Read & Write** access restricted to
the `hsx-report-pdfs` bucket. Save the Access Key ID and Secret Access Key;
Cloudflare displays the secret only once.

## 2. Add Vercel environment variables

Add these to Production, Preview, and Development as appropriate:

```text
R2_ACCOUNT_ID=<Cloudflare account ID>
R2_ACCESS_KEY_ID=<token access key ID>
R2_SECRET_ACCESS_KEY=<token secret access key>
R2_BUCKET_NAME=hsx-report-pdfs
```

Keep the bucket private. Downloads use one-hour presigned URLs, so neither a
public `r2.dev` URL nor a custom domain is required.

## 3. Allow browser downloads and photo uploads from the app

Open the bucket's **Settings → CORS Policy → Add CORS policy** and replace the
example production origin with the app's real URL (with no trailing slash):

```json
[
  {
    "AllowedOrigins": [
      "https://YOUR-APP-DOMAIN",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["Content-Length", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The bucket stays private; CORS only permits the browser to use an otherwise
valid signed URL.

## 4. Apply the database migration

Run `supabase-migration-r2-pdf-storage.sql` in the Supabase SQL Editor before
deploying the application changes.

## 5. Deploy and migrate the backlog

Deploy after the migration and environment variables are in place. The daily
cron migrates up to ten eligible PDFs per run. To process the initial backlog
faster, invoke `/api/migrate-pdfs-to-r2` repeatedly with the existing
`CRON_SECRET` bearer token until `attempted` returns `0`.

## 6. Move existing photos to R2

Photos uploaded before the switch are still in Supabase's `report-photos`
bucket and will not load until copied. Right after deploying, invoke
`/api/migrate-photos-to-r2` repeatedly with the `CRON_SECRET` bearer token
until `remaining` returns `0`. Run it again a few days later to catch photos
uploaded by PWA clients that were still on the old version.

Never paste R2 credentials or `CRON_SECRET` into source control or chat.
