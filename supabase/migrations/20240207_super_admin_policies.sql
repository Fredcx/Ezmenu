-- 1. Ensure RLS is enabled
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Establishments Policies for Super Admin
DROP POLICY IF EXISTS "Super Admin Manage Establishments" ON public.establishments;

CREATE POLICY "Super Admin Manage Establishments"
ON public.establishments
FOR ALL
USING (
    -- Allow if the user has a profile with role 'super_admin'
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
    OR
    -- FALLBACK: Allow specific email if role check fails (Replace with your actual email if needed)
    auth.jwt() ->> 'email' IN ('admin@ezmenu.com', 'estille@gmail.com') 
);

-- 3. Profiles Policies for Super Admin
DROP POLICY IF EXISTS "Super Admin Manage Profiles" ON public.profiles;

CREATE POLICY "Super Admin Manage Profiles"
ON public.profiles
FOR ALL
USING (
    -- Allow if the user has a profile with role 'super_admin'
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
    OR
    -- FALLBACK: Allow specific email
    auth.jwt() ->> 'email' IN ('admin@ezmenu.com', 'estille@gmail.com')
);

-- 4. Allow Authenticated Users to View Establishments (needed for dashboard listing)
-- If not present, users can't see the list.
DROP POLICY IF EXISTS "Authenticated View Establishments" ON public.establishments;
CREATE POLICY "Authenticated View Establishments"
ON public.establishments
FOR SELECT
USING (auth.role() = 'authenticated');
