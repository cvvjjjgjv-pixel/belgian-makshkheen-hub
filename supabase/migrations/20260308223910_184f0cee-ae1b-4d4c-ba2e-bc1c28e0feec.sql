
-- Drop restrictive policies and recreate as permissive for forum_topics
DROP POLICY IF EXISTS "Auth users can create topics" ON public.forum_topics;
DROP POLICY IF EXISTS "Topics viewable by everyone" ON public.forum_topics;
DROP POLICY IF EXISTS "Users can delete own topics" ON public.forum_topics;
DROP POLICY IF EXISTS "Admins can delete any topic" ON public.forum_topics;
DROP POLICY IF EXISTS "Users can update own topics" ON public.forum_topics;

CREATE POLICY "Topics viewable by everyone" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "Auth users can create topics" ON public.forum_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.forum_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.forum_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any topic" ON public.forum_topics FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Same fix for forum_replies
DROP POLICY IF EXISTS "Replies viewable by everyone" ON public.forum_replies;
DROP POLICY IF EXISTS "Auth users can create replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON public.forum_replies;
DROP POLICY IF EXISTS "Admins can delete any reply" ON public.forum_replies;

CREATE POLICY "Replies viewable by everyone" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Auth users can create replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any reply" ON public.forum_replies FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
