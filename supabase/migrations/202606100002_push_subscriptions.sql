create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  admin_phone text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_admin_phone_idx
on public.push_subscriptions(admin_phone);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Admins manage push subscriptions" on public.push_subscriptions;
create policy "Admins manage push subscriptions"
on public.push_subscriptions for all
using (
  exists (
    select 1
    from public.customer_profiles
    where customer_profiles.id = auth.uid()
      and customer_profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.customer_profiles
    where customer_profiles.id = auth.uid()
      and customer_profiles.role = 'admin'
  )
);
