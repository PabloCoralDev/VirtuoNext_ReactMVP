-- Fix the signup trigger to properly create profiles for new users
-- Run this in your Supabase SQL Editor

-- First, ensure the profiles table exists with correct schema
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('soloist', 'pianist')),
  bio TEXT,
  picture_url TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies (drop if exists first)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_user_type TEXT;
BEGIN
  -- Extract metadata with fallbacks
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),  -- Use email username as fallback
    'User'
  );

  v_user_type := COALESCE(
    NEW.raw_user_meta_data->>'userType',
    'soloist'  -- Default to soloist
  );

  -- Validate user_type
  IF v_user_type NOT IN ('soloist', 'pianist') THEN
    v_user_type := 'soloist';
  END IF;

  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name, user_type, bio)
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'bio', NULL)
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent errors if profile somehow already exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;

-- Test query: Check if trigger exists
-- SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Test query: Check if function exists
-- SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
