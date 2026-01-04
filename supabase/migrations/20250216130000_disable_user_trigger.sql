-- Drop the trigger that's causing the auth error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function so it won't be called
DROP FUNCTION IF EXISTS public.handle_new_user();
