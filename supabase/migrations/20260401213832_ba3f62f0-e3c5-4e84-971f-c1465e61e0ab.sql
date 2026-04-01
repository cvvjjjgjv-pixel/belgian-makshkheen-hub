
-- 1. Fix: Restrict notification INSERT - remove old policy and add one that only allows trigger-based inserts
-- Notifications are created by SECURITY DEFINER triggers (notify_on_like, notify_on_comment),
-- so we remove direct user INSERT capability entirely.
DROP POLICY IF EXISTS "Users can insert notifications with own from_user_id" ON public.notifications;

-- 2. Fix: post-media storage - add ownership check on INSERT
DROP POLICY IF EXISTS "Auth users can upload post media" ON storage.objects;
CREATE POLICY "Auth users can upload post media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Fix: chat-media storage - add ownership check on INSERT and add UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own chat media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Fix: stories storage - add ownership check on INSERT and add UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can upload story images" ON storage.objects;
CREATE POLICY "Authenticated users can upload story images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own story images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Fix: game_scores - remove direct INSERT/UPDATE, create a secure function instead
DROP POLICY IF EXISTS "Users can insert own scores" ON public.game_scores;
DROP POLICY IF EXISTS "Users can update own scores" ON public.game_scores;

-- Create a SECURITY DEFINER function that validates and saves game scores
CREATE OR REPLACE FUNCTION public.save_game_score(
  p_game_type text,
  p_points integer,
  p_won boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Clamp points to reasonable range
  IF p_points < 0 THEN p_points := 0; END IF;
  IF p_points > 100 THEN p_points := 100; END IF;

  -- Validate game_type
  IF p_game_type NOT IN ('quiz', 'guess', 'emoji', 'chkobba', 'rami') THEN
    RAISE EXCEPTION 'Invalid game type';
  END IF;

  SELECT * INTO v_existing FROM public.game_scores
    WHERE user_id = v_user_id AND game_type = p_game_type;

  IF FOUND THEN
    UPDATE public.game_scores SET
      wins = v_existing.wins + CASE WHEN p_won THEN 1 ELSE 0 END,
      losses = v_existing.losses + CASE WHEN p_won THEN 0 ELSE 1 END,
      total_points = v_existing.total_points + p_points,
      games_played = v_existing.games_played + 1,
      best_score = GREATEST(v_existing.best_score, p_points),
      updated_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.game_scores (user_id, game_type, wins, losses, total_points, games_played, best_score)
    VALUES (
      v_user_id, p_game_type,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 0 ELSE 1 END,
      p_points, 1, p_points
    );
  END IF;
END;
$$;
