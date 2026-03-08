
-- Trigger to increment likes_count when a like is added
CREATE OR REPLACE FUNCTION public.increment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_added
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_likes_count();

-- Trigger to decrement likes_count when a like is removed
CREATE OR REPLACE FUNCTION public.decrement_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_like_removed
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_likes_count();

-- Trigger to increment comments_count when a comment is added
CREATE OR REPLACE FUNCTION public.increment_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_added
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_comments_count();

-- Trigger to decrement comments_count when a comment is removed
CREATE OR REPLACE FUNCTION public.decrement_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_comment_removed
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_comments_count();

-- Sync existing counts
UPDATE public.posts p SET 
  likes_count = (SELECT COUNT(*) FROM public.post_likes WHERE post_id = p.id),
  comments_count = (SELECT COUNT(*) FROM public.comments WHERE post_id = p.id);
