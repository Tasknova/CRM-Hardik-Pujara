-- PostgreSQL Database Dump: Tables, Foreign Keys, and RLS Policies
-- Team Management CRM Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'member', 'project_manager');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');
CREATE TYPE daily_task_status AS ENUM ('pending', 'completed', 'skipped');
CREATE TYPE leave_type AS ENUM ('sick', 'casual', 'paid', 'maternity', 'paternity', 'emergency', 'vacation');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_due', 'task_overdue', 'leave_approved', 'leave_rejected', 'system', 'reminder', 'task_status_updated_by_member', 'task_status_updated', 'task_added_by_admin', 'task_added', 'task_updated', 'task_deleted', 'task_updated_by_admin', 'leave_requested');
CREATE TYPE related_entity_type AS ENUM ('task', 'leave', 'user', 'system');

-- Create tables in dependency order

-- 1. Independent tables (no foreign keys)
CREATE TABLE public.members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    role user_role DEFAULT 'member',
    password_hash text NOT NULL,
    avatar_url text,
    phone text,
    department text,
    hire_date date,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid
);

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text,
    password_hash text,
    avatar_url text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid
);

CREATE TABLE public.project_managers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL,
    password_hash text NOT NULL,
    avatar_url text,
    phone text,
    department text,
    hire_date date,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    client_name text,
    start_date date,
    expected_end_date date,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'completed', 'on_hold', 'cancelled']))
);

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.owners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.builders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name varchar NOT NULL,
    location text NOT NULL,
    contact_email varchar,
    contact_phone varchar,
    address text,
    employees jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.loan_providers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_name text NOT NULL,
    address text,
    contact_details jsonb,
    employees jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.company_holidays (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    holiday_name text NOT NULL,
    date date NOT NULL,
    description text,
    year integer NOT NULL,
    created_at timestamptz DEFAULT timezone('utc', now()),
    updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE public.leave_defaults (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sick_leaves integer DEFAULT 30,
    casual_leaves integer DEFAULT 20,
    paid_leaves integer DEFAULT 30,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.webhook_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Tables with foreign keys to independent tables
CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    created_by uuid NOT NULL,
    task_name text NOT NULL,
    description text,
    due_date date NOT NULL,
    priority task_priority DEFAULT 'medium',
    status task_status DEFAULT 'pending',
    estimated_hours integer DEFAULT 0,
    actual_hours integer DEFAULT 0,
    tags text[] DEFAULT '{}',
    attachments jsonb DEFAULT '[]',
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    project_id uuid,
    progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

CREATE TABLE public.daily_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    created_by uuid NOT NULL,
    task_name text NOT NULL,
    description text,
    status daily_task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'medium',
    tags text[] DEFAULT '{}',
    attachments jsonb DEFAULT '[]',
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    is_active boolean DEFAULT true,
    task_date date DEFAULT CURRENT_DATE,
    project_id uuid
);

CREATE TABLE public.leaves (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    leave_date date,
    end_date date,
    leave_type leave_type NOT NULL,
    status leave_status DEFAULT 'pending',
    reason text NOT NULL,
    approved_by uuid,
    approved_at timestamptz,
    notes text,
    is_half_day boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category varchar DEFAULT 'single-day',
    from_date date,
    to_date date,
    brief_description text,
    balance_snapshot jsonb
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type notification_type NOT NULL,
    related_id uuid,
    related_type related_entity_type,
    is_read boolean DEFAULT false,
    action_url text,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz,
    from_id uuid,
    to_id uuid
);

CREATE TABLE public.task_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    comment text NOT NULL,
    attachments jsonb DEFAULT '[]',
    is_internal boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    action text NOT NULL,
    table_name text NOT NULL,
    record_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    session_token text UNIQUE NOT NULL,
    refresh_token text UNIQUE,
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true,
    expires_at timestamptz NOT NULL,
    last_activity timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.member_leave_balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id uuid,
    year integer NOT NULL,
    sick_leaves integer DEFAULT 30,
    casual_leaves integer DEFAULT 20,
    paid_leaves integer DEFAULT 30,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    project_manager_id uuid,
    admin_id uuid
);

CREATE TABLE public.project_manager_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_manager_id uuid NOT NULL,
    project_id uuid NOT NULL,
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.project_manager_leave_balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_manager_id uuid NOT NULL,
    year integer NOT NULL,
    casual_leave integer DEFAULT 0,
    sick_leave integer DEFAULT 0,
    earned_leave integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.deleted_tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_task_id uuid NOT NULL,
    task_name text NOT NULL,
    description text,
    status text,
    priority text,
    due_date date,
    progress integer DEFAULT 0,
    user_id uuid NOT NULL,
    created_by uuid NOT NULL,
    deleted_by uuid NOT NULL,
    project_id uuid,
    estimated_hours numeric,
    actual_hours numeric,
    tags text[],
    attachments jsonb DEFAULT '[]',
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz DEFAULT now(),
    task_type text DEFAULT 'regular',
    task_date date,
    is_active boolean DEFAULT true
);

