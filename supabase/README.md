# Tapas Grocery Supabase Setup

This folder contains the production database migration for the app.

## Apply From Dashboard

1. Open Supabase Dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/202605150001_init_tapas_grocery.sql`.
4. Paste the full SQL into the editor.
5. Click **Run**.

## Auth Settings

The customer login page uses Supabase email/password and Google OAuth.

In Supabase Dashboard:

1. Go to **Authentication > Providers > Email**.
2. Enable Email provider.
3. Go to **Authentication > Providers > Google**.
4. Enable Google provider and add your Google OAuth client credentials.
5. Add your site URL and redirect URLs in **Authentication > URL Configuration**.

Recommended redirect URLs:

```text
http://localhost:3000/login
https://tapas-grocery.vercel.app/login
```

Phone SMS authentication is not used by the current app.

## Required Environment Variables

Set these in `.env` locally and in your hosting provider:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Never commit `.env`.
