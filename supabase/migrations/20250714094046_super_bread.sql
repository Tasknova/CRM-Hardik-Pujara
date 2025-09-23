/*
  # Create Members and Admin Tables

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `password_hash` (text)
      - `avatar_url` (text, optional)
      - `phone` (text, optional)
      - `department` (text, optional)
      - `hire_date` (date, optional)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `admins`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `password_hash` (text)
      - `avatar_url` (text, optional)
      - `phone` (text, optional)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated access
    - Members can read/update own data
    - Admins can read all member data

  3. Updates
    - Update existing tables to reference members instead of users
    - Add proper foreign key constraints
*/

-- Drop existing users table and recreate as members
DROP TABLE IF EXISTS users CASCADE;

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text NOT NULL,
  avatar_url text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for members
CREATE POLICY "Members can read own data"
  ON members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Members can update own data"
  ON members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all member data"
  ON members
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.id = auth.uid() AND admins.is_active = true
  ));

CREATE POLICY "Admins can update member data"
  ON members
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.id = auth.uid() AND admins.is_active = true
  ));

CREATE POLICY "Admins can create members"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM admins 
    WHERE admins.id = auth.uid() AND admins.is_active = true
  ));

-- RLS Policies for admins
CREATE POLICY "Admins can read own data"
  ON admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update own data"
  ON admins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update tasks table to reference members
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE tasks ADD CONSTRAINT tasks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE;

-- Update leaves table to reference members
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_user_id_fkey;
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_approved_by_fkey;

ALTER TABLE leaves ADD CONSTRAINT leaves_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;
ALTER TABLE leaves ADD CONSTRAINT leaves_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES members(id);

-- Update notifications table to reference members
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

-- Update task_comments table to reference members
ALTER TABLE task_comments DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
ALTER TABLE task_comments ADD CONSTRAINT task_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;

-- Update audit_logs table to reference members
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id);

-- Update user_sessions table to reference members
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE;