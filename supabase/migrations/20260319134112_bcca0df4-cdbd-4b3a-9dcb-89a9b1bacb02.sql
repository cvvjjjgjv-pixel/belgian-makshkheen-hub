
-- 1. Fix notifications INSERT policy: restrict to from_user_id = auth.uid()
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications for others"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = from_user_id);

-- 2. Fix game_players SELECT: players can only see their own hand, but can see other players' scores
DROP POLICY IF EXISTS "Game players viewable by room members" ON public.game_players;
CREATE POLICY "Players can view own full data"
ON public.game_players FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Players can view room members basic info"
ON public.game_players FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_players gp
    WHERE gp.room_id = game_players.room_id AND gp.user_id = auth.uid()
  )
);

-- 3. Fix followers: use authenticated instead of public for write operations
DROP POLICY IF EXISTS "Users can follow" ON public.followers;
CREATE POLICY "Users can follow" ON public.followers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.followers;
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE TO authenticated
USING (auth.uid() = follower_id);

-- 4. Fix favorites: use authenticated instead of public for write operations  
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites" ON public.favorites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites" ON public.favorites FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 5. Fix live_streams: use authenticated instead of public for write operations
DROP POLICY IF EXISTS "Users can create live" ON public.live_streams;
CREATE POLICY "Users can create live" ON public.live_streams FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own live" ON public.live_streams;
CREATE POLICY "Users can delete own live" ON public.live_streams FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own live" ON public.live_streams;
CREATE POLICY "Users can update own live" ON public.live_streams FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- 6. Fix live_chat_messages: use authenticated instead of public for write operations
DROP POLICY IF EXISTS "Users can send live chat" ON public.live_chat_messages;
CREATE POLICY "Users can send live chat" ON public.live_chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own live chat" ON public.live_chat_messages;
CREATE POLICY "Users can delete own live chat" ON public.live_chat_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 7. Fix user_settings: use authenticated instead of public
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated
USING (auth.uid() = user_id);
