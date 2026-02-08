-- Allow public (anon) users to view ONLY ACTIVE establishments.
-- This ensures that inactive or banned restaurants are not exposed via the API.

DROP POLICY IF EXISTS "Public View Establishments" ON public.establishments;

CREATE POLICY "Public View Establishments"
ON public.establishments
FOR SELECT
TO anon, authenticated
USING (status = 'active');
