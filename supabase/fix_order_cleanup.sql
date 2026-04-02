-- FIX: Add ON DELETE CASCADE to order_items to allow deleting orders
-- Run this in your Supabase SQL Editor

-- 1. Identify and drop the existing foreign key constraint
-- Usually it's named 'order_items_order_id_fkey' but we can find it
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'public.order_items'::regclass 
    AND confrelid = 'public.orders'::regclass 
    AND contype = 'f';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.order_items DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. Add the constraint back with CASCADE
ALTER TABLE public.order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES public.orders(id) 
ON DELETE CASCADE;

-- 3. Ensure Admin Delete Policy exists
DROP POLICY IF EXISTS "Admin Delete Orders" ON public.orders;
CREATE POLICY "Admin Delete Orders" ON public.orders
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role IN ('admin', 'waiter', 'super_admin'))
    )
);

DROP POLICY IF EXISTS "Admin Delete Order Items" ON public.order_items;
CREATE POLICY "Admin Delete Order Items" ON public.order_items
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role IN ('admin', 'waiter', 'super_admin'))
    )
);
