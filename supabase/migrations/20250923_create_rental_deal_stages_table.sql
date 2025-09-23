-- Create rental_deal_stages table
CREATE TABLE rental_deal_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES rental_deals(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  estimated_date DATE,
  actual_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES profiles(id),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rental_deal_stages_deal_id ON rental_deal_stages(deal_id);
CREATE INDEX idx_rental_deal_stages_order ON rental_deal_stages(deal_id, stage_order);
CREATE INDEX idx_rental_deal_stages_status ON rental_deal_stages(status);
CREATE INDEX idx_rental_deal_stages_assigned_to ON rental_deal_stages(assigned_to);

-- Enable RLS
ALTER TABLE rental_deal_stages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all rental deal stages" ON rental_deal_stages
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert rental deal stages" ON rental_deal_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rental deal stages" ON rental_deal_stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_rental_deal_stages_updated_at 
  BEFORE UPDATE ON rental_deal_stages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
