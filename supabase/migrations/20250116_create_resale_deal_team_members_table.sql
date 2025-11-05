-- Create resale_deal_team_members table
CREATE TABLE resale_deal_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES resale_deals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'team_member',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES members(id)
);

-- Create indexes
CREATE INDEX idx_resale_deal_team_members_deal_id ON resale_deal_team_members(deal_id);
CREATE INDEX idx_resale_deal_team_members_member_id ON resale_deal_team_members(member_id);

-- Enable RLS
ALTER TABLE resale_deal_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies (matching rental_deal_team_members pattern)
CREATE POLICY "Users can view all resale deal team members" ON resale_deal_team_members
  FOR SELECT USING (true);

CREATE POLICY "Members can insert resale deal team members" ON resale_deal_team_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can update resale deal team members" ON resale_deal_team_members
  FOR UPDATE USING (true);

CREATE POLICY "Members can delete resale deal team members" ON resale_deal_team_members
  FOR DELETE USING (true);

