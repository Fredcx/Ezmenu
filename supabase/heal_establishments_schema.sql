-- HEAL: Ensure establishments table has all necessary columns for the Discovery Settings page.
-- This script is idempotent (safe to run multiple times).
-- Run this in your Supabase SQL Editor.

DO $$ 
BEGIN
    -- 1. Restaurant Type and Settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='restaurant_type') THEN
        ALTER TABLE public.establishments ADD COLUMN restaurant_type TEXT DEFAULT 'sushi';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='settings') THEN
        ALTER TABLE public.establishments ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- 2. Rodizio Prices
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='rodizio_price_adult') THEN
        ALTER TABLE public.establishments ADD COLUMN rodizio_price_adult numeric DEFAULT 129.99;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='rodizio_price_child') THEN
        ALTER TABLE public.establishments ADD COLUMN rodizio_price_child numeric DEFAULT 69.99;
    END IF;

    -- 3. Reservation Slots & Capacity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='max_reservations_per_slot') THEN
        ALTER TABLE public.establishments ADD COLUMN max_reservations_per_slot integer DEFAULT 10;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='reservation_start_time') THEN
        ALTER TABLE public.establishments ADD COLUMN reservation_start_time time DEFAULT '18:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='reservation_end_time') THEN
        ALTER TABLE public.establishments ADD COLUMN reservation_end_time time DEFAULT '23:00';
    END IF;

    -- 4. Feature Toggles (Visibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_tables') THEN
        ALTER TABLE public.establishments ADD COLUMN show_tables BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_queue') THEN
        ALTER TABLE public.establishments ADD COLUMN show_queue BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='show_reservations') THEN
        ALTER TABLE public.establishments ADD COLUMN show_reservations BOOLEAN DEFAULT FALSE;
    END IF;

    -- 5. Visibility (Portal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='establishments' AND column_name='is_visible') THEN
        ALTER TABLE public.establishments ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
    END IF;

END $$;

-- Update defaults for existing records where columns might have been added as NULL
UPDATE public.establishments SET 
    restaurant_type = COALESCE(restaurant_type, 'sushi'),
    rodizio_price_adult = COALESCE(rodizio_price_adult, 129.99),
    rodizio_price_child = COALESCE(rodizio_price_child, 69.99),
    show_tables = COALESCE(show_tables, TRUE),
    show_queue = COALESCE(show_queue, FALSE),
    show_reservations = COALESCE(show_reservations, FALSE),
    is_visible = COALESCE(is_visible, TRUE);
