
DROP POLICY IF EXISTS "Reactions viewable by everyone" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can react" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can remove own reaction" ON public.story_reactions;
DROP POLICY IF EXISTS "Users can update own reaction" ON public.story_reactions;

CREATE POLICY "Reactions viewable by everyone" ON public.story_reactions FOR SELECT USING (true);
CREATE POLICY "Users can react" ON public.story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reaction" ON public.story_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own reaction" ON public.story_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
