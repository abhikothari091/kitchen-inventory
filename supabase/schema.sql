-- Kitchen Inventory Tracker - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database

-- Locations (user-configurable)
create table locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  sort_order int default 0
);

-- Categories (user-configurable)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order int default 0
);

-- Core inventory items
create table items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tracking_mode text not null default 'counted',
  quantity numeric default 0,
  unit text default 'pcs',
  threshold numeric default 1,
  state text,
  location_id uuid references locations(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  barcode text,
  notes text,
  expires_on date,
  last_touched_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity history
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  item_name_snapshot text not null,
  action text not null,
  quantity_change numeric,
  quantity_after numeric,
  state_before text,
  state_after text,
  source text,
  session_id uuid,
  created_at timestamptz default now()
);

-- Indexes
create index on items(user_id);
create index on items(user_id, location_id);
create index on items(user_id, category_id);
create index on items(barcode) where barcode is not null;
create index on activity_log(user_id, created_at desc);

-- Row Level Security
alter table items enable row level security;
alter table locations enable row level security;
alter table categories enable row level security;
alter table activity_log enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users can manage their own items"
  on items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own locations"
  on locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own categories"
  on categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own activity logs"
  on activity_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
