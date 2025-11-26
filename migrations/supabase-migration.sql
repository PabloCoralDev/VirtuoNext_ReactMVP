-- VirtuoNext Database Schema
-- Run this in your Supabase SQL Editor

-- Create asks table
CREATE TABLE IF NOT EXISTS public.asks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soloist_name TEXT NOT NULL,
  instrument TEXT NOT NULL,
  pieces TEXT[] DEFAULT '{}',
  duration TEXT,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('hourly', 'per-piece')),
  cost NUMERIC NOT NULL,
  location TEXT NOT NULL,
  date_type TEXT NOT NULL CHECK (date_type IN ('single', 'range', 'semester')),
  date DATE,
  start_date DATE,
  end_date DATE,
  semester TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id UUID NOT NULL REFERENCES public.asks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pianist_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asks_user_id ON public.asks(user_id);
CREATE INDEX IF NOT EXISTS idx_asks_created_at ON public.asks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_ask_id ON public.bids(ask_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON public.bids(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.asks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asks table
-- Anyone can view all asks
CREATE POLICY "Asks are viewable by everyone"
  ON public.asks FOR SELECT
  USING (true);

-- Users can insert their own asks
CREATE POLICY "Users can insert their own asks"
  ON public.asks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own asks
CREATE POLICY "Users can update their own asks"
  ON public.asks FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own asks
CREATE POLICY "Users can delete their own asks"
  ON public.asks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for bids table
-- Anyone can view all bids
CREATE POLICY "Bids are viewable by everyone"
  ON public.bids FOR SELECT
  USING (true);

-- Users can insert their own bids
CREATE POLICY "Users can insert their own bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only ask owners can update bid status (accept/reject)
CREATE POLICY "Ask owners can update bid status"
  ON public.bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.asks
      WHERE asks.id = bids.ask_id
      AND asks.user_id = auth.uid()
    )
  );

-- Users can delete their own bids
CREATE POLICY "Users can delete their own bids"
  ON public.bids FOR DELETE
  USING (auth.uid() = user_id);