CREATE TABLE public.rental_deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name text NOT NULL,
    deal_type text NOT NULL CHECK (deal_type = ANY (ARRAY['residential', 'commercial'])),
    client_name text NOT NULL,
    client_email text,
    client_phone text,
    owner_name text NOT NULL,
    owner_email text,
    owner_phone text,
    property_address text NOT NULL,
    property_type text NOT NULL,
    rental_amount numeric DEFAULT 0,
    security_deposit numeric DEFAULT 0,
    brokerage_amount numeric DEFAULT 0,
    start_date date,
    end_date date,
    additional_notes text,
    status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'completed', 'cancelled'])),
    current_stage integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    client_id uuid,
    owner_id uuid,
    project_id uuid
);

CREATE TABLE public.rental_deal_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL,
    stage_name text NOT NULL,
    stage_order integer NOT NULL,
    status text DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'skipped'])),
    estimated_date date,
    actual_date timestamptz,
    assigned_to uuid,
    comments text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    assigned_members uuid[] DEFAULT '{}',
    priority text DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low', 'medium', 'high', 'urgent'])),
    attachments jsonb DEFAULT '[]'
);

CREATE TABLE public.rental_deal_team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL,
    member_id uuid NOT NULL,
    role text DEFAULT 'team_member',
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid
);

CREATE TABLE public.rental_stage_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_id uuid,
    member_id uuid,
    task_id uuid,
    priority text DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low', 'medium', 'high', 'urgent'])),
    attachments jsonb DEFAULT '[]',
    assigned_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.builder_properties (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    builder_id uuid,
    property_name text NOT NULL,
    property_type text NOT NULL CHECK (property_type = ANY (ARRAY['residential', 'commercial'])),
    property_address text,
    property_area text,
    property_price text,
    status text DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'sold', 'on_hold'])),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.builder_deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid,
    project_name varchar NOT NULL,
    deal_type varchar NOT NULL CHECK (deal_type::text = ANY (ARRAY['residential', 'commercial']::text[])),
    property_type varchar NOT NULL,
    property_address text NOT NULL,
    property_area numeric,
    property_price numeric,
    builder_id uuid,
    builder_name varchar NOT NULL,
    builder_location text NOT NULL,
    client_id uuid,
    client_name varchar NOT NULL,
    client_email varchar,
    client_phone varchar,
    client_address text,
    commission_percentage numeric,
    commission_amount numeric,
    booking_amount numeric,
    loan_amount numeric,
    start_date date NOT NULL,
    end_date date NOT NULL,
    expected_completion_date date,
    status varchar DEFAULT 'active' CHECK (status::text = ANY (ARRAY['active', 'completed', 'cancelled', 'on_hold']::text[])),
    priority varchar DEFAULT 'medium' CHECK (priority::text = ANY (ARRAY['low', 'medium', 'high', 'urgent']::text[])),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by uuid,
    has_loan boolean DEFAULT false,
    loan_provider_id uuid,
    loan_provider_name text,
    loan_provider_contact text
);

CREATE TABLE public.builder_deal_stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid,
    stage_name varchar NOT NULL,
    stage_order integer NOT NULL,
    status varchar DEFAULT 'pending' CHECK (status::text = ANY (ARRAY['pending', 'in_progress', 'completed', 'skipped']::text[])),
    estimated_date date,
    actual_start_date date,
    actual_end_date date,
    priority varchar DEFAULT 'medium' CHECK (priority::text = ANY (ARRAY['low', 'medium', 'high', 'urgent']::text[])),
    comments text,
    attachments jsonb DEFAULT '[]',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.builder_deal_team_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid,
    member_id uuid,
    role varchar NOT NULL,
    assigned_at timestamptz DEFAULT now(),
    assigned_by uuid
);

CREATE TABLE public.builder_stage_assignments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    stage_id uuid,
    member_id uuid,
    task_id uuid,
    priority varchar DEFAULT 'medium' CHECK (priority::text = ANY (ARRAY['low', 'medium', 'high', 'urgent']::text[])),
    attachments jsonb DEFAULT '[]',
    assigned_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.daily_tasks ADD CONSTRAINT daily_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);
