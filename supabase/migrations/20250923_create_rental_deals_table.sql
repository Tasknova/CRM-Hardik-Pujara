-- Create rental_deals table
CREATE TABLE rental_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('residential', 'commercial')),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  property_address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  rental_amount DECIMAL(12,2) DEFAULT 0,
  security_deposit DECIMAL(12,2) DEFAULT 0,
  brokerage_amount DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  additional_notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  current_stage INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for better performance
CREATE INDEX idx_rental_deals_deal_type ON rental_deals(deal_type);
CREATE INDEX idx_rental_deals_status ON rental_deals(status);
CREATE INDEX idx_rental_deals_created_at ON rental_deals(created_at);

-- Enable RLS
ALTER TABLE rental_deals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all rental deals" ON rental_deals
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert rental deals" ON rental_deals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rental deals" ON rental_deals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rental_deals_updated_at 
  BEFORE UPDATE ON rental_deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
