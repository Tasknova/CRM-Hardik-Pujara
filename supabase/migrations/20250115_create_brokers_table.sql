-- Create brokers table
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    company_name VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_brokers_name ON public.brokers(name);
CREATE INDEX IF NOT EXISTS idx_brokers_email ON public.brokers(email);
CREATE INDEX IF NOT EXISTS idx_brokers_phone ON public.brokers(phone);

-- Enable RLS
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brokers
-- Allow all authenticated users to read brokers
CREATE POLICY "Allow authenticated users to read brokers" ON public.brokers
    FOR SELECT TO authenticated USING (true);

-- Allow admins to insert brokers
CREATE POLICY "Allow admins to insert brokers" ON public.brokers
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        )
    );

-- Allow admins to update brokers
CREATE POLICY "Allow admins to update brokers" ON public.brokers
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        )
    );

-- Allow admins to delete brokers
CREATE POLICY "Allow admins to delete brokers" ON public.brokers
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.admins 
            WHERE admins.id = auth.uid()
        )
    );

-- Add broker_id columns to rental_deals and builder_deals tables
ALTER TABLE public.rental_deals 
ADD COLUMN IF NOT EXISTS is_client_broker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL;

ALTER TABLE public.builder_deals 
ADD COLUMN IF NOT EXISTS is_client_broker BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_rental_deals_broker_id ON public.rental_deals(broker_id);
CREATE INDEX IF NOT EXISTS idx_builder_deals_broker_id ON public.builder_deals(broker_id);
CREATE INDEX IF NOT EXISTS idx_rental_deals_is_client_broker ON public.rental_deals(is_client_broker);
CREATE INDEX IF NOT EXISTS idx_builder_deals_is_client_broker ON public.builder_deals(is_client_broker);