ALTER TABLE public.task_comments ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.members(id);
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.members(id);
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.members(id);
ALTER TABLE public.member_leave_balances ADD CONSTRAINT member_leave_balances_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);
ALTER TABLE public.member_leave_balances ADD CONSTRAINT member_leave_balances_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id);
ALTER TABLE public.member_leave_balances ADD CONSTRAINT member_leave_balances_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.project_managers(id);
ALTER TABLE public.project_manager_assignments ADD CONSTRAINT project_manager_assignments_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.project_managers(id);
ALTER TABLE public.project_manager_assignments ADD CONSTRAINT project_manager_assignments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.project_manager_assignments ADD CONSTRAINT project_manager_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.admins(id);
ALTER TABLE public.project_manager_leave_balances ADD CONSTRAINT project_manager_leave_balances_project_manager_id_fkey FOREIGN KEY (project_manager_id) REFERENCES public.project_managers(id);
ALTER TABLE public.deleted_tasks ADD CONSTRAINT deleted_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.rental_deals ADD CONSTRAINT rental_deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members(id);
ALTER TABLE public.rental_deals ADD CONSTRAINT rental_deals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.rental_deals ADD CONSTRAINT rental_deals_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.owners(id);
ALTER TABLE public.rental_deals ADD CONSTRAINT rental_deals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.rental_deal_stages ADD CONSTRAINT rental_deal_stages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.rental_deals(id);
ALTER TABLE public.rental_deal_stages ADD CONSTRAINT rental_deal_stages_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.members(id);
ALTER TABLE public.rental_deal_team_members ADD CONSTRAINT rental_deal_team_members_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.rental_deals(id);
ALTER TABLE public.rental_deal_team_members ADD CONSTRAINT rental_deal_team_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);
ALTER TABLE public.rental_deal_team_members ADD CONSTRAINT rental_deal_team_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.members(id);
ALTER TABLE public.rental_stage_assignments ADD CONSTRAINT rental_stage_assignments_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.rental_deal_stages(id);
ALTER TABLE public.rental_stage_assignments ADD CONSTRAINT rental_stage_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);
ALTER TABLE public.rental_stage_assignments ADD CONSTRAINT rental_stage_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);
ALTER TABLE public.builder_properties ADD CONSTRAINT builder_properties_builder_id_fkey FOREIGN KEY (builder_id) REFERENCES public.builders(id);
ALTER TABLE public.builder_deals ADD CONSTRAINT builder_deals_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE public.builder_deals ADD CONSTRAINT builder_deals_builder_id_fkey FOREIGN KEY (builder_id) REFERENCES public.builders(id);
ALTER TABLE public.builder_deals ADD CONSTRAINT builder_deals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.builder_deals ADD CONSTRAINT builder_deals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members(id);
ALTER TABLE public.builder_deals ADD CONSTRAINT builder_deals_loan_provider_id_fkey FOREIGN KEY (loan_provider_id) REFERENCES public.loan_providers(id);
ALTER TABLE public.builder_deal_stages ADD CONSTRAINT builder_deal_stages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.builder_deals(id);
ALTER TABLE public.builder_deal_team_members ADD CONSTRAINT builder_deal_team_members_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.builder_deals(id);
ALTER TABLE public.builder_deal_team_members ADD CONSTRAINT builder_deal_team_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);
ALTER TABLE public.builder_deal_team_members ADD CONSTRAINT builder_deal_team_members_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.members(id);
ALTER TABLE public.builder_stage_assignments ADD CONSTRAINT builder_stage_assignments_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.builder_deal_stages(id);
ALTER TABLE public.builder_stage_assignments ADD CONSTRAINT builder_stage_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id);
ALTER TABLE public.builder_stage_assignments ADD CONSTRAINT builder_stage_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);

-- Enable RLS on tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_manager_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_deal_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stage_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_deal_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_stage_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Members table policies
CREATE POLICY "Allow all for dev" ON public.members FOR ALL TO public USING (true);
CREATE POLICY "Allow all select" ON public.members FOR SELECT TO public USING (true);
CREATE POLICY "Allow all update" ON public.members FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all insert" ON public.members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.members FOR DELETE TO public USING (true);

-- Admins table policies
CREATE POLICY "Allow all select" ON public.admins FOR SELECT TO public USING (true);
CREATE POLICY "Allow all updates for dev" ON public.admins FOR UPDATE TO public USING (true);
CREATE POLICY "Allow insert for all (dev only)" ON public.admins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow delete for all (dev only)" ON public.admins FOR DELETE TO public USING (true);

