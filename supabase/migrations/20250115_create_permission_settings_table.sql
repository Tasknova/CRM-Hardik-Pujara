-- Create permission_settings table
CREATE TABLE permission_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('project_manager', 'member')),
  permission_type TEXT NOT NULL CHECK (permission_type IN ('task', 'project')),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view')),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission_type, action)
);

-- Create indexes for better performance
CREATE INDEX idx_permission_settings_role ON permission_settings(role);
CREATE INDEX idx_permission_settings_permission_type ON permission_settings(permission_type);
CREATE INDEX idx_permission_settings_action ON permission_settings(action);

-- Enable RLS
ALTER TABLE permission_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all permission settings" ON permission_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert permission settings" ON permission_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update permission settings" ON permission_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete permission settings" ON permission_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_permission_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_settings_updated_at 
  BEFORE UPDATE ON permission_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_permission_settings_updated_at();

-- Insert default permission settings
INSERT INTO permission_settings (role, permission_type, action, is_enabled) VALUES
-- Project Manager permissions
('project_manager', 'task', 'create', true),
('project_manager', 'task', 'update', true),
('project_manager', 'task', 'delete', true),
('project_manager', 'task', 'view', true),
('project_manager', 'project', 'create', true),
('project_manager', 'project', 'update', true),
('project_manager', 'project', 'delete', false),
('project_manager', 'project', 'view', true),

-- Member permissions
('member', 'task', 'create', true),
('member', 'task', 'update', true),
('member', 'task', 'delete', false),
('member', 'task', 'view', true),
('member', 'project', 'create', false),
('member', 'project', 'update', false),
('member', 'project', 'delete', false),
('member', 'project', 'view', true);

