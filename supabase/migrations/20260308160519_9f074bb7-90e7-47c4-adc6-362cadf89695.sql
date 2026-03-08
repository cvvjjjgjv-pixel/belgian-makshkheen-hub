
-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  media_url text,
  media_type text, -- 'image', 'video', 'gif'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat messages viewable by authenticated" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any message" ON public.chat_messages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);

-- Storage policies for chat media
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);
