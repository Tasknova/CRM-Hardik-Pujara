-- Create resale_stage_assignments table
CREATE TABLE resale_stage_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES resale_deal_stages(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachments JSONB DEFAULT '[]',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_resale_stage_assignments_stage_id ON resale_stage_assignments(stage_id);
CREATE INDEX idx_resale_stage_assignments_member_id ON resale_stage_assignments(member_id);
CREATE INDEX idx_resale_stage_assignments_task_id ON resale_stage_assignments(task_id);

-- Enable RLS
ALTER TABLE resale_stage_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies (matching rental_stage_assignments pattern)
CREATE POLICY "Users can view all resale stage assignments" ON resale_stage_assignments
  FOR SELECT USING (true);

CREATE POLICY "Members can insert resale stage assignments" ON resale_stage_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can update resale stage assignments" ON resale_stage_assignments
  FOR UPDATE USING (true);

CREATE POLICY "Members can delete resale stage assignments" ON resale_stage_assignments
  FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_resale_stage_assignments_updated_at 
  BEFORE UPDATE ON resale_stage_assignments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

