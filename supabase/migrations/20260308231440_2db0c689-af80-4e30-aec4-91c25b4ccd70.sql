
-- Table for live stream sessions
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  viewers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lives viewable by everyone" ON public.live_streams
  FOR SELECT USING (true);

CREATE POLICY "Users can create live" ON public.live_streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own live" ON public.live_streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own live" ON public.live_streams
  FOR DELETE USING (auth.uid() = user_id);

-- Table for live chat messages
CREATE TABLE public.live_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live chat viewable by everyone" ON public.live_chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can send live chat" ON public.live_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own live chat" ON public.live_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
