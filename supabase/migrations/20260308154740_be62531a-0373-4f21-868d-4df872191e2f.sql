
-- Forum topics table
CREATE TABLE public.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  replies_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Forum replies table
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  content text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Topics RLS
CREATE POLICY "Topics viewable by everyone" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "Auth users can create topics" ON public.forum_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.forum_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.forum_topics FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any topic" ON public.forum_topics FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Replies RLS
CREATE POLICY "Replies viewable by everyone" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Auth users can create replies" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any reply" ON public.forum_replies FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to increment replies count
CREATE OR REPLACE FUNCTION public.increment_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.forum_topics SET replies_count = replies_count + 1, updated_at = now() WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.forum_topics SET replies_count = GREATEST(replies_count - 1, 0), updated_at = now() WHERE id = OLD.topic_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_reply_insert AFTER INSERT ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION increment_replies_count();
CREATE TRIGGER on_reply_delete AFTER DELETE ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION decrement_replies_count();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
