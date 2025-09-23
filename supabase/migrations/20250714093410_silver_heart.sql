/*
  # Create users table for authentication and user management

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier for each user
      - `email` (text, unique) - User's email address for login
      - `name` (text) - Full name of the user
      - `role` (enum) - Either 'admin' or 'member' for access control
      - `password_hash` (text) - Encrypted password storage
      - `avatar_url` (text, optional) - Profile picture URL
      - `phone` (text, optional) - Contact phone number
      - `department` (text, optional) - User's department/team
      - `hire_date` (date, optional) - Employee hire date
      - `is_active` (boolean) - Account status
      - `created_at` (timestamp) - Account creation time
      - `updated_at` (timestamp) - Last profile update

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for admins to read all user data
    - Add policy for admins to update user data
*/

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'member');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'member',
  password_hash text NOT NULL,
  avatar_url text,
  phone text,
  department text,
  hire_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);