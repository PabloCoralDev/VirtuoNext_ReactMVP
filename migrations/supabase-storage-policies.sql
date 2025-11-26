-- Storage Policies for profile-pictures bucket
-- Run this AFTER creating the profile-pictures bucket in Supabase Storage

-- Allow authenticated users to upload to profile-pictures bucket
CREATE POLICY "Users can upload profile pictures"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated'
  );

-- Allow public read access to all profile pictures
CREATE POLICY "Public read access to profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to update files in profile-pictures bucket
CREATE POLICY "Users can update profile pictures"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to delete files in profile-pictures bucket
CREATE POLICY "Users can delete profile pictures"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.role() = 'authenticated'
  );