-- Tasks table policies
CREATE POLICY "Allow all select" ON public.tasks FOR SELECT TO public USING (true);
CREATE POLICY "Allow all update" ON public.tasks FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all insert" ON public.tasks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.tasks FOR DELETE TO public USING (true);

-- Daily tasks table policies
CREATE POLICY "Allow all select" ON public.daily_tasks FOR SELECT TO public USING (true);
CREATE POLICY "Allow all update" ON public.daily_tasks FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all insert" ON public.daily_tasks FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.daily_tasks FOR DELETE TO public USING (true);

-- Leaves table policies
CREATE POLICY "Allow all select" ON public.leaves FOR SELECT TO public USING (true);
CREATE POLICY "Allow all update" ON public.leaves FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all insert" ON public.leaves FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all delete" ON public.leaves FOR DELETE TO public USING (true);

-- Notifications table policies
CREATE POLICY "Public can read notifications for their user_id (dev)" ON public.notifications FOR SELECT TO public USING (true);
CREATE POLICY "Public can insert notifications (dev)" ON public.notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow all authenticated to delete notifications" ON public.notifications FOR DELETE TO authenticated USING (true);

-- Projects table policies
CREATE POLICY "Allow all for dev" ON public.projects FOR ALL TO public USING (true);
CREATE POLICY "Allow select for all" ON public.projects FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert for all" ON public.projects FOR INSERT TO public WITH CHECK (true);

-- Member leave balances policies
CREATE POLICY "Allow all admins to read leave balances" ON public.member_leave_balances FOR SELECT TO public USING (true);
CREATE POLICY "Allow all admins to update leave balances" ON public.member_leave_balances FOR UPDATE TO public USING (true);
CREATE POLICY "Allow all admins to insert leave balances" ON public.member_leave_balances FOR INSERT TO public WITH CHECK (true);

-- Project manager leave balances policies
CREATE POLICY "Allow all operations for admins" ON public.project_manager_leave_balances FOR ALL TO public USING (true) WITH CHECK (true);

-- Leave defaults policies
CREATE POLICY "Allow all operations for admins" ON public.leave_defaults FOR ALL TO public USING (true) WITH CHECK (true);

-- Webhook settings policies
CREATE POLICY "Admins can read webhook settings" ON public.webhook_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = '00000000-0000-0000-0000-000000000000'::uuid));
CREATE POLICY "Admins can update webhook settings" ON public.webhook_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = '00000000-0000-0000-0000-000000000000'::uuid));

-- Rental deals policies
CREATE POLICY "Users can view all rental deals" ON public.rental_deals FOR SELECT TO public USING (true);
CREATE POLICY "Members can insert rental deals" ON public.rental_deals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Members can update rental deals" ON public.rental_deals FOR UPDATE TO public USING (true);
CREATE POLICY "Members can delete rental deals" ON public.rental_deals FOR DELETE TO public USING (true);

-- Rental deal stages policies
CREATE POLICY "Users can view all rental deal stages" ON public.rental_deal_stages FOR SELECT TO public USING (true);
CREATE POLICY "Members can insert rental deal stages" ON public.rental_deal_stages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Members can update rental deal stages" ON public.rental_deal_stages FOR UPDATE TO public USING (true);
CREATE POLICY "Members can delete rental deal stages" ON public.rental_deal_stages FOR DELETE TO public USING (true);

-- Rental deal team members policies
CREATE POLICY "Users can view all rental deal team members" ON public.rental_deal_team_members FOR SELECT TO public USING (true);
CREATE POLICY "Members can insert rental deal team members" ON public.rental_deal_team_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Members can update rental deal team members" ON public.rental_deal_team_members FOR UPDATE TO public USING (true);
CREATE POLICY "Members can delete rental deal team members" ON public.rental_deal_team_members FOR DELETE TO public USING (true);

-- Rental stage assignments policies
CREATE POLICY "Users can view all stage assignments" ON public.rental_stage_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert stage assignments" ON public.rental_stage_assignments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update stage assignments" ON public.rental_stage_assignments FOR UPDATE TO public USING (true);
CREATE POLICY "Users can delete stage assignments" ON public.rental_stage_assignments FOR DELETE TO public USING (true);

-- Clients policies
CREATE POLICY "Users can view all clients" ON public.clients FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert clients" ON public.clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update clients" ON public.clients FOR UPDATE TO public USING (true);

-- Owners policies
CREATE POLICY "Users can view all owners" ON public.owners FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert owners" ON public.owners FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update owners" ON public.owners FOR UPDATE TO public USING (true);

-- Builders policies
CREATE POLICY "Enable read access for all users" ON public.builders FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.builders FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.builders FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete access for all users" ON public.builders FOR DELETE TO public USING (true);

