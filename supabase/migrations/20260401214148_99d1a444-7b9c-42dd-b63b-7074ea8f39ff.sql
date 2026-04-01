
-- 1. Fix game_rooms SELECT: only players in the room can view
DROP POLICY IF EXISTS "Game rooms viewable by everyone" ON public.game_rooms;

-- Allow players in the room to view it
CREATE POLICY "Players can view their game rooms" ON public.game_rooms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.game_players gp
    WHERE gp.room_id = game_rooms.id AND gp.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);

-- Also allow viewing waiting rooms (for lobby listing) but without sensitive data concern
-- since game_state is empty for waiting rooms
CREATE POLICY "Anyone can view waiting rooms" ON public.game_rooms
FOR SELECT TO authenticated
USING (status = 'waiting');

-- 2. Add UPDATE policy for post-media storage
CREATE POLICY "Users can update own post media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
