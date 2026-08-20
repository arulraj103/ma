-- =========================================================
-- Guest Bookings — one-time bookings made without login
-- Run this once in Supabase SQL Editor
-- =========================================================

create table if not exists guest_bookings (
  id uuid primary key default gen_random_uuid(),

  -- Customer details (guest, no account)
  customer_name text not null,
  phone text not null,
  address text,
  area text,
  landmark text,

  -- Vehicle
  vehicle_type text,
  vehicle_model text,
  seat_material text,

  -- Service
  service text not null,
  addons text,               -- comma-separated summary string

  -- Schedule
  requested_date date,
  requested_time text,
  notes text,

  -- Money / approval
  amount numeric not null default 0,
  status text not null default 'pending',   -- pending | approved | cancelled
  approved_at timestamptz,                  -- set when admin approves (income counts from this date)
  admin_note text,

  created_at timestamptz not null default now()
);

-- Helpful index for income queries
create index if not exists idx_guest_bookings_status_approved
  on guest_bookings (status, approved_at);

-- Make sure PostgREST picks up the new table immediately
notify pgrst, 'reload schema';