-- Builder deals policies
CREATE POLICY "Enable read access for all users" ON public.builder_deals FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.builder_deals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.builder_deals FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete access for all users" ON public.builder_deals FOR DELETE TO public USING (true);

-- Builder deal stages policies
CREATE POLICY "Enable read access for all users" ON public.builder_deal_stages FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.builder_deal_stages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.builder_deal_stages FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete access for all users" ON public.builder_deal_stages FOR DELETE TO public USING (true);

-- Builder deal team members policies
CREATE POLICY "Enable read access for all users" ON public.builder_deal_team_members FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.builder_deal_team_members FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.builder_deal_team_members FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete access for all users" ON public.builder_deal_team_members FOR DELETE TO public USING (true);

-- Builder stage assignments policies
CREATE POLICY "Enable read access for all users" ON public.builder_stage_assignments FOR SELECT TO public USING (true);
CREATE POLICY "Enable insert access for all users" ON public.builder_stage_assignments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.builder_stage_assignments FOR UPDATE TO public USING (true);
CREATE POLICY "Enable delete access for all users" ON public.builder_stage_assignments FOR DELETE TO public USING (true);

-- Builder properties policies
CREATE POLICY "Enable all operations for authenticated users" ON public.builder_properties FOR ALL TO public USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Loan providers policies
CREATE POLICY "Enable all operations for authenticated users" ON public.loan_providers FOR ALL TO public USING (true) WITH CHECK (true);

-- Task comments policies
CREATE POLICY "Admins can read all comments" ON public.task_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'admin'));
CREATE POLICY "Users can read comments on their tasks" ON public.task_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid()));
CREATE POLICY "Users can create comments on their tasks" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users can update own comments" ON public.task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.task_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Audit logs policies
CREATE POLICY "Admins can read all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'admin'));
CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- User sessions policies
CREATE POLICY "System can manage sessions" ON public.user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can read own sessions" ON public.user_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all sessions" ON public.user_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'admin'));

-- Project manager assignments policies
CREATE POLICY "Admins can view all project manager assignments" ON public.project_manager_assignments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
CREATE POLICY "Project managers can view their own assignments" ON public.project_manager_assignments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM project_managers WHERE project_managers.id = auth.uid() AND project_managers.id = project_manager_assignments.project_manager_id));
CREATE POLICY "Admins can insert project manager assignments" ON public.project_manager_assignments FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can update project manager assignments" ON public.project_manager_assignments FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));
CREATE POLICY "Admins can delete project manager assignments" ON public.project_manager_assignments FOR DELETE TO public USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

-- Project managers policies
CREATE POLICY "Admins can read all project manager data" ON public.project_managers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
CREATE POLICY "Project managers can read own data" ON public.project_managers FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can create project managers" ON public.project_managers FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
CREATE POLICY "Admins can update project manager data" ON public.project_managers FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
CREATE POLICY "Project managers can update own data" ON public.project_managers FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can delete project managers" ON public.project_managers FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));

-- Company holidays policies
CREATE POLICY "Admins can view all holidays" ON public.company_holidays FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'admin') OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid() AND admins.is_active = true));
CREATE POLICY "Members can view holidays" ON public.company_holidays FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.role = 'member' AND members.is_active = true));

-- Disable RLS on some tables that don't need it
ALTER TABLE public.company_holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_manager_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_providers DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.deleted_tasks IS 'Stores records of deleted tasks for audit purposes';
COMMENT ON COLUMN public.deleted_tasks.original_task_id IS 'ID of the original task that was deleted';
COMMENT ON COLUMN public.deleted_tasks.deleted_by IS 'ID of the user who deleted the task';
COMMENT ON COLUMN public.deleted_tasks.deleted_at IS 'Timestamp when the task was deleted';
COMMENT ON COLUMN public.deleted_tasks.task_type IS 'Type of task: regular or daily';

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, type) VALUES
('avatars', 'avatars', true, null, null, 'STANDARD'),
('task-attachments', 'task-attachments', true, 52428800, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], 'STANDARD');

-- Storage RLS Policies
CREATE POLICY "Public can select avatars (dev)" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public can insert avatars (dev)" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public can update avatars (dev)" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public can delete avatars (dev)" ON storage.objects FOR DELETE TO public USING (bucket_id = 'avatars');
CREATE POLICY "Public can upload avatars (dev)" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Task attachments are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'task-attachments');
CREATE POLICY "Anyone can upload task attachments" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'task-attachments');
CREATE POLICY "Anyone can update task attachments" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'task-attachments');
CREATE POLICY "Anyone can delete task attachments" ON storage.objects FOR DELETE TO public USING (bucket_id = 'task-attachments');

