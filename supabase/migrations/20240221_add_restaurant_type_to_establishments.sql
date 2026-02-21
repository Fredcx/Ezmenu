-- Migration: Add restaurant_type and settings to establishments
-- Date: 2024-02-21

ALTER TABLE establishments 
ADD COLUMN IF NOT EXISTS restaurant_type TEXT DEFAULT 'sushi',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Update existing records to 'sushi' if they were null (though default handles it)
UPDATE establishments SET restaurant_type = 'sushi' WHERE restaurant_type IS NULL;
