-- =============================================================================
-- RAYHAR ATTENDANCE SYSTEM - COMPLETE DATABASE SCHEMA DDL
-- Generated from Live Supabase Database (PostgreSQL)
-- Date: 2026-09-13T02:43:29.771Z
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -------------------------------------------------------------
-- Table: activity_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id                         INTEGER DEFAULT nextval('activity_logs_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100),
  actor                      VARCHAR(200) NOT NULL,
  action                     VARCHAR(200) NOT NULL,
  target                     VARCHAR(200) NOT NULL,
  context                    TEXT,
  type                       VARCHAR(50) DEFAULT 'system'::character varying,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: alerts
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
  id                         INTEGER DEFAULT nextval('alerts_id_seq'::regclass) NOT NULL,
  type                       VARCHAR(128),
  user_id                    VARCHAR(64),
  payload                    JSON,
  acknowledged               BOOLEAN DEFAULT false,
  ack_by                     VARCHAR(64),
  ack_at                     TIMESTAMP,
  created_at                 TIMESTAMP,
  CONSTRAINT alerts_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: attendances
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendances (
  attendance_id              INTEGER DEFAULT nextval('attendances_attendance_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  clock_in                   TIMESTAMPTZ NOT NULL,
  clock_out                  TIMESTAMPTZ,
  late_minutes               INTEGER DEFAULT 0,
  date                       DATE,
  status                     VARCHAR(50) DEFAULT 'ON TIME'::character varying,
  location                   VARCHAR(50),
  attendance_type            VARCHAR(50) DEFAULT 'Normal'::character varying,
  assignment_id              INTEGER,
  clock_in_latitude          NUMERIC,
  clock_in_longitude         NUMERIC,
  clock_in_accuracy          NUMERIC,
  clock_out_latitude         NUMERIC,
  clock_out_longitude        NUMERIC,
  clock_out_accuracy         NUMERIC,
  distance_meters            NUMERIC,
  clock_out_distance_meters  INTEGER,
  CONSTRAINT attendances_pkey PRIMARY KEY (attendance_id)
);

-- -------------------------------------------------------------
-- Table: branches
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
  code                       VARCHAR(50) NOT NULL,
  branch                     VARCHAR(50) NOT NULL,
  name                       VARCHAR(255) NOT NULL,
  location                   VARCHAR(255),
  operating_zone             VARCHAR(50) DEFAULT 'ZONE_B'::character varying,
  latitude                   NUMERIC,
  longitude                  NUMERIC,
  radius                     INTEGER DEFAULT 50,
  CONSTRAINT branches_pkey PRIMARY KEY (code)
);

-- -------------------------------------------------------------
-- Table: company_leave_calendar
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_leave_calendar (
  id                         INTEGER DEFAULT nextval('company_leave_calendar_id_seq'::regclass) NOT NULL,
  leave_name                 VARCHAR(255) NOT NULL,
  leave_type                 VARCHAR(100),
  start_date                 DATE NOT NULL,
  end_date                   DATE NOT NULL,
  applies_to                 VARCHAR(100) NOT NULL,
  branch_id                  TEXT,
  department_id              TEXT,
  is_paid                    BOOLEAN DEFAULT true,
  attendance_required        BOOLEAN DEFAULT false,
  status                     VARCHAR(50) DEFAULT 'Active'::character varying,
  remarks                    TEXT,
  created_by                 VARCHAR(100),
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_leave_calendar_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: department
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.department (
  id                         INTEGER DEFAULT nextval('departments_id_seq'::regclass) NOT NULL,
  name                       VARCHAR(255) NOT NULL,
  code                       VARCHAR(50) NOT NULL,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT department_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: employee_allowed_locations
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_allowed_locations (
  id                         INTEGER DEFAULT nextval('employee_allowed_locations_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  allowed_branch             VARCHAR(50) NOT NULL,
  type                       VARCHAR(50) DEFAULT 'Secondary'::character varying,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employee_allowed_locations_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: employee_location_logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_location_logs (
  id                         INTEGER DEFAULT nextval('employee_location_logs_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(50),
  attendance_id              INTEGER,
  assignment_id              INTEGER,
  latitude                   NUMERIC,
  longitude                  NUMERIC,
  accuracy                   NUMERIC,
  location_type              VARCHAR(50),
  recorded_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address                 VARCHAR(45),
  CONSTRAINT employee_location_logs_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: employee_work_assignment
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_work_assignment (
  id                         INTEGER DEFAULT nextval('employee_work_assignment_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  location                   VARCHAR(50) NOT NULL,
  start_date                 DATE NOT NULL,
  end_date                   DATE,
  type                       VARCHAR(50) DEFAULT 'Temporary Assignment'::character varying,
  status                     VARCHAR(50) DEFAULT 'Active'::character varying,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  working_schedule_override  BOOLEAN DEFAULT false,
  purpose                    VARCHAR(255),
  remarks                    TEXT,
  CONSTRAINT employee_work_assignment_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: hod_history
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hod_history (
  id                         INTEGER DEFAULT nextval('hod_history_id_seq'::regclass) NOT NULL,
  department                 VARCHAR(100) NOT NULL,
  previous_hod_id            VARCHAR(100),
  new_hod_id                 VARCHAR(100) NOT NULL,
  changed_by_id              VARCHAR(100),
  changed_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT hod_history_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: leave_approvals
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_approvals (
  id                         INTEGER DEFAULT nextval('leave_approvals_id_seq'::regclass) NOT NULL,
  leave_id                   INTEGER NOT NULL,
  approver_id                VARCHAR(100) NOT NULL,
  approver_role              VARCHAR(100),
  status                     VARCHAR(50) NOT NULL,
  remarks                    TEXT,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_approvals_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: leave_balance_adjustments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_balance_adjustments (
  id                         INTEGER DEFAULT nextval('leave_balance_adjustments_id_seq'::regclass) NOT NULL,
  employee_id                VARCHAR(50),
  leave_type                 VARCHAR(100) NOT NULL,
  adjustment_days            INTEGER NOT NULL,
  reason                     TEXT,
  approved_by                VARCHAR(100),
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT leave_balance_adjustments_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: leave_requests
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
  leave_id                   INTEGER DEFAULT nextval('leave_requests_leave_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  leave_type                 VARCHAR(100) NOT NULL,
  start_date                 TIMESTAMPTZ NOT NULL,
  end_date                   TIMESTAMPTZ NOT NULL,
  days                       INTEGER NOT NULL,
  status                     VARCHAR(50) DEFAULT 'Pending'::character varying,
  approver_id                VARCHAR(100),
  approver_note              TEXT,
  waris_nama                 VARCHAR(255),
  waris_phone                VARCHAR(50),
  waris_alamat               TEXT,
  waris_hubungan             VARCHAR(100),
  cuti_ganti_tarikh          VARCHAR(255),
  cuti_ganti_hari            VARCHAR(255),
  cuti_ganti_jam             VARCHAR(255),
  cuti_tanpa_gaji_phone      VARCHAR(50),
  cuti_tanpa_gaji_signature  TEXT,
  mc_file_url                TEXT,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reason                     TEXT,
  approver_role              VARCHAR(100),
  phone                      VARCHAR(50),
  CONSTRAINT leave_requests_pkey PRIMARY KEY (leave_id)
);

-- -------------------------------------------------------------
-- Table: notifications
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id                         INTEGER DEFAULT nextval('notifications_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  title                      VARCHAR(255) NOT NULL,
  message                    TEXT NOT NULL,
  type                       VARCHAR(50),
  is_read                    BOOLEAN DEFAULT false,
  related_leave_id           INTEGER,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: outstation_assignments
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outstation_assignments (
  id                         INTEGER DEFAULT nextval('outstation_assignments_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  full_name                  VARCHAR(200),
  branch                     VARCHAR(100),
  department                 VARCHAR(100),
  position                   VARCHAR(100),
  destination                VARCHAR(300) NOT NULL,
  client_company             VARCHAR(200),
  purpose                    TEXT,
  project                    VARCHAR(200),
  meeting_title              VARCHAR(300),
  start_date                 DATE NOT NULL,
  start_time                 TIME,
  end_date                   DATE NOT NULL,
  end_time                   TIME,
  total_days                 NUMERIC,
  status                     VARCHAR(50) DEFAULT 'Upcoming'::character varying,
  assigned_by                VARCHAR(100),
  assigned_by_name           VARCHAR(200),
  assigned_by_role           VARCHAR(50),
  assigned_at                TIMESTAMP DEFAULT now(),
  created_at                 TIMESTAMP DEFAULT now(),
  updated_at                 TIMESTAMP DEFAULT now(),
  CONSTRAINT outstation_assignments_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: personal_notes
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_notes (
  id                         INTEGER DEFAULT nextval('personal_notes_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  date                       DATE NOT NULL,
  note_text                  TEXT NOT NULL,
  type                       VARCHAR(50) DEFAULT 'note'::character varying,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT personal_notes_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: profiles
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id                    VARCHAR(100) NOT NULL,
  full_name                  VARCHAR(255) NOT NULL,
  email                      VARCHAR(255) NOT NULL,
  password                   VARCHAR(255) NOT NULL,
  status                     VARCHAR(50) DEFAULT 'Active'::character varying,
  branch                     VARCHAR(100),
  phone                      VARCHAR(50),
  role                       VARCHAR(50) DEFAULT 'employee'::character varying,
  department                 VARCHAR(100),
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ic_number                  VARCHAR(20),
  annual_leave_entitlement   INTEGER DEFAULT 14,
  medical_leave_entitlement  INTEGER DEFAULT 14,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id)
);

-- -------------------------------------------------------------
-- Table: replacement_leave_requests
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.replacement_leave_requests (
  id                         BIGINT DEFAULT nextval('replacement_leave_requests_id_seq'::regclass) NOT NULL,
  employee_id                VARCHAR(50),
  leave_request_id           INTEGER,
  leave_date                 DATE,
  replacement_date           DATE,
  description                TEXT,
  required_hours             NUMERIC DEFAULT 4,
  actual_hours               NUMERIC,
  validation_status          VARCHAR(50) DEFAULT 'Pending'::character varying,
  attendance_id              BIGINT,
  validated_at               TIMESTAMP,
  validated_by               VARCHAR(50) DEFAULT 'System'::character varying,
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT replacement_leave_requests_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: role
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role (
  id                         UUID DEFAULT gen_random_uuid() NOT NULL,
  name                       VARCHAR(255) NOT NULL,
  status                     VARCHAR(50) DEFAULT 'Active'::character varying,
  created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT role_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------
-- Table: system_settings
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key                VARCHAR(50) NOT NULL,
  setting_value              VARCHAR(255),
  CONSTRAINT system_settings_pkey PRIMARY KEY (setting_key)
);

-- -------------------------------------------------------------
-- Table: user_role
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_role (
  id                         INTEGER DEFAULT nextval('user_role_id_seq'::regclass) NOT NULL,
  user_id                    VARCHAR(100) NOT NULL,
  role                       VARCHAR(50) NOT NULL,
  department                 VARCHAR(100),
  created_at                 TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_role_pkey PRIMARY KEY (id)
);

-- =============================================================
-- UNIQUE CONSTRAINTS
-- =============================================================
ALTER TABLE public.department DROP CONSTRAINT IF EXISTS departments_code_key;
ALTER TABLE public.department ADD CONSTRAINT departments_code_key UNIQUE (code);
ALTER TABLE public.department DROP CONSTRAINT IF EXISTS uq_department_name;
ALTER TABLE public.department ADD CONSTRAINT uq_department_name UNIQUE (name);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
ALTER TABLE public.role DROP CONSTRAINT IF EXISTS uq_role_name;
ALTER TABLE public.role ADD CONSTRAINT uq_role_name UNIQUE (name);
ALTER TABLE public.role DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE public.role ADD CONSTRAINT roles_name_key UNIQUE (name);

-- =============================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_user_id_fkey;
ALTER TABLE public.attendances
  ADD CONSTRAINT attendances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.employee_allowed_locations DROP CONSTRAINT IF EXISTS employee_allowed_locations_user_id_fkey;
ALTER TABLE public.employee_allowed_locations
  ADD CONSTRAINT employee_allowed_locations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.employee_location_logs DROP CONSTRAINT IF EXISTS fk_employee_location_logs_attendance_id;
ALTER TABLE public.employee_location_logs
  ADD CONSTRAINT fk_employee_location_logs_attendance_id
  FOREIGN KEY (attendance_id) REFERENCES public.attendances(attendance_id)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.employee_location_logs DROP CONSTRAINT IF EXISTS fk_employee_location_logs_user_id;
ALTER TABLE public.employee_location_logs
  ADD CONSTRAINT fk_employee_location_logs_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.employee_work_assignment DROP CONSTRAINT IF EXISTS employee_work_assignment_user_id_fkey;
ALTER TABLE public.employee_work_assignment
  ADD CONSTRAINT employee_work_assignment_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.leave_approvals DROP CONSTRAINT IF EXISTS leave_approvals_approver_id_fkey;
ALTER TABLE public.leave_approvals
  ADD CONSTRAINT leave_approvals_approver_id_fkey
  FOREIGN KEY (approver_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.leave_approvals DROP CONSTRAINT IF EXISTS leave_approvals_leave_id_fkey;
ALTER TABLE public.leave_approvals
  ADD CONSTRAINT leave_approvals_leave_id_fkey
  FOREIGN KEY (leave_id) REFERENCES public.leave_requests(leave_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.leave_balance_adjustments DROP CONSTRAINT IF EXISTS leave_balance_adjustments_employee_id_fkey;
ALTER TABLE public.leave_balance_adjustments
  ADD CONSTRAINT leave_balance_adjustments_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey;
ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.outstation_assignments DROP CONSTRAINT IF EXISTS fk_outstation_assignments_user_id;
ALTER TABLE public.outstation_assignments
  ADD CONSTRAINT fk_outstation_assignments_user_id
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_branch;
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_branch
  FOREIGN KEY (branch) REFERENCES public.branches(code)
  ON UPDATE NO ACTION ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_department;
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_department
  FOREIGN KEY (department) REFERENCES public.department(name)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS fk_profiles_role;
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_role
  FOREIGN KEY (role) REFERENCES public.role(name)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.replacement_leave_requests DROP CONSTRAINT IF EXISTS fk_leave_request;
ALTER TABLE public.replacement_leave_requests
  ADD CONSTRAINT fk_leave_request
  FOREIGN KEY (leave_request_id) REFERENCES public.leave_requests(leave_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE public.user_role DROP CONSTRAINT IF EXISTS fk_user_role_department;
ALTER TABLE public.user_role
  ADD CONSTRAINT fk_user_role_department
  FOREIGN KEY (department) REFERENCES public.department(name)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.user_role DROP CONSTRAINT IF EXISTS fk_user_role_role;
ALTER TABLE public.user_role
  ADD CONSTRAINT fk_user_role_role
  FOREIGN KEY (role) REFERENCES public.role(name)
  ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.user_role DROP CONSTRAINT IF EXISTS user_role_user_id_fkey;
ALTER TABLE public.user_role
  ADD CONSTRAINT user_role_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON UPDATE NO ACTION ON DELETE CASCADE;

-- =============================================================
-- BACKWARD COMPATIBILITY VIEWS
-- =============================================================
CREATE OR REPLACE VIEW public.departments AS SELECT * FROM public.department;
CREATE OR REPLACE VIEW public.roles AS SELECT * FROM public.role;
