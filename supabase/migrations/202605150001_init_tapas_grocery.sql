-- Tapas Grocery Store production schema
-- Apply this from Supabase SQL Editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.customer_profiles where id = auth.uid()),
    'customer'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_profiles
    where id = auth.uid()
      and (
        role = 'admin'
        or phone = '7477661933'
      )
  );
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('grocery', 'books', 'cosmetics')),
  price numeric(10, 2) not null check (price >= 0),
  image_url text not null,
  description text,
  brand text not null,
  dietary text[] not null default '{}',
  unit_type text not null check (unit_type in ('weight', 'package')),
  unit_options text[] not null default '{}',
  variant_prices jsonb not null default '{}',
  stock integer not null check (stock >= 0),
  min_stock integer not null default 10,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Tapas Customer',
  phone text unique not null,
  role text not null default 'customer' check (role in ('customer', 'admin', 'delivery_partner')),
  phone_verified boolean not null default false,
  blocked_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_phones (
  phone text primary key,
  reason text,
  blocked_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (label in ('Home', 'Work', 'Other')),
  receiver_name text not null,
  phone text not null,
  line1 text not null,
  line2 text not null,
  city text not null,
  state text not null,
  pincode text not null,
  landmark text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  distance_km numeric(5, 2) not null check (distance_km >= 0 and distance_km <= 2),
  created_at timestamptz not null default now()
);

create table if not exists public.favorite_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.delivery_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  delivery_address jsonb not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  delivery_distance numeric(5, 2) not null check (delivery_distance >= 0 and delivery_distance <= 2),
  payment_method text not null check (payment_method in ('COD', 'UPI', 'Card', 'NetBanking')),
  payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid', 'Failed')),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled', 'Refunded')),
  assigned_agent_id uuid references public.delivery_agents(id) on delete set null,
  delivery_eta text not null default 'Waiting for owner confirmation',
  refund_status text not null default 'Not requested' check (refund_status in ('Not requested', 'Requested', 'Approved', 'Rejected', 'Refunded')),
  cancellation_reason text,
  invoice_number text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  selected_unit text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  code text primary key,
  type text not null check (type in ('percentage', 'flat')),
  value numeric(10, 2) not null check (value > 0),
  min_cart_total numeric(10, 2) not null default 0 check (min_cart_total >= 0),
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_brand_idx on public.products(brand);
create index if not exists addresses_user_id_idx on public.addresses(user_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_customer_phone_idx on public.orders(customer_phone);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists reviews_product_id_idx on public.product_reviews(product_id);
create index if not exists activity_created_at_idx on public.admin_activity_log(created_at desc);

alter table public.products enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.blocked_phones enable row level security;
alter table public.addresses enable row level security;
alter table public.favorite_products enable row level security;
alter table public.delivery_agents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.promo_codes enable row level security;
alter table public.admin_activity_log enable row level security;

drop policy if exists "Products are public read" on public.products;
create policy "Products are public read"
on public.products for select
using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own profile" on public.customer_profiles;
create policy "Users read own profile"
on public.customer_profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users insert own profile" on public.customer_profiles;
create policy "Users insert own profile"
on public.customer_profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users update own non-admin profile" on public.customer_profiles;
create policy "Users update own non-admin profile"
on public.customer_profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = 'customer'
  )
);

drop policy if exists "Admins manage blocked phones" on public.blocked_phones;
create policy "Admins manage blocked phones"
on public.blocked_phones for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users manage own addresses" on public.addresses;
create policy "Users manage own addresses"
on public.addresses for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users manage own favorites" on public.favorite_products;
create policy "Users manage own favorites"
on public.favorite_products for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Delivery agents public read for authenticated" on public.delivery_agents;
create policy "Delivery agents public read for authenticated"
on public.delivery_agents for select
to authenticated
using (true);

drop policy if exists "Admins manage delivery agents" on public.delivery_agents;
create policy "Admins manage delivery agents"
on public.delivery_agents for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders"
on public.orders for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
on public.orders for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.delivery_agents da
    where da.id = orders.assigned_agent_id
      and da.user_id = auth.uid()
  )
);

drop policy if exists "Admins and assigned agents update orders" on public.orders;
create policy "Admins and assigned agents update orders"
on public.orders for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.delivery_agents da
    where da.id = orders.assigned_agent_id
      and da.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.delivery_agents da
    where da.id = orders.assigned_agent_id
      and da.user_id = auth.uid()
  )
);

drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items"
on public.order_items for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Users insert own order items" on public.order_items;
create policy "Users insert own order items"
on public.order_items for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Reviews are public read" on public.product_reviews;
create policy "Reviews are public read"
on public.product_reviews for select
using (true);

drop policy if exists "Authenticated users add reviews" on public.product_reviews;
create policy "Authenticated users add reviews"
on public.product_reviews for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins moderate reviews" on public.product_reviews;
create policy "Admins moderate reviews"
on public.product_reviews for delete
to authenticated
using (public.is_admin());

drop policy if exists "Active promo codes are public read" on public.promo_codes;
create policy "Active promo codes are public read"
on public.promo_codes for select
using (active = true or public.is_admin());

drop policy if exists "Admins manage promo codes" on public.promo_codes;
create policy "Admins manage promo codes"
on public.promo_codes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read activity log" on public.admin_activity_log;
create policy "Admins read activity log"
on public.admin_activity_log for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins write activity log" on public.admin_activity_log;
create policy "Admins write activity log"
on public.admin_activity_log for insert
to authenticated
with check (public.is_admin());

insert into public.promo_codes (code, type, value, min_cart_total, description, active)
values
  ('TAPAS10', 'percentage', 10, 200, '10% off orders above ₹200', true),
  ('LOCAL50', 'flat', 50, 500, '₹50 off weekly grocery baskets', true)
on conflict (code) do update
set type = excluded.type,
    value = excluded.value,
    min_cart_total = excluded.min_cart_total,
    description = excluded.description,
    active = excluded.active;

insert into public.delivery_agents (name, phone, active)
values
  ('Suman Pal', '9000011111', true),
  ('Arif Khan', '9000022222', true)
on conflict (phone) do update
set name = excluded.name,
    active = excluded.active;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Product images are public read" on storage.objects;
create policy "Product images are public read"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

do $$
begin
  begin
    alter publication supabase_realtime add table public.orders;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.admin_activity_log;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
