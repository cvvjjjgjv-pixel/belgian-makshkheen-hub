
-- Fix 1: Remove permissive INSERT policy on notifications and replace with restricted one
-- The triggers (notify_on_like, notify_on_comment) use SECURITY DEFINER so they bypass RLS.
-- We only need to allow from_user_id = auth.uid() for direct user inserts.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications for others" ON public.notifications;

CREATE POLICY "Users can insert notifications with own from_user_id"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

-- Fix 2: Restrict game_players SELECT to only own rows (use get_room_players RPC for other players)
DROP POLICY IF EXISTS "Game players viewable by room members" ON public.game_players;
DROP POLICY IF EXISTS "Players can view game data" ON public.game_players;

CREATE POLICY "Players can view own game data"
ON public.game_players
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
