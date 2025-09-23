/*
  # Create user_sessions table for session management

  1. New Tables
    - `user_sessions`
      - `id` (uuid, primary key) - Unique identifier for each session
      - `user_id` (uuid, foreign key) - Reference to the user
      - `session_token` (text, unique) - JWT or session token
      - `refresh_token` (text, unique) - Refresh token for token renewal
      - `ip_address` (inet) - IP address of the session
      - `user_agent` (text) - Browser/client information
      - `is_active` (boolean) - Whether session is active
      - `expires_at` (timestamp) - When session expires
      - `last_activity` (timestamp) - Last activity timestamp
      - `created_at` (timestamp) - Session creation time

  2. Security
    - Enable RLS on `user_sessions` table
    - Add policy for users to read their own sessions
    - Add policy for admins to read all sessions
    - Add policy for session management
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  refresh_token text UNIQUE,
  ip_address inet,
  user_agent text,
  is_active boolean DEFAULT true,
  expires_at timestamptz NOT NULL,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can manage sessions"
  ON user_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < now() OR is_active = false;
END;
$$ language 'plpgsql';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);