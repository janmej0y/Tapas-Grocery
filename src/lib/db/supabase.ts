export const databaseProvider = "Supabase PostgreSQL";

export const supabaseSchema = `
create table public.products (
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

create table public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text unique not null,
  role text not null default 'customer' check (role in ('customer', 'admin', 'delivery_partner')),
  phone_verified boolean not null default false,
  blocked_at timestamptz,
  blocked_reason text,
  created_at timestamptz not null default now()
);

create table public.blocked_phones (
  phone text primary key,
  reason text,
  blocked_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
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
  distance_km numeric(5, 2) not null check (distance_km >= 0 and distance_km <= 20),
  created_at timestamptz not null default now()
);

create table public.favorite_products (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_id text not null unique,
  user_id uuid references auth.users(id),
  customer_name text not null,
  customer_phone text not null,
  delivery_address jsonb not null,
  subtotal numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null,
  total_amount numeric(10, 2) not null,
  delivery_distance numeric(5, 2) not null,
  payment_method text not null,
  payment_status text not null default 'Pending',
  status text not null default 'Pending',
  assigned_agent_id uuid,
  delivery_eta text not null default 'Waiting for owner confirmation',
  refund_status text not null default 'Not requested',
  cancellation_reason text,
  invoice_number text not null,
  created_at timestamptz not null default now()
);

create table public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create table public.delivery_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  active boolean not null default true
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id),
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table public.promo_codes (
  code text primary key,
  type text not null check (type in ('percentage', 'flat')),
  value numeric(10, 2) not null,
  min_cart_total numeric(10, 2) not null default 0,
  active boolean not null default true
);

-- Recommended storage bucket for product photos:
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

-- Useful realtime channels:
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.admin_activity_log;
`;
