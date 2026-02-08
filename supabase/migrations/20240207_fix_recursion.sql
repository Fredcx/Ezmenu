-- Fix Infinite Recursion in Profiles Policy

-- 1. Drop the problematic policy
DROP POLICY IF EXISTS "Super Admin Manage Profiles" ON public.profiles;

-- 2. Create a new policy that avoids self-referencing subquery for the Super Admin
-- We will rely entirely on the JWT email claim for the Super Admin to break the loop.
-- OR we can allow the user to read their OWN profile without role check first.

CREATE POLICY "Super Admin Manage Profiles"
ON public.profiles
FOR ALL
USING (
    -- TRUST THE JWT CLAIM for Super Admin (Avoids querying profiles table)
    auth.jwt() ->> 'email' IN ('admin@ezmenu.com', 'estille@gmail.com')
    OR
    -- Allow users to manage their OWN profile (Basic rule, breaks recursion for self)
    id = auth.uid()
);

-- 3. Ensure Establishments policy is also safe (it queries profiles, which is fine as long as profiles policy allows reading)
-- But to be safe, let's update it to trust JWT too, for performance and safety.
DROP POLICY IF EXISTS "Super Admin Manage Establishments" ON public.establishments;

CREATE POLICY "Super Admin Manage Establishments"
ON public.establishments
FOR ALL
USING (
    -- Trust JWT for Super Admin
    auth.jwt() ->> 'email' IN ('admin@ezmenu.com', 'estille@gmail.com')
    OR
    -- Or check profile role (this might still work if profiles policy is fixed, but JWT is safer)
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
);
