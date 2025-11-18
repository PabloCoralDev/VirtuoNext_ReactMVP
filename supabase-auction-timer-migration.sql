-- Migration for Auction Timer Feature
-- Run this in your Supabase SQL Editor
-- This adds auction end times, phone numbers for contact info, and winner tracking

-- Add auction timer fields to asks table
ALTER TABLE public.asks
  ADD COLUMN IF NOT EXISTS auction_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auction_status TEXT DEFAULT 'active' CHECK (auction_status IN ('active', 'completed', 'expired'));

-- Add phone number to profiles table for contact info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add winner tracking to bids table
ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS bid_time TIMESTAMPTZ DEFAULT NOW();

-- Create index for auction end time queries
CREATE INDEX IF NOT EXISTS idx_asks_auction_end_time ON public.asks(auction_end_time);
CREATE INDEX IF NOT EXISTS idx_asks_auction_status ON public.asks(auction_status);
CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON public.bids(bid_time DESC);

-- Create a table to store contact reveals (when soloist accepts a bid)
CREATE TABLE IF NOT EXISTS public.contact_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ask_id UUID NOT NULL REFERENCES public.asks(id) ON DELETE CASCADE,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  soloist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pianist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pianist_email TEXT NOT NULL,
  pianist_phone TEXT,
  pianist_name TEXT NOT NULL,
  revealed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ask_id, bid_id)
);

-- Create indexes for contact reveals
CREATE INDEX IF NOT EXISTS idx_contact_reveals_soloist_id ON public.contact_reveals(soloist_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_ask_id ON public.contact_reveals(ask_id);

-- Enable RLS for contact reveals
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;

-- Only the soloist who owns the ask can view their contact reveals
CREATE POLICY "Soloists can view their own contact reveals"
  ON public.contact_reveals FOR SELECT
  USING (auth.uid() = soloist_id);

-- Only ask owners can create contact reveals (when accepting a bid)
CREATE POLICY "Ask owners can create contact reveals"
  ON public.contact_reveals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asks
      WHERE asks.id = contact_reveals.ask_id
      AND asks.user_id = auth.uid()
    )
  );

-- Function to automatically create contact reveal when a bid is accepted
CREATE OR REPLACE FUNCTION handle_bid_acceptance()
RETURNS TRIGGER AS $$
DECLARE
  v_ask_id UUID;
  v_soloist_id UUID;
  v_pianist_email TEXT;
  v_pianist_phone TEXT;
  v_pianist_name TEXT;
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get ask details
    SELECT user_id, id INTO v_soloist_id, v_ask_id
    FROM public.asks
    WHERE id = NEW.ask_id;

    -- Get pianist contact info from profiles
    SELECT email, phone_number, name INTO v_pianist_email, v_pianist_phone, v_pianist_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Create contact reveal record
    INSERT INTO public.contact_reveals (
      ask_id,
      bid_id,
      soloist_id,
      pianist_id,
      pianist_email,
      pianist_phone,
      pianist_name
    ) VALUES (
      v_ask_id,
      NEW.id,
      v_soloist_id,
      NEW.user_id,
      v_pianist_email,
      v_pianist_phone,
      v_pianist_name
    )
    ON CONFLICT (ask_id, bid_id) DO NOTHING;

    -- Update ask status to completed
    UPDATE public.asks
    SET auction_status = 'completed'
    WHERE id = NEW.ask_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create contact reveal on bid acceptance
DROP TRIGGER IF EXISTS on_bid_accepted ON public.bids;
CREATE TRIGGER on_bid_accepted
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_acceptance();

-- Function to check and expire auctions that have passed their end time
CREATE OR REPLACE FUNCTION expire_old_auctions()
RETURNS void AS $$
BEGIN
  UPDATE public.asks
  SET auction_status = 'expired'
  WHERE auction_end_time < NOW()
    AND auction_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: You can set up a cron job or periodic function to call expire_old_auctions()
-- Or check client-side when loading asks
