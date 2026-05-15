# Tapas Grocery Supabase Setup

This folder contains the production database migration for the app.

## Apply From Dashboard

1. Open Supabase Dashboard.
2. Go to **SQL Editor**.
3. Open `supabase/migrations/202605150001_init_tapas_grocery.sql`.
4. Paste the full SQL into the editor.
5. Click **Run**.

## Make The Owner Phone Admin

After the owner signs in once with phone OTP, run this SQL:

```sql
update public.customer_profiles
set role = 'admin'
where phone = '7477661933';
```

The RLS helper also treats `7477661933` as admin if that phone exists in `customer_profiles`.

## Required Auth Setting

In Supabase Dashboard:

1. Go to **Authentication > Providers > Phone**.
2. Enable phone provider.
3. Configure your SMS provider.
4. Keep OTP expiry short, for example 5 to 10 minutes.

## Required Environment Variables

Set these in `.env` locally and in your hosting provider:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

Never commit `.env`.
