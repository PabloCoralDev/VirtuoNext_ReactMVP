-- Create relationships table
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id TEXT UNIQUE NOT NULL,
  pianist_user_id UUID REFERENCES auth.users(id) NOT NULL,
  soloist_user_id UUID REFERENCES auth.users(id) NOT NULL,
  pianist_name TEXT NOT NULL,
  soloist_name TEXT NOT NULL,
  ask_id UUID REFERENCES public.asks(id),
  accepted_bid_id UUID REFERENCES public.bids(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  dates JSONB DEFAULT '[]'::jsonb,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  payment_amount NUMERIC(10, 2),
  payment_details JSONB,
  last_message_at TIMESTAMPTZ,
  unread_count_pianist INTEGER DEFAULT 0,
  unread_count_soloist INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID REFERENCES public.relationships(id) ON DELETE CASCADE NOT NULL,
  sender_user_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_relationship_created ON public.messages(relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_pianist ON public.relationships(pianist_user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_soloist ON public.relationships(soloist_user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_status ON public.relationships(status);
CREATE INDEX IF NOT EXISTS idx_relationships_last_message ON public.relationships(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationships
-- Users can view relationships they're part of
CREATE POLICY "Users can view their own relationships"
  ON public.relationships
  FOR SELECT
  USING (
    auth.uid() = pianist_user_id
    OR auth.uid() = soloist_user_id
  );

-- Users can create relationships (via bid acceptance)
CREATE POLICY "Users can create relationships"
  ON public.relationships
  FOR INSERT
  WITH CHECK (
    auth.uid() = pianist_user_id
    OR auth.uid() = soloist_user_id
  );

-- Users can update their own relationships
CREATE POLICY "Users can update their relationships"
  ON public.relationships
  FOR UPDATE
  USING (
    auth.uid() = pianist_user_id
    OR auth.uid() = soloist_user_id
  )
  WITH CHECK (
    auth.uid() = pianist_user_id
    OR auth.uid() = soloist_user_id
  );

-- RLS Policies for messages
-- Users can view messages in their relationships
CREATE POLICY "Users can view messages in their relationships"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = messages.relationship_id
      AND (relationships.pianist_user_id = auth.uid() OR relationships.soloist_user_id = auth.uid())
    )
  );

-- Users can create messages in their relationships
CREATE POLICY "Users can create messages in their relationships"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = messages.relationship_id
      AND (relationships.pianist_user_id = auth.uid() OR relationships.soloist_user_id = auth.uid())
    )
  );

-- Users can update messages they sent (for read receipts, etc.)
CREATE POLICY "Users can update messages in their relationships"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = messages.relationship_id
      AND (relationships.pianist_user_id = auth.uid() OR relationships.soloist_user_id = auth.uid())
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_relationship_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.relationships
  SET last_message_at = NEW.created_at
  WHERE id = NEW.relationship_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_message_at
CREATE TRIGGER update_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_last_message();

-- Grant permissions
GRANT ALL ON public.relationships TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