-- Custom Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_approved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at = now();
    NEW.approved_by = auth.uid();
  ELSIF NEW.status != 'approved' THEN
    NEW.approved_at = NULL;
    NEW.approved_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = now();
  ELSIF NEW.is_read = false THEN
    NEW.read_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.init_leave_balances_on_member_insert()
RETURNS TRIGGER AS $$
DECLARE
  current_year integer := EXTRACT(YEAR FROM now());
BEGIN
  INSERT INTO member_leave_balances (member_id, year, sick_leaves, casual_leaves, paid_leaves)
  VALUES (NEW.id, current_year, 30, 20, 30)
  ON CONFLICT (member_id, year) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_task_user_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user_id exists in any of the user tables
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id = NEW.user_id AND is_active = true
    UNION ALL
    SELECT 1 FROM admins WHERE id = NEW.user_id AND is_active = true
    UNION ALL
    SELECT 1 FROM project_managers WHERE id = NEW.user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid user_id: user does not exist or is inactive';
  END IF;

  -- Check if created_by exists in any of the user tables
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id = NEW.created_by AND is_active = true
    UNION ALL
    SELECT 1 FROM admins WHERE id = NEW.created_by AND is_active = true
    UNION ALL
    SELECT 1 FROM project_managers WHERE id = NEW.created_by AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid created_by: user does not exist or is inactive';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_daily_task_user_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user_id exists in any of the user tables
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id = NEW.user_id AND is_active = true
    UNION ALL
    SELECT 1 FROM admins WHERE id = NEW.user_id AND is_active = true
    UNION ALL
    SELECT 1 FROM project_managers WHERE id = NEW.user_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid user_id: user does not exist or is inactive';
  END IF;

  -- Check if created_by exists in any of the user tables
  IF NOT EXISTS (
    SELECT 1 FROM members WHERE id = NEW.created_by AND is_active = true
    UNION ALL
    SELECT 1 FROM admins WHERE id = NEW.created_by AND is_active = true
    UNION ALL
    SELECT 1 FROM project_managers WHERE id = NEW.created_by AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid created_by: user does not exist or is inactive';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_leave_user_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user_id exists in any of the user tables
    IF NOT EXISTS (
        SELECT 1 FROM all_users WHERE id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'User does not exist.';
    END IF;
    
    -- Check if approved_by exists in any of the user tables (if provided)
    IF NEW.approved_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM all_users WHERE id = NEW.approved_by
    ) THEN
        RAISE EXCEPTION 'Approver does not exist.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  days_to_deduct integer := 1;
  user_balance record;
  balance_table text := 'member_leave_balances';
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  check_date date;
  is_holiday boolean;
BEGIN
  -- Only proceed if status changed from pending to approved
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- Calculate days to deduct using the same logic as frontend
    IF NEW.category = 'multi-day' AND NEW.from_date IS NOT NULL AND NEW.to_date IS NOT NULL THEN
      -- Count non-Sunday and non-holiday days in the range (same as countNonSundayAndNonHolidayDays)
      days_to_deduct := 0;
      
      -- Iterate through each day in the range
      FOR check_date IN 
        SELECT generate_series(NEW.from_date::date, NEW.to_date::date, '1 day'::interval)::date
      LOOP
        -- Check if it's Sunday (0 = Sunday)
        IF EXTRACT(DOW FROM check_date) != 0 THEN
          -- Check if it's a company holiday
          SELECT EXISTS(
            SELECT 1 FROM company_holidays 
            WHERE date = check_date 
            AND year = current_year
          ) INTO is_holiday;
          
          -- Only count if it's not a holiday
          IF NOT is_holiday THEN
            days_to_deduct := days_to_deduct + 1;
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Find the user's leave balance (check all user types)
    SELECT * INTO user_balance 
    FROM member_leave_balances 
    WHERE (member_id = NEW.user_id OR admin_id = NEW.user_id OR project_manager_id = NEW.user_id)
    AND year = current_year
    LIMIT 1;
    
    -- If not found in member_leave_balances, check project_manager_leave_balances
    IF user_balance IS NULL THEN
      SELECT * INTO user_balance 
      FROM project_manager_leave_balances 
      WHERE project_manager_id = NEW.user_id
      AND year = current_year
      LIMIT 1;
      
      IF user_balance IS NOT NULL THEN
        balance_table := 'project_manager_leave_balances';
      END IF;
    END IF;
    
    IF user_balance IS NULL THEN
      RAISE EXCEPTION 'No leave balance found for user %', NEW.user_id;
    END IF;
    
    -- Deduct the appropriate leave type
    CASE NEW.leave_type
      WHEN 'sick' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.sick_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient sick leave balance. Available: %, Required: %', user_balance.sick_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET sick_leaves = sick_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.sick_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient sick leave balance. Available: %, Required: %', user_balance.sick_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET sick_leave = sick_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      WHEN 'casual' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.casual_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient casual leave balance. Available: %, Required: %', user_balance.casual_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET casual_leaves = casual_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.casual_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient casual leave balance. Available: %, Required: %', user_balance.casual_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET casual_leave = casual_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      WHEN 'paid' THEN
        IF balance_table = 'member_leave_balances' THEN
          IF user_balance.paid_leaves < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient paid leave balance. Available: %, Required: %', user_balance.paid_leaves, days_to_deduct;
          END IF;
          UPDATE member_leave_balances 
          SET paid_leaves = paid_leaves - days_to_deduct
          WHERE id = user_balance.id;
        ELSE
          IF user_balance.earned_leave < days_to_deduct THEN
            RAISE EXCEPTION 'Insufficient paid leave balance. Available: %, Required: %', user_balance.earned_leave, days_to_deduct;
          END IF;
          UPDATE project_manager_leave_balances 
          SET earned_leave = earned_leave - days_to_deduct
          WHERE id = user_balance.id;
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid leave type: %', NEW.leave_type;
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Webhook Functions
CREATE OR REPLACE FUNCTION public.send_task_webhook()
RETURNS TRIGGER AS $$
DECLARE
    webhook_setting JSONB;
    webhook_url TEXT;
    payload JSONB;
    operation TEXT;
    assigned_user_name TEXT;
    project_name TEXT;
    added_by_name TEXT;
    task_data RECORD;
BEGIN
    -- Check if webhook is enabled
    SELECT setting_value INTO webhook_setting 
    FROM webhook_settings 
    WHERE setting_key = 'task_webhook_enabled';
    
    -- If setting doesn't exist or webhook is disabled, return without sending
    IF webhook_setting IS NULL OR NOT (webhook_setting->>'enabled')::boolean THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;
    
    -- Get webhook URL from settings
    webhook_url := webhook_setting->>'url';
    
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        task_data := NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        task_data := NEW;
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        task_data := OLD;
    END IF;
    
    -- Get assigned user name (check all user tables)
    SELECT name INTO assigned_user_name 
    FROM members 
    WHERE id = task_data.user_id;
    
    IF assigned_user_name IS NULL THEN
        SELECT name INTO assigned_user_name 
        FROM admins 
        WHERE id = task_data.user_id;
    END IF;
    
    IF assigned_user_name IS NULL THEN
        SELECT name INTO assigned_user_name 
        FROM project_managers 
        WHERE id = task_data.user_id;
    END IF;
    
    -- Get project name
    SELECT name INTO project_name 
    FROM projects 
    WHERE id = task_data.project_id;
    
    -- Get added/updated by user name (check all user tables)
    SELECT name INTO added_by_name 
    FROM members 
    WHERE id = task_data.created_by;
    
    IF added_by_name IS NULL THEN
        SELECT name INTO added_by_name 
        FROM admins 
        WHERE id = task_data.created_by;
    END IF;
    
    IF added_by_name IS NULL THEN
        SELECT name INTO added_by_name 
        FROM project_managers 
        WHERE id = task_data.created_by;
    END IF;
    
    -- Build payload with table_name parameter
    payload := jsonb_build_object(
        'table_name', 'tasks',
        'id', task_data.id,
        'title', task_data.task_name,
        'status', task_data.status,
        'assigned_to', COALESCE(assigned_user_name, 'Unknown'),
        'project', COALESCE(project_name, 'No Project'),
        'added_updated_by', COALESCE(added_by_name, 'Unknown'),
        'added_updated_time', task_data.updated_at,
        'operation', operation,
        'priority', task_data.priority,
        'due_date', task_data.due_date,
        'progress', task_data.progress,
        'description', task_data.description,
        'estimated_hours', task_data.estimated_hours,
        'actual_hours', task_data.actual_hours,
        'tags', task_data.tags,
        'completed_at', task_data.completed_at
    );
    
    -- Send webhook asynchronously with correct function signature
    PERFORM net.http_post(
        url := webhook_url,
        body := payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 10000
    );
    
    -- For DELETE operations, return OLD, for others return NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send webhook: %', SQLERRM;
        -- Return appropriate record based on operation
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.send_daily_task_webhook()
RETURNS TRIGGER AS $$
DECLARE
    webhook_setting JSONB;
    webhook_url TEXT;
    payload JSONB;
    operation TEXT;
    assigned_user_name TEXT;
    project_name TEXT;
    added_by_name TEXT;
    task_data RECORD;
BEGIN
    -- Check if webhook is enabled (use the same setting as tasks)
    SELECT setting_value INTO webhook_setting 
    FROM webhook_settings 
    WHERE setting_key = 'task_webhook_enabled';
    
    -- If setting doesn't exist or webhook is disabled, return without sending
    IF webhook_setting IS NULL OR NOT (webhook_setting->>'enabled')::boolean THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;
    
    -- Get webhook URL from settings (same as tasks)
    webhook_url := webhook_setting->>'url';
    
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        task_data := NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        task_data := NEW;
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        task_data := OLD;
    END IF;
    
    -- Get assigned user name (check all user tables)
    SELECT name INTO assigned_user_name 
    FROM members 
    WHERE id = task_data.user_id;
    
    IF assigned_user_name IS NULL THEN
        SELECT name INTO assigned_user_name 
        FROM admins 
        WHERE id = task_data.user_id;
    END IF;
    
    IF assigned_user_name IS NULL THEN
        SELECT name INTO assigned_user_name 
        FROM project_managers 
        WHERE id = task_data.user_id;
    END IF;
    
    -- Get project name
    SELECT name INTO project_name 
    FROM projects 
    WHERE id = task_data.project_id;
    
    -- Get added/updated by user name (check all user tables)
    SELECT name INTO added_by_name 
    FROM members 
    WHERE id = task_data.created_by;
    
    IF added_by_name IS NULL THEN
        SELECT name INTO added_by_name 
        FROM admins 
        WHERE id = task_data.created_by;
    END IF;
    
    IF added_by_name IS NULL THEN
        SELECT name INTO added_by_name 
        FROM project_managers 
        WHERE id = task_data.created_by;
    END IF;
    
    -- Build payload for daily tasks with table_name parameter
    payload := jsonb_build_object(
        'table_name', 'daily_tasks',
        'id', task_data.id,
        'title', task_data.task_name,
        'status', task_data.status,
        'assigned_to', COALESCE(assigned_user_name, 'Unknown'),
        'project', COALESCE(project_name, 'No Project'),
        'added_updated_by', COALESCE(added_by_name, 'Unknown'),
        'added_updated_time', task_data.updated_at,
        'operation', operation,
        'priority', task_data.priority,
        'task_date', task_data.task_date,
        'description', task_data.description,
        'tags', task_data.tags,
        'completed_at', task_data.completed_at,
        'is_active', task_data.is_active,
        'task_type', 'daily_task'
    );
    
    -- Send webhook asynchronously
    PERFORM net.http_post(
        url := webhook_url,
        body := payload,
        params := '{}'::jsonb,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 10000
    );
    
    -- For DELETE operations, return OLD, for others return NEW
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send daily task webhook: %', SQLERRM;
        -- Return appropriate record based on operation
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql;

-- Create Triggers
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_tasks_updated_at
    BEFORE UPDATE ON public.daily_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER daily_tasks_webhook_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.daily_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.send_daily_task_webhook();

CREATE TRIGGER validate_daily_task_user_assignment_trigger
    BEFORE INSERT ON public.daily_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_daily_task_user_assignment();

CREATE TRIGGER deduct_leave_balance_trigger
    AFTER UPDATE ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_leave_balance_on_approval();

CREATE TRIGGER set_leave_approved_at
    BEFORE UPDATE ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION public.set_approved_at();

CREATE TRIGGER update_leaves_updated_at
    BEFORE UPDATE ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_leave_user_assignment_trigger
    BEFORE INSERT ON public.leaves
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_leave_user_assignment();

CREATE TRIGGER trigger_init_leave_balances
    AFTER INSERT ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.init_leave_balances_on_member_insert();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_notification_read_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_read_at();

CREATE TRIGGER update_owners_updated_at
    BEFORE UPDATE ON public.owners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_managers_updated_at
    BEFORE UPDATE ON public.project_managers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_deal_stages_updated_at
    BEFORE UPDATE ON public.rental_deal_stages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_deals_updated_at
    BEFORE UPDATE ON public.rental_deals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_stage_assignments_updated_at
    BEFORE UPDATE ON public.rental_stage_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at
    BEFORE UPDATE ON public.task_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_task_completed_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_completed_at();

CREATE TRIGGER tasks_webhook_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.send_task_webhook();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_task_users
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_task_user_assignment();

CREATE TRIGGER update_webhook_settings_updated_at
    BEFORE UPDATE ON public.webhook_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
