# Database Setup Instructions

## Step 1: Run the Migration Script

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xhnpzgqwcgvynqljycll
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-migration.sql` and paste it into the SQL editor
5. Click **Run** to execute the migration

This will create:
- `asks` table - stores all job postings from soloists
- `bids` table - stores all bids from pianists
- Proper indexes for performance
- Row Level Security (RLS) policies for data access control

## Step 2: Enable Realtime (Optional but Recommended)

For real-time updates when asks/bids are created:

1. In your Supabase dashboard, go to **Database** > **Replication**
2. Find the `asks` table and enable **Realtime**
3. Find the `bids` table and enable **Realtime**

This allows the UI to automatically update when someone creates an ask or places a bid!

## What Changed in the Code

### Removed
- All hardcoded mock data (`MOCK_ASKS`)
- Local state management for asks/bids

### Added
- Real database integration with Supabase
- Proper user authentication tied to asks/bids
- Real-time subscriptions for live updates
- Loading states
- Error handling

## Testing the App

1. **Create a Soloist Account**
   - Sign up as a soloist
   - Click "Post Ask" to create a job posting
   - Fill out the form and submit

2. **Create a Pianist Account**
   - Sign up as a pianist (use a different email)
   - You should see the soloist's ask in the marketplace
   - Click "Place Bid" to bid on the ask

3. **Accept a Bid**
   - Log back in as the soloist
   - Go to "My Asks" tab
   - Click on your ask to expand bids
   - Accept a bid

## Database Schema

### `asks` table
- `id` - Unique identifier
- `user_id` - References the user who created the ask
- `soloist_name` - Name of the soloist
- `instrument` - Instrument type
- `pieces` - Array of piece names
- `duration` - Duration (for hourly asks)
- `cost_type` - Either 'hourly' or 'per-piece'
- `cost` - Cost amount
- `location` - Performance location
- `date_type` - Either 'single', 'range', or 'semester'
- `date` - Single date (if applicable)
- `start_date` - Start date for range
- `end_date` - End date for range
- `semester` - Semester name (if applicable)
- `description` - Detailed description
- `created_at` - Timestamp

### `bids` table
- `id` - Unique identifier
- `ask_id` - References the ask
- `user_id` - References the user who created the bid
- `pianist_name` - Name of the pianist
- `amount` - Bid amount
- `message` - Bid message
- `status` - Either 'pending', 'accepted', or 'rejected'
- `created_at` - Timestamp

## Security

The database uses Row Level Security (RLS) to ensure:
- Anyone can view asks and bids
- Users can only create/edit/delete their own asks
- Users can only create/delete their own bids
- Only ask owners can accept/reject bids on their asks
