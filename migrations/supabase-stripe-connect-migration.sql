-- Stripe Connect Migration - Phase 1 & 2
-- Adds Stripe account fields to profiles table for pianist onboarding

-- Add Stripe Connect fields to existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_updated_at TIMESTAMPTZ;

-- Add unique constraint on stripe_account_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_stripe_account_id_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_stripe_account_id_key UNIQUE (stripe_account_id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_account_id
  ON public.profiles(stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- Add documentation comments
COMMENT ON COLUMN public.profiles.stripe_account_id IS 'Stripe Connect Account ID for pianists to receive payments';
COMMENT ON COLUMN public.profiles.stripe_onboarding_complete IS 'Whether the pianist has completed Stripe onboarding';
COMMENT ON COLUMN public.profiles.stripe_charges_enabled IS 'Whether the Stripe account can accept charges';
COMMENT ON COLUMN public.profiles.stripe_payouts_enabled IS 'Whether the Stripe account can receive payouts';
COMMENT ON COLUMN public.profiles.stripe_details_submitted IS 'Whether the pianist submitted all required information to Stripe';
