-- Migration: Add 'total' cost type to asks table
-- This allows soloists to specify a total flat fee for the entire job

-- Update the cost_type check constraint to include 'total'
ALTER TABLE public.asks
DROP CONSTRAINT IF EXISTS asks_cost_type_check;

ALTER TABLE public.asks
ADD CONSTRAINT asks_cost_type_check
CHECK (cost_type = ANY (ARRAY['hourly'::text, 'per-piece'::text, 'total'::text]));

-- Update the schema documentation
COMMENT ON COLUMN public.asks.cost_type IS 'Type of payment: hourly (per hour), per-piece (per piece), or total (flat fee for entire job)';
