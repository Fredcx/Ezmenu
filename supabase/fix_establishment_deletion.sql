-- FIX: Enable Cascading Deletes for Establishments
-- This script ensures that deleting an establishment automatically cleans up all associated data.
-- Run this in your Supabase SQL Editor.

DO $$ 
DECLARE 
    tbl RECORD;
    constraint_name TEXT;
BEGIN 
    -- List of tables that typically have human-managed foreign keys to establishments
    FOR tbl IN (
        SELECT quote_ident(table_name) as name 
        FROM information_schema.columns 
        WHERE column_name = 'establishment_id' 
        AND table_schema = 'public'
    ) 
    LOOP
        -- Find the foreign key constraint name
        SELECT conname INTO constraint_name
        FROM pg_constraint 
        WHERE conrelid = ('public.' || tbl.name)::regclass 
        AND confrelid = 'public.establishments'::regclass 
        AND contype = 'f';

        IF constraint_name IS NOT NULL THEN
            -- Drop existing constraint
            EXECUTE 'ALTER TABLE public.' || tbl.name || ' DROP CONSTRAINT ' || constraint_name;
            
            -- Re-add with CASCADE
            EXECUTE 'ALTER TABLE public.' || tbl.name || ' ADD CONSTRAINT ' || constraint_name || 
                    ' FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE';
            
            RAISE NOTICE 'Updated constraint % on table % to ON DELETE CASCADE', constraint_name, tbl.name;
        END IF;
    END LOOP;
END $$;

-- Special cases for tables that might use different FK names or lack standard columns
-- Admin/Super Admin policies usually already allow DELETE if role is correct, 
-- but ensuring 'establishments' deletion policy is broad enough for Super Admin:
DROP POLICY IF EXISTS "Super Admin Manage Establishments" ON public.establishments;
CREATE POLICY "Super Admin Manage Establishments" ON public.establishments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);
