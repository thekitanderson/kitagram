# Kitagram

A single-author showcase. Public pages are plain HTML with no JavaScript. Posting happens from an installable phone app at `/admin/`.

## Run locally

```
npm install
npm run dev      # http://localhost:3000, composer at /admin/, password: dev
npm run seed     # optional: sample posts for the local preview
npm test         # smoke tests, no accounts needed
```

Locally, posts live in `.data/` and need no database. Photo, audio, and video uploads need a real Blob store, so they only work once deployed.

## Deploy (Vercel)

1. Create a project from this folder.
2. Storage: add **Neon Postgres** (sets `DATABASE_URL`) and a **Blob** store set to **Public** (sets `BLOB_READ_WRITE_TOKEN`). Connect both to the project.
3. Environment variables:
   - `ADMIN_PASSWORD`: long and unique. It is the only thing protecting posting.
   - `SESSION_SECRET`: 32+ random characters.
4. Deploy. On the phone, open `/admin/` in Chrome, sign in, and choose Install. Once installed, the app appears in Android's share menu.

## Rebrand

Everything brand-specific is in `site.config.js` (name, colors, fonts, logo, footer). Replace `public/admin/icon-192.png` and `icon-512.png` with your own icon.

## Notes

- Posts are in the database. `/api/export` (the Backup link in the composer) downloads them all as JSON. Uploaded files stay in Blob.
- `public/admin/blob-client.js` is the Vercel Blob browser client, bundled once. Regenerate with `npm run vendor`.
- Photos are resized to 2000px and re-encoded in the browser before upload, which strips EXIF data including GPS location.
