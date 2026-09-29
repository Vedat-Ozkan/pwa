# HSX Field Reports

Installable web app (PWA) for HSX Roofing crews to write roof inspection reports on site, attach photos, and export them as PDFs.

## Stack

- React + Vite, `vite-plugin-pwa`
- Supabase (auth, database, photo storage)
- Vercel serverless functions for PDF generation (Puppeteer)
- Cloudflare R2 for stored PDFs

## Setup

```bash
npm install
cp .env.example .env.local   # add your Supabase URL and anon key
npm run dev
```

Run `supabase/supabase-setup.sql` in the Supabase SQL editor, then the migration files in `supabase/`. See [R2_SETUP.md](R2_SETUP.md) for PDF storage.

## Scripts

- `npm run dev` – dev server
- `npm run build` – production build
- `npm test` – tests
- `npm run lint` – lint
