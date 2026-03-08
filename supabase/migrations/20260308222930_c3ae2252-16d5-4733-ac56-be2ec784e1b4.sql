
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
CREATE POLICY "Stories are viewable by everyone"
  ON public.stories
  FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

-- Also fix the other policies to be permissive
DROP POLICY IF EXISTS "Users can create stories" ON public.stories;
CREATE POLICY "Users can create stories"
  ON public.stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
  ON public.stories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
CREATE POLICY "Admins can delete any story"
  ON public.stories
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
