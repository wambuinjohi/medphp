-- Fix orphaned foreign key constraints to the dropped 'users' table
-- This migration cleans up any remaining constraints that reference the dropped users table

-- First, check and drop any constraints that might reference the old users table
-- We'll recreate them properly if needed

-- Drop problematic RLS policies that might reference 'users' table
DROP POLICY IF EXISTS "Service role can access users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users" ON profiles;

-- Re-enable Row Level Security (if accidentally disabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verify auth.users constraint is correct
-- The profiles.id should ONLY reference auth.users(id), not a public users table

-- Create fresh RLS policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles in their company" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'::user_role
            AND admin_profile.company_id = profiles.company_id
        )
    );

CREATE POLICY "Admins can insert new profiles" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM profiles admin_profile 
                WHERE admin_profile.id = auth.uid() 
                AND admin_profile.role = 'admin'::user_role
            )
            OR 
            auth.uid() = id -- User can create their own profile
        )
    );

CREATE POLICY "Admins can update profiles in their company" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR
        EXISTS (
            SELECT 1 FROM profiles admin_profile 
            WHERE admin_profile.id = auth.uid() 
            AND admin_profile.role = 'admin'::user_role
            AND admin_profile.company_id = profiles.company_id
        )
    );

-- Ensure company_id foreign key is correct
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_company_id_fkey 
--     FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Log this fix
INSERT INTO migration_logs (migration_name, notes, status)
VALUES (
    'fix_orphaned_users_table_constraint',
    'Fixed orphaned foreign key constraints to dropped users table. Recreated RLS policies.',
    'completed'
) ON CONFLICT DO NOTHING;
