-- ============================================================
-- THRIFTFIT — Supabase Schema
-- Extends the Fase 3 blueprint with what's needed to actually
-- run the "Cart Hold Timer" (pessimistic locking) and secure
-- row-level access. Run this in the Supabase SQL editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PRODUCTS
-- Blueprint columns kept as-is, plus hold_until / held_by for
-- the 15-minute pessimistic lock described in Fase 5 QA checklist.
-- ------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  chest_width_cm numeric(4,1) not null,   -- Lebar Dada
  length_cm numeric(4,1) not null,        -- Panjang Baju
  condition_grade varchar(10) not null,   -- A+, A, B, C
  condition_score numeric(3,1),           -- e.g. 9.0/10
  price decimal(10,2) not null,
  era varchar(50),
  material varchar(100),
  image_urls text[],                      -- Cloudinary/S3 URLs, first = main photo
  is_sold boolean default false,
  -- Pessimistic locking for the 1-of-1 checkout hold:
  hold_until timestamptz,                 -- null = not held; else lock expires at this time
  held_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index if not exists idx_products_chest on products (chest_width_cm);
create index if not exists idx_products_length on products (length_cm);
create index if not exists idx_products_grade on products (condition_grade);
create index if not exists idx_products_available on products (is_sold, hold_until);

-- ------------------------------------------------------------
-- USER FIT PROFILES
-- References Supabase's built-in auth.users (the blueprint's
-- "users" table is Supabase Auth in practice).
-- ------------------------------------------------------------
create table if not exists user_fit_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  profile_name varchar(100) not null default 'Default',
  target_chest_cm numeric(4,1) not null,
  target_length_cm numeric(4,1) not null,
  fit_preference varchar(20) default 'Regular', -- 'Slim' | 'Regular' | 'Boxy'
  created_at timestamptz default now()
);

create index if not exists idx_fit_profiles_user on user_fit_profiles (user_id);

-- ------------------------------------------------------------
-- ORDERS (needed for Dashboard "Riwayat Transaksi" + Checkout)
-- ------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  product_id uuid references products(id) not null,
  match_score numeric(5,2),               -- Fit-Match score at time of purchase
  courier varchar(50),                    -- e.g. 'JNE REG' — looked up server-side against a fixed cost table
  shipping_cost decimal(10,2),
  payment_method varchar(30),             -- 'QRIS' | 'E-Wallet' | 'VA' (informational; actual channel comes from Midtrans)
  status varchar(20) default 'pending',   -- 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'
  shipping_name varchar(150),
  shipping_phone varchar(30),
  shipping_address text,
  created_at timestamptz default now()
);

create index if not exists idx_orders_user on orders (user_id);
create index if not exists idx_orders_product on orders (product_id);

-- ------------------------------------------------------------
-- USER ADDRESSES
-- Backs the "Gunakan alamat tersimpan" feature in Checkout and
-- the Dashboard's address book — real persistence instead of the
-- in-memory mock used in the standalone HTML prototype.
-- ------------------------------------------------------------
create table if not exists user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  label varchar(50) default 'Rumah',       -- 'Rumah' | 'Kantor' | custom
  recipient_name varchar(150) not null,
  phone varchar(30) not null,
  full_address text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_addresses_user on user_addresses (user_id);

alter table user_addresses enable row level security;

create policy "Users manage their own addresses"
  on user_addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- FIT-MATCH SCORE as a Postgres function (optional server-side
-- alternative to computing it in the API route — lets you
-- `order by fit_match_score(...)` directly in SQL if the
-- catalog grows large).
-- ------------------------------------------------------------
create or replace function fit_match_score(
  p_chest numeric, p_length numeric,
  target_chest numeric, target_length numeric
) returns numeric as $$
  select greatest(
    0,
    100 - (abs(p_chest - target_chest) * 4.0) - (abs(p_length - target_length) * 2.5)
  );
$$ language sql immutable;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table products enable row level security;
alter table user_fit_profiles enable row level security;
alter table orders enable row level security;

-- Anyone (including anon visitors) can browse the catalog.
create policy "Public can read products"
  on products for select
  using (true);

-- Only server-side (service role) writes directly to products —
-- holds/sales go through the API routes, not client-side writes.
-- No insert/update/delete policy is created for anon/authenticated,
-- so the service role key (which bypasses RLS) is required for those.

-- Users can only see/manage their own fit profiles.
create policy "Users manage their own fit profiles"
  on user_fit_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see their own orders.
create policy "Users read their own orders"
  on orders for select
  using (auth.uid() = user_id);
