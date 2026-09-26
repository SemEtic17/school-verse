# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend — Supabase

Data and auth run on Supabase. Setup:

1. **Provision the database.** The SQL schema is intentionally excluded from
   this repository. Apply your privately maintained schema in Supabase before
   running the app.
2. **Set env vars.** Copy `.env.example` to `.env.local` and fill in
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
   The anon key is browser-safe — Row Level Security enforces access.
3. **Enable Google sign-in.** In Authentication → Providers → Google, add your
   OAuth client id/secret. Then add the site URL, e.g. `http://localhost:8080`
   and your production URL, under Authentication → URL Configuration →
   Redirect URLs (as `https://<your-site>/**`).

## Content publishing

After the database tables from your privately maintained schema are installed,
run `supabase/migrations/202609260001_content_management.sql` in the Supabase
SQL Editor. It secures profile roles and configures the `schoolverse-media`
image bucket for admin/rep uploads.

To grant the first class representative access, run this in the SQL Editor,
replacing the email with their Google account:

```sql
update public.profiles
set role = 'rep'
where email = 'representative@example.com';
```

After signing in again, representatives see **Manage** in the app navigation.
There they can publish events, clothing polls with design images, and memories.
Google sign-in creates a profile on first sign-in; the same button works for
both new and returning users.

Data access lives in `src/hooks/use-batch-data.ts` (queries + mutations) and the
session/profile state in `src/hooks/use-auth.tsx`.

## Deploy — Render Static Site

The app builds to a client-rendered SPA (TanStack Start `spa` mode), so it can
be served as a static site:

- **Build command:** `npm install && npm run build`
- **Publish directory:** `.output/public`
- **SPA routing:** handled by `public/_redirects`, which ships with the build
  and rewrites every unknown path to `/index.html`.
- **Environment:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the
  Render dashboard (they are baked in at build time, so rebuild after changes).

## Built with

- TanStack Start
- Supabase (Postgres + Auth)
- TypeScript
- React
- Tailwind CSS
