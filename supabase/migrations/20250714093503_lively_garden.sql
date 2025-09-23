/*
  # Create task_comments table for task collaboration

  1. New Tables
    - `task_comments`
      - `id` (uuid, primary key) - Unique identifier for each comment
      - `task_id` (uuid, foreign key) - Reference to the task
      - `user_id` (uuid, foreign key) - User who made the comment
      - `comment` (text) - Comment content
      - `attachments` (jsonb) - File attachments metadata
      - `is_internal` (boolean) - Whether comment is internal only
      - `created_at` (timestamp) - Comment creation time
      - `updated_at` (timestamp) - Last comment update

  2. Security
    - Enable RLS on `task_comments` table
    - Add policy for users to read comments on their tasks
    - Add policy for admins to read all comments
    - Add policy for comment creation and updates
*/

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  attachments jsonb DEFAULT '[]',
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read comments on their tasks"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_comments.task_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all comments"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can create comments on their tasks"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE id = task_comments.task_id AND user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Admins can create comments on any task"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own comments"
  ON task_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON task_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);