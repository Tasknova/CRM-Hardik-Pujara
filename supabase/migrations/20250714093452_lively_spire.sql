/*
  # Create notifications table for system notifications

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key) - Unique identifier for each notification
      - `user_id` (uuid, foreign key) - User receiving the notification
      - `title` (text) - Notification title
      - `message` (text) - Notification content
      - `type` (enum) - Type of notification
      - `related_id` (uuid, optional) - ID of related entity (task, leave, etc.)
      - `related_type` (enum, optional) - Type of related entity
      - `is_read` (boolean) - Whether notification has been read
      - `action_url` (text, optional) - URL for notification action
      - `created_at` (timestamp) - Notification creation time
      - `read_at` (timestamp, optional) - When notification was read

  2. Security
    - Enable RLS on `notifications` table
    - Add policy for users to read their own notifications
    - Add policy for system to create notifications
*/

-- Create enums for notifications
CREATE TYPE notification_type AS ENUM ('task_assigned', 'task_due', 'task_overdue', 'leave_approved', 'leave_rejected', 'system', 'reminder');
CREATE TYPE related_entity_type AS ENUM ('task', 'leave', 'user', 'system');

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type NOT NULL,
  related_id uuid,
  related_type related_entity_type,
  is_read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger to set read_at when is_read changes to true
CREATE OR REPLACE FUNCTION set_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = now();
  ELSIF NEW.is_read = false THEN
    NEW.read_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_notification_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_read_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_id, related_type);