
-- Drop the problematic policy that exposes hands
DROP POLICY IF EXISTS "Players can view room members basic info" ON public.game_players;
DROP POLICY IF EXISTS "Players can view own full data" ON public.game_players;

-- Create a function that returns game_players with hand hidden for opponents
CREATE OR REPLACE FUNCTION public.get_room_players(p_room_id uuid)
RETURNS TABLE(id uuid, room_id uuid, user_id uuid, hand jsonb, captured jsonb, score integer, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gp.id, gp.room_id, gp.user_id,
    CASE WHEN gp.user_id = auth.uid() THEN gp.hand ELSE '[]'::jsonb END AS hand,
    gp.captured, gp.score, gp.joined_at
  FROM public.game_players gp
  WHERE gp.room_id = p_room_id
    AND EXISTS (
      SELECT 1 FROM public.game_players gp2
      WHERE gp2.room_id = p_room_id AND gp2.user_id = auth.uid()
    )
$$;

-- Simple policy: users can only see their own data via direct query
CREATE POLICY "Players can view game data"
ON public.game_players FOR SELECT TO authenticated
USING (auth.uid() = user_id);
