-- Migration to add rodizio prices to establishments
ALTER TABLE establishments 
ADD COLUMN IF NOT EXISTS rodizio_price_adult numeric DEFAULT 129.99,
ADD COLUMN IF NOT EXISTS rodizio_price_child numeric DEFAULT 69.99;
