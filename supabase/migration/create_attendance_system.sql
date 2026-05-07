-- =========================================
-- 1. ENABLE UUID EXTENSION
-- =========================================
create extension if not exists "uuid-ossp";

-- =========================================
-- 2. BRANCHES TABLE
-- =========================================
create table if not exists branches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  created_at timestamptz default now()
);

-- =========================================
-- 3. USER ROLES TABLE (IMPORTANT FOR ADMIN)
-- =========================================
create table if not exists user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null, -- 'hr_admin', 'branch_leader', 'employee'
  created_at timestamptz default now()
);

-- =========================================
-- 4. ATTENDANCE TABLE
-- =========================================
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  check_in timestamptz default now(),
  check_out timestamptz,
  status text default 'present', -- present, late, absent
  location_data jsonb,
  created_at timestamptz default now()
);

-- =========================================
-- 5. LEAVE REQUESTS TABLE
-- =========================================
create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  leave_type text not null, -- annual, sick, unpaid
  start_date date not null,
  end_date date not null,
  status text default 'pending', -- pending, approved, rejected
  reason text,
  approved_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- =========================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================
alter table branches enable row level security;
alter table user_roles enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;

-- =========================================
-- 7. ATTENDANCE POLICIES
-- =========================================

-- User can only see their own attendance
create policy if not exists "Users can view own attendance"
on attendance for select
using (auth.uid() = user_id);

-- User can insert their own attendance
create policy if not exists "Users can insert own attendance"
on attendance for insert
with check (auth.uid() = user_id);

-- Admin / HR can view all attendance
create policy if not exists "Admins can view all attendance"
on attendance for select
using (
  exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('hr_admin', 'branch_leader')
  )
);

-- =========================================
-- 8. LEAVE REQUEST POLICIES
-- =========================================

-- Users can manage only their own leave requests
create policy if not exists "Users manage own leave requests"
on leave_requests for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins can view all leave requests
create policy if not exists "Admins view all leave requests"
on leave_requests for select
using (
  exists (
    select 1 from user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role in ('hr_admin', 'branch_leader')
  )
);