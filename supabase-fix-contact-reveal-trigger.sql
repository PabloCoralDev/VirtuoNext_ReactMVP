-- Fix the bid acceptance trigger to properly get pianist contact info
-- Run this in your Supabase SQL Editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_bid_accepted ON public.bids;
DROP FUNCTION IF EXISTS handle_bid_acceptance();

-- Recreate the function with better data fetching
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

    -- Get pianist email from auth.users (always has email)
    SELECT email INTO v_pianist_email
    FROM auth.users
    WHERE id = NEW.user_id;

    -- Get pianist phone and name from profiles (may not exist)
    SELECT phone_number, name INTO v_pianist_phone, v_pianist_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- If name is null, use pianist_name from the bid
    IF v_pianist_name IS NULL THEN
      v_pianist_name := NEW.pianist_name;
    END IF;

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

-- Recreate the trigger
CREATE TRIGGER on_bid_accepted
  AFTER UPDATE ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION handle_bid_acceptance();
