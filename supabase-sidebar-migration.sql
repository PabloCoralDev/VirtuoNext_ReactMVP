-- Migration for user profiles and tracking features
-- Run this in your Supabase SQL Editor
--
-- IMPORTANT: After running this SQL, you also need to:
-- 1. Create a storage bucket named 'profile-pictures' in Supabase Storage
-- 2. Set the bucket to PUBLIC
-- 3. Add storage policies (see instructions at the end of this file)

-- Create profiles table to store additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('soloist', 'pianist')),
  bio TEXT,
  picture_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profile_views table to track who viewed whose profile
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
-- Anyone can view profiles
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies for profile_views table
-- Anyone can view profile views
CREATE POLICY "Anyone can view profile views"
  ON profile_views FOR SELECT
  USING (true);

-- Authenticated users can insert profile views
CREATE POLICY "Authenticated users can insert profile views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, user_type, bio)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'userType', 'soloist'),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- MANUAL STEPS REQUIRED AFTER RUNNING THIS SQL
-- ============================================================================
--
-- STEP 1: Create Storage Bucket
-- -------------------------------
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New bucket"
-- 3. Name: profile-pictures
-- 4. Set as PUBLIC bucket
-- 5. Click "Create bucket"
--
-- STEP 2: Add Storage Policies
-- -------------------------------
-- Run these commands in SQL Editor to allow users to upload their own pictures:
--
-- Allow authenticated users to upload their own profile pictures:
-- CREATE POLICY "Users can upload their own profile picture"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'profile-pictures' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- Allow public read access to all profile pictures:
-- CREATE POLICY "Public read access to profile pictures"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'profile-pictures');
--
-- Allow users to update their own profile pictures:
-- CREATE POLICY "Users can update their own profile picture"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'profile-pictures' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- Allow users to delete their own profile pictures:
-- CREATE POLICY "Users can delete their own profile picture"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'profile-pictures' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
