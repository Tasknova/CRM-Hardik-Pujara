-- Create resale_deals table
CREATE TABLE resale_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('residential', 'commercial')),
  
  -- Property Owner Information
  owner_id UUID REFERENCES owners(id),
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  owner_address TEXT,
  
  -- Broker Information
  broker_id UUID REFERENCES brokers(id),
  broker_name TEXT,
  broker_email TEXT,
  broker_phone TEXT,
  broker_address TEXT,
  broker_company_name TEXT,
  broker_license_number TEXT,
  
  -- Property Buyer Information
  buyer_id UUID REFERENCES clients(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_address TEXT,
  
  -- Property Details
  property_address TEXT NOT NULL,
  property_type TEXT NOT NULL,
  property_area NUMERIC,
  property_price NUMERIC DEFAULT 0,
  property_description TEXT,
  
  -- Financial Information
  brokerage_amount NUMERIC DEFAULT 0,
  commission_percentage NUMERIC,
  commission_amount NUMERIC,
  booking_amount NUMERIC,
  has_loan BOOLEAN DEFAULT false,
  loan_amount NUMERIC,
  loan_provider_id UUID REFERENCES loan_providers(id),
  loan_provider_name TEXT,
  loan_provider_contact TEXT,
  
  -- Timeline
  start_date DATE,
  expected_completion_date DATE,
  end_date DATE,
  
  -- Additional Information
  additional_notes TEXT,
  project_manager_id UUID REFERENCES project_managers(id),
  
  -- Status and Tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
  current_stage INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Project Reference
  project_id UUID REFERENCES projects(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES members(id)
);

-- Create indexes for better performance
CREATE INDEX idx_resale_deals_deal_type ON resale_deals(deal_type);
CREATE INDEX idx_resale_deals_status ON resale_deals(status);
CREATE INDEX idx_resale_deals_created_at ON resale_deals(created_at);
CREATE INDEX idx_resale_deals_owner_id ON resale_deals(owner_id);
CREATE INDEX idx_resale_deals_buyer_id ON resale_deals(buyer_id);
CREATE INDEX idx_resale_deals_broker_id ON resale_deals(broker_id);
CREATE INDEX idx_resale_deals_project_id ON resale_deals(project_id);

-- Enable RLS
ALTER TABLE resale_deals ENABLE ROW LEVEL SECURITY;

-- Create policies (matching rental_deals pattern)
CREATE POLICY "Users can view all resale deals" ON resale_deals
  FOR SELECT USING (true);

CREATE POLICY "Members can insert resale deals" ON resale_deals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can update resale deals" ON resale_deals
  FOR UPDATE USING (true);

CREATE POLICY "Members can delete resale deals" ON resale_deals
  FOR DELETE USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_resale_deals_updated_at 
  BEFORE UPDATE ON resale_deals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

