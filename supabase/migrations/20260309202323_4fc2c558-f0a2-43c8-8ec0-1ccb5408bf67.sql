
-- Game rooms for card games (chkobba, rami)
CREATE TABLE public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL CHECK (game_type IN ('chkobba', 'rami')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_by uuid NOT NULL,
  game_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_players integer NOT NULL DEFAULT 2,
  current_turn uuid,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Players in a game room
CREATE TABLE public.game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  captured jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_rooms
CREATE POLICY "Game rooms viewable by everyone" ON public.game_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create rooms" ON public.game_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Players can update room" ON public.game_rooms FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.game_players WHERE room_id = game_rooms.id AND user_id = auth.uid())
);
CREATE POLICY "Creator can delete room" ON public.game_rooms FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS policies for game_players
CREATE POLICY "Game players viewable by room members" ON public.game_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms" ON public.game_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update own data" ON public.game_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players can leave" ON public.game_players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_players;
