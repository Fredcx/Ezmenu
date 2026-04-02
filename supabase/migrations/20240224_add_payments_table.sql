
-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    asaas_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, overdue, canceled
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'pix',
    pix_qr_code TEXT,
    pix_copy_paste TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on retry
DROP POLICY IF EXISTS "Enable read access for all users" ON payments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable update for service role" ON payments;

-- Create policies
CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON payments FOR UPDATE USING (true);

-- Enable realtime (Safe to run multiple times, but let's be careful with publications)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payments;
    END IF;
END $$;
