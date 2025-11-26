-- Fix RLS policy for updating bids
-- Run this in your Supabase SQL Editor

-- Drop the existing policy
DROP POLICY IF EXISTS "Ask owners can update bid status" ON public.bids;

-- Recreate with proper USING and WITH CHECK clauses
CREATE POLICY "Ask owners can update bid status"
  ON public.bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.asks
      WHERE asks.id = bids.ask_id
      AND asks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asks
      WHERE asks.id = bids.ask_id
      AND asks.user_id = auth.uid()
    )
  );
