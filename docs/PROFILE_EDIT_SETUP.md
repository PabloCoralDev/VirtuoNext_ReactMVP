# Profile Edit Page Setup

## What Was Added

I've added a complete user profile editing system that allows users to customize their profiles. This builds on top of the sidebar feature.

### Features Included:

#### 1. **Profile Picture Upload**
- Upload images (JPG, PNG, GIF)
- Maximum 5MB file size
- Automatic avatar with user initials as fallback
- Images stored in Supabase Storage
- Real-time preview after upload

#### 2. **Editable Fields**
- **Name**: Users can update their display name
- **Bio**: 500 character limit with live counter
- **Email**: Displayed but not editable (security)
- **Account Type**: Displayed but not editable (soloist/pianist)

#### 3. **User Experience**
- Clean, card-based layout
- Loading states during save/upload
- Success and error messages
- "Back to Marketplace" navigation
- "Edit Profile" button in sidebar

---

## Supabase Setup Required

### Step 1: Run the SQL Migration (if you haven't already)

1. Go to your Supabase dashboard SQL Editor
2. Run the contents of `supabase-sidebar-migration.sql`
3. This creates the `profiles` table needed for storing bio and picture URL

### Step 2: Create Storage Bucket

**This is a NEW requirement for profile pictures:**

1. In your Supabase dashboard, click **Storage** in the left sidebar
2. Click **New bucket**
3. Set the following:
   - **Name**: `profile-pictures`
   - **Public bucket**: Toggle ON (important!)
   - **File size limit**: Leave default or set to 5MB
   - **Allowed MIME types**: Leave empty or set to `image/*`
4. Click **Create bucket**

### Step 3: Set Storage Policies

After creating the bucket, you need to add security policies. Go to **SQL Editor** and run these commands:

```sql
-- Allow authenticated users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access to all profile pictures
CREATE POLICY "Public read access to profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile picture"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-pictures' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

These policies ensure:
- Users can only upload/edit/delete their own pictures
- Anyone can view profile pictures (for the marketplace)
- Organized by user ID in folders

---

## What Changed in the Code

### New Files:
1. **`src/components/ProfilePage.tsx`**: Complete profile editing page

### Modified Files:

1. **`src/components/ProfileSidebar.tsx`**:
   - Added "Edit Profile" button
   - Added `onEditProfile` prop to handle navigation

2. **`src/components/Marketplace.tsx`**:
   - Added `onEditProfile` prop
   - Passes the prop to ProfileSidebar

3. **`src/App.tsx`**:
   - Added 'profile' to AppState
   - Added ProfilePage route
   - Added navigation handlers

4. **`supabase-sidebar-migration.sql`**:
   - Added manual setup instructions at the end

---

## How It Works

### Navigation Flow:
1. User is in Marketplace
2. Clicks "Edit Profile" button in sidebar
3. Navigates to ProfilePage
4. Makes changes and clicks "Save Changes"
5. Can click "Back" or "Cancel" to return to Marketplace
6. Sidebar automatically reflects updated profile info

### Data Flow:
1. Profile data is loaded from `profiles` table on mount
2. If no profile exists, it will be created on first save
3. Images are uploaded to Supabase Storage
4. Public URL is stored in `profiles.picture_url`
5. Changes sync to auth metadata (for name)

---

## Testing the Feature

### Test Profile Picture Upload:
1. Log in to your account
2. Click "Edit Profile" in the sidebar
3. Click "Upload Image"
4. Select an image file
5. Wait for upload (you'll see "Uploading..." state)
6. Image preview updates immediately
7. Click "Save Changes" to persist

### Test Bio Editing:
1. Go to Edit Profile page
2. Type in the bio textarea
3. Watch character counter (should show X/500)
4. Try typing over 500 chars (won't let you)
5. Click "Save Changes"
6. Return to marketplace and check sidebar (bio should be truncated with "...")

### Test Name Change:
1. Change your name in the "Name" field
2. Click "Save Changes"
3. Return to marketplace
4. Check that name updated in header and sidebar

---

## Additional Features for MVP

Beyond your requirements, I included:

### 1. **Character Counter**
- Shows live count of bio characters (X/500)
- Prevents going over limit
- Provides visual feedback

### 2. **Image Validation**
- File type checking (images only)
- File size limit (5MB max)
- Clear error messages

### 3. **Loading States**
- Upload spinner while image uploads
- Save spinner while saving
- Prevents double-submission

### 4. **Success/Error Feedback**
- Green success banner after save
- Red error banner if something fails
- Auto-dismisses after 3 seconds

### 5. **Organized Storage**
- Images stored in `avatars/` folder
- Filenames: `{userId}-{timestamp}.{ext}`
- Prevents filename collisions
- Easy to identify who owns each image

---

## Future Enhancements (Optional)

Consider adding these later:

1. **Image Cropping**: Let users crop before upload
2. **Image Compression**: Auto-compress large images
3. **More Profile Fields**:
   - Phone number
   - Location/city
   - Years of experience
   - Preferred genres
   - Instruments played (for pianists)
   - Repertoire specialization
4. **Social Links**: Website, Instagram, YouTube
5. **Privacy Settings**: Control who can see profile
6. **Delete Account**: Self-service account deletion

---

## File Size & Limits

Current limits (can be adjusted):
- **Bio**: 500 characters
- **Image**: 5MB max
- **Image Types**: JPG, PNG, GIF
- **Name**: No hard limit (reasonable lengths)

To adjust limits:
- Bio: Change `maxLength={500}` in ProfilePage.tsx
- Image size: Change `5 * 1024 * 1024` in ProfilePage.tsx
- Storage: Update bucket settings in Supabase

---

## Security Notes

### What's Protected:
- Users can only edit their own profiles (RLS policies)
- Users can only upload to their own folder
- Email cannot be changed (prevents account hijacking)
- Account type cannot be changed (prevents privilege escalation)
- Image uploads validated on client-side
- Storage policies validate on server-side

### What Users Can Change:
- Their name
- Their bio
- Their profile picture

---

## Troubleshooting

### "Failed to upload image"
- Check that you created the `profile-pictures` bucket
- Verify the bucket is set to PUBLIC
- Make sure storage policies are applied
- Check file size is under 5MB
- Ensure file is an image type

### Profile picture not showing
- Check if the URL in database starts with your Supabase URL
- Verify storage policies allow public SELECT
- Clear browser cache
- Check browser console for CORS errors

### "Failed to save profile"
- Check that `profiles` table exists
- Verify RLS policies are correct
- Check browser console for errors
- Ensure user is authenticated

### Changes not reflecting in sidebar
- Try refreshing the page
- Check that save was successful (green banner)
- Verify data in Supabase Table Editor
- Check for console errors

---

## Database Schema Reference

### `profiles` table columns:
- `id` (UUID): User ID from auth.users
- `email` (TEXT): User's email
- `name` (TEXT): Display name
- `user_type` (TEXT): 'soloist' or 'pianist'
- `bio` (TEXT, nullable): User bio/description
- `picture_url` (TEXT, nullable): URL to profile picture
- `created_at` (TIMESTAMP): When profile created
- `updated_at` (TIMESTAMP): When last updated

### Storage structure:
```
profile-pictures/
  └── avatars/
      ├── {userId}-{timestamp}.jpg
      ├── {userId}-{timestamp}.png
      └── ...
```

---

That's everything! Your users can now fully customize their profiles with pictures and bios. 🎉
