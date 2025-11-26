# Profile Sidebar Setup Instructions

## What Was Added

I've added a static profile sidebar to the home page marketplace that includes:

### 1. **Profile Card** (Top)
- User avatar (with initials fallback)
- User name
- User email
- User type badge (soloist/pianist)
- Bio (truncated with "..." if longer than 60 characters)

### 2. **Metrics Card** (Middle)
- **Profile Views**: Tracks how many times the profile has been viewed
- **For Soloists**:
  - Total Asks: Total number of asks posted
  - Bids Received: Total bids received on all asks
  - Accepted: Number of accepted bids
  - Active Asks: Number of asks still open (not yet accepted)
- **For Pianists**:
  - Total Bids: Total number of bids placed
  - Accepted: Number of accepted bids
  - Success Rate: Percentage of bids that were accepted

### 3. **Recent Activity Card** (Bottom)
- **For Soloists**: Shows up to 5 recent asks with instrument, price, and pieces
- **For Pianists**: Shows up to 5 recent bids with ask details and bid status

The sidebar is **sticky** and remains visible while scrolling through the marketplace.

---

## Supabase Setup Required

You need to run the SQL migration to create the necessary tables. Follow these steps:

### Step 1: Run the Migration Script

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xhnpzgqwcgvynqljycll
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-sidebar-migration.sql` and paste it into the SQL editor
5. Click **Run** to execute the migration

This will create:
- **`profiles` table**: Stores user profile information (bio, picture_url)
- **`profile_views` table**: Tracks profile views for analytics
- **Indexes**: For better query performance
- **Row Level Security (RLS) policies**: For data access control
- **Triggers**: Automatically creates a profile when a user signs up

### Step 2: Enable Realtime (Optional)

For real-time updates when profile data changes:

1. In your Supabase dashboard, go to **Database** > **Replication**
2. Find the `profiles` table and enable **Realtime**
3. Find the `profile_views` table and enable **Realtime**

---

## What Changed in the Code

### New Files Created:
1. **`src/components/ProfileSidebar.tsx`**: The sidebar component with all three cards
2. **`supabase-sidebar-migration.sql`**: SQL migration for new tables

### Modified Files:
1. **`src/components/Marketplace.tsx`**:
   - Added ProfileSidebar import
   - Updated props to include `userId` and `userEmail`
   - Modified layout to use flex container with sidebar on the left
   - Main marketplace content is now in a flex-1 container

2. **`src/App.tsx`**:
   - Updated Marketplace component call to pass `userId` and `userEmail` props

---

## Database Schema

### `profiles` Table
```sql
- id (UUID, Primary Key): References auth.users.id
- email (TEXT): User's email
- name (TEXT): User's name
- user_type (TEXT): 'soloist' or 'pianist'
- bio (TEXT, nullable): User's bio/description
- picture_url (TEXT, nullable): URL to user's profile picture
- created_at (TIMESTAMPTZ): When profile was created
- updated_at (TIMESTAMPTZ): When profile was last updated
```

### `profile_views` Table
```sql
- id (UUID, Primary Key): Auto-generated
- profile_id (UUID): References profiles.id
- viewer_id (UUID, nullable): References auth.users.id (null for anonymous)
- viewed_at (TIMESTAMPTZ): When the view occurred
```

---

## How Profile Views Work

Currently, the sidebar tracks a "self-view" every time the user loads the marketplace. This creates a simple view counter.

**Future Enhancement Ideas**:
- Track when other users view a profile page (if you add profile pages)
- Filter out self-views to only count external views
- Add daily/weekly view breakdowns

---

## Adding Bio and Profile Picture

The migration automatically creates profiles for users, but `bio` and `picture_url` start as null. To allow users to edit their profiles:

### Option 1: Quick Test (Manual)
You can manually add a bio for testing:
1. Go to **Table Editor** > **profiles**
2. Find your user row
3. Edit the `bio` field to add text
4. (Optional) Add a profile picture URL to `picture_url`

### Option 2: Build Profile Edit Feature (Future)
You could create a profile settings page where users can:
- Upload a profile picture
- Edit their bio
- Update their name

---

## Testing the Feature

After running the migration:

1. **Log in as a Soloist**:
   - You should see the sidebar on the left
   - Profile card shows your info
   - Metrics show your ask/bid statistics
   - Recent Activity shows your posted asks

2. **Log in as a Pianist**:
   - Sidebar appears the same way
   - Metrics show your bid statistics and success rate
   - Recent Activity shows asks you've bid on

3. **Create some data**:
   - Post asks (as soloist)
   - Place bids (as pianist)
   - Watch the metrics and activity cards update automatically

---

## Customization Options

### Adjust Sidebar Width
In `ProfileSidebar.tsx:384`, change `w-64` to:
- `w-56` for narrower
- `w-72` for wider

### Change Activity Item Limit
In `ProfileSidebar.tsx`, find `.limit(5)` in `fetchRecentActivity()` and change 5 to your preferred number.

### Add More Metrics
You can add more metrics by:
1. Querying additional data in `fetchMetrics()`
2. Adding new metric displays in the Metrics Card section

---

## Notes

- The sidebar uses Tailwind CSS classes for styling
- It's responsive and uses `sticky` positioning to stay visible while scrolling
- All database queries are secured with Row Level Security policies
- Profile views are tracked automatically on page load
- The component fetches data in parallel for better performance

---

## Troubleshooting

### Sidebar Not Showing
- Make sure you ran the migration
- Check browser console for errors
- Verify userId is being passed correctly from App.tsx

### Metrics Not Loading
- Check that asks/bids tables have data
- Verify RLS policies allow reading
- Check browser console for query errors

### Profile View Count Not Incrementing
- Make sure the `profile_views` table was created
- Check that the INSERT policy allows authenticated users

---

That's it! Your marketplace now has a beautiful, functional sidebar with user profiles and metrics. 🎉
