/*
  # Create audit_logs table for system auditing

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_id` (uuid, foreign key) - User who performed the action
      - `action` (text) - Action performed (CREATE, UPDATE, DELETE, etc.)
      - `table_name` (text) - Table that was affected
      - `record_id` (uuid) - ID of the affected record
      - `old_values` (jsonb) - Previous values (for updates/deletes)
      - `new_values` (jsonb) - New values (for creates/updates)
      - `ip_address` (inet) - IP address of the user
      - `user_agent` (text) - Browser/client information
      - `created_at` (timestamp) - When the action occurred

  2. Security
    - Enable RLS on `audit_logs` table
    - Add policy for admins to read all audit logs
    - Add policy for system to create audit logs
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);