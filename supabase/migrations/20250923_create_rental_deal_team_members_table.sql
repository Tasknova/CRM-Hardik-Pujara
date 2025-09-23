-- Create rental_deal_team_members table for many-to-many relationship
CREATE TABLE rental_deal_team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES rental_deals(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  UNIQUE(deal_id, member_id)
);

-- Create indexes
CREATE INDEX idx_rental_deal_team_members_deal_id ON rental_deal_team_members(deal_id);
CREATE INDEX idx_rental_deal_team_members_member_id ON rental_deal_team_members(member_id);

-- Enable RLS
ALTER TABLE rental_deal_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all rental deal team members" ON rental_deal_team_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert rental deal team members" ON rental_deal_team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rental deal team members" ON rental_deal_team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete rental deal team members" ON rental_deal_team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
