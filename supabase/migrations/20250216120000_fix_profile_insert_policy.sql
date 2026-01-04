-- Drop the problematic policy that prevents triggers from creating profiles
DROP POLICY IF EXISTS "Admins can insert new profiles" ON profiles;

-- Create a new policy that:
-- 1. Allows the trigger to insert (SECURITY DEFINER bypasses this)
-- 2. Allows admins to insert regular users
CREATE POLICY "Users and triggers can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        -- Allow if it's the current user creating their own profile (auth.uid() = id)
        -- OR if it's an admin creating another user
        auth.uid() = id 
        OR EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'
        )
    );
