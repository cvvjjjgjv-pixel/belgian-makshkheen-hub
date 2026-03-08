
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Views viewable by story owner" ON public.story_views FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can record view" ON public.story_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
