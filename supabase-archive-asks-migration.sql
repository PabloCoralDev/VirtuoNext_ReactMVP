-- Add archive functionality for asks
-- Run this in your Supabase SQL Editor

-- Add archived_at column to asks table
ALTER TABLE public.asks
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for archived asks queries
CREATE INDEX IF NOT EXISTS idx_asks_archived_at ON public.asks(archived_at);

-- Update RLS policy to allow users to archive their own asks
DROP POLICY IF EXISTS "Users can update their own asks" ON public.asks;
CREATE POLICY "Users can update their own asks"
  ON public.asks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically archive completed/expired auctions after 1 hour
CREATE OR REPLACE FUNCTION auto_archive_old_auctions()
RETURNS void AS $$
BEGIN
  -- Archive auctions that have been completed or expired for more than 1 hour
  UPDATE public.asks
  SET archived_at = NOW()
  WHERE archived_at IS NULL
    AND (
      -- Completed auctions older than 1 hour
      (auction_status = 'completed' AND updated_at < NOW() - INTERVAL '1 hour')
      OR
      -- Expired auctions older than 1 hour
      (auction_status = 'expired' AND auction_end_time < NOW() - INTERVAL '1 hour')
      OR
      -- Auctions past end time by more than 1 hour (fallback)
      (auction_end_time IS NOT NULL AND auction_end_time < NOW() - INTERVAL '1 hour' AND auction_status = 'active')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can run this function manually or set up a cron job
-- To test: SELECT auto_archive_old_auctions();

-- Optional: Create a scheduled job to run auto-archival every hour
-- Uncomment the following if you want automatic archival via pg_cron
-- Note: pg_cron extension must be enabled in your Supabase project

/*
SELECT cron.schedule(
  'auto-archive-auctions',
  '0 * * * *',  -- Run every hour
  $$
  SELECT auto_archive_old_auctions();
  $$
);
*/

-- To enable pg_cron:
-- 1. Go to Database → Extensions in Supabase dashboard
-- 2. Enable pg_cron extension
-- 3. Then uncomment and run the cron.schedule command above
