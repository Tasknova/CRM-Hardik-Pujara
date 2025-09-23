/*
  # Create leaves table for leave management

  1. New Tables
    - `leaves`
      - `id` (uuid, primary key) - Unique identifier for each leave
      - `user_id` (uuid, foreign key) - Reference to user taking leave
      - `leave_date` (date) - Date of the leave
      - `end_date` (date, optional) - End date for multi-day leaves
      - `leave_type` (enum) - Type of leave (sick, casual, paid, etc.)
      - `status` (enum) - Leave request status
      - `reason` (text) - Reason for taking leave
      - `approved_by` (uuid, foreign key, optional) - Admin who approved
      - `approved_at` (timestamp, optional) - When leave was approved
      - `notes` (text, optional) - Additional notes
      - `is_half_day` (boolean) - Whether it's a half day leave
      - `created_at` (timestamp) - Leave request creation time
      - `updated_at` (timestamp) - Last leave update

  2. Security
    - Enable RLS on `leaves` table
    - Add policy for users to read their own leaves
    - Add policy for admins to read all leaves
    - Add policy for leave creation and updates
*/

-- Create enums for leave management
CREATE TYPE leave_type AS ENUM ('sick', 'casual', 'paid', 'maternity', 'paternity', 'emergency', 'vacation');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Create leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  end_date date,
  leave_type leave_type NOT NULL,
  status leave_status DEFAULT 'pending',
  reason text NOT NULL,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  notes text,
  is_half_day boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint to ensure end_date is after or equal to leave_date
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= leave_date)
);

-- Enable RLS
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own leaves"
  ON leaves
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all leaves"
  ON leaves
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own leave requests"
  ON leaves
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending leaves"
  ON leaves
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update all leaves"
  ON leaves
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can delete own pending leaves"
  ON leaves
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can delete all leaves"
  ON leaves
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_leaves_updated_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_approved_at()
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
$$ language 'plpgsql';

CREATE TRIGGER set_leave_approved_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION set_approved_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_leave_date ON leaves(leave_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_leave_type ON leaves(leave_type);
CREATE INDEX IF NOT EXISTS idx_leaves_approved_by ON leaves(approved_by);
CREATE INDEX IF NOT EXISTS idx_leaves_created_at ON leaves(created_at);