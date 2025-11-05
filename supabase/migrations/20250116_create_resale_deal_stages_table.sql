-- Create resale_deal_stages table
CREATE TABLE resale_deal_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES resale_deals(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  estimated_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_to UUID REFERENCES members(id),
  comments TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  attachments JSONB DEFAULT '[]',
  assigned_members UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_resale_deal_stages_deal_id ON resale_deal_stages(deal_id);
CREATE INDEX idx_resale_deal_stages_order ON resale_deal_stages(deal_id, stage_order);
CREATE INDEX idx_resale_deal_stages_status ON resale_deal_stages(status);
CREATE INDEX idx_resale_deal_stages_assigned_to ON resale_deal_stages(assigned_to);

-- Enable RLS
ALTER TABLE resale_deal_stages ENABLE ROW LEVEL SECURITY;

-- Create policies (matching rental_deal_stages pattern)
CREATE POLICY "Users can view all resale deal stages" ON resale_deal_stages
  FOR SELECT USING (true);

CREATE POLICY "Members can insert resale deal stages" ON resale_deal_stages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can update resale deal stages" ON resale_deal_stages
  FOR UPDATE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_resale_deal_stages_updated_at 
  BEFORE UPDATE ON resale_deal_stages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

