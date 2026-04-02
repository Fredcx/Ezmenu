
-- Enable RLS on Orders and Order Items
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Orders Policies
-- Allow anyone (even unauthenticated) to place an order
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
CREATE POLICY "Public Insert Orders" ON public.orders
FOR INSERT WITH CHECK (true);

-- Allow anyone to view orders (filtered by table/establishment in the app)
DROP POLICY IF EXISTS "Public View Orders" ON public.orders;
CREATE POLICY "Public View Orders" ON public.orders
FOR SELECT USING (true);

-- Allow admins/waiters full access
DROP POLICY IF EXISTS "Admin Manage Orders" ON public.orders;
CREATE POLICY "Admin Manage Orders" ON public.orders
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role IN ('admin', 'waiter', 'super_admin'))
    )
);

-- 2. Order Items Policies
-- Allow anyone to insert order items
DROP POLICY IF EXISTS "Public Insert Order Items" ON public.order_items;
CREATE POLICY "Public Insert Order Items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- Allow anyone to view order items
DROP POLICY IF EXISTS "Public View Order Items" ON public.order_items;
CREATE POLICY "Public View Order Items" ON public.order_items
FOR SELECT USING (true);

-- Allow admins/waiters full access
DROP POLICY IF EXISTS "Admin Manage Order Items" ON public.order_items;
CREATE POLICY "Admin Manage Order Items" ON public.order_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role IN ('admin', 'waiter', 'super_admin'))
    )
);
