-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.asks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  soloist_name text NOT NULL,
  instrument text NOT NULL,
  pieces ARRAY DEFAULT '{}'::text[],
  duration text,
  cost_type text NOT NULL CHECK (cost_type = ANY (ARRAY['hourly'::text, 'per-piece'::text])),
  cost numeric NOT NULL,
  location text NOT NULL,
  date_type text NOT NULL CHECK (date_type = ANY (ARRAY['single'::text, 'range'::text, 'semester'::text])),
  date date,
  start_date date,
  end_date date,
  semester text,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  auction_end_time timestamp with time zone,
  auction_status text DEFAULT 'active'::text CHECK (auction_status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text])),
  archived_at timestamp with time zone,
  CONSTRAINT asks_pkey PRIMARY KEY (id),
  CONSTRAINT asks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.bids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ask_id uuid NOT NULL,
  user_id uuid NOT NULL,
  pianist_name text NOT NULL,
  amount numeric NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  bid_time timestamp with time zone DEFAULT now(),
  CONSTRAINT bids_pkey PRIMARY KEY (id),
  CONSTRAINT bids_ask_id_fkey FOREIGN KEY (ask_id) REFERENCES public.asks(id),
  CONSTRAINT bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.contact_reveals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ask_id uuid NOT NULL,
  bid_id uuid NOT NULL,
  soloist_id uuid NOT NULL,
  pianist_id uuid NOT NULL,
  pianist_email text NOT NULL,
  pianist_phone text,
  pianist_name text NOT NULL,
  revealed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_reveals_pkey PRIMARY KEY (id),
  CONSTRAINT contact_reveals_ask_id_fkey FOREIGN KEY (ask_id) REFERENCES public.asks(id),
  CONSTRAINT contact_reveals_bid_id_fkey FOREIGN KEY (bid_id) REFERENCES public.bids(id),
  CONSTRAINT contact_reveals_soloist_id_fkey FOREIGN KEY (soloist_id) REFERENCES auth.users(id),
  CONSTRAINT contact_reveals_pianist_id_fkey FOREIGN KEY (pianist_id) REFERENCES auth.users(id)
);
CREATE TABLE public.kv_store_83b23a98 (
  key text NOT NULL,
  value jsonb NOT NULL,
  CONSTRAINT kv_store_83b23a98_pkey PRIMARY KEY (key)
);
CREATE TABLE public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  viewer_id uuid,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_views_pkey PRIMARY KEY (id),
  CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  name text NOT NULL,
  user_type text NOT NULL CHECK (user_type = ANY (ARRAY['soloist'::text, 'pianist'::text])),
  bio text,
  picture_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phone_number text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);