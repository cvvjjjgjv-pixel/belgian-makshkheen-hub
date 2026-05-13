CREATE OR REPLACE FUNCTION public.enforce_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count >= 30 THEN
    RAISE EXCEPTION 'Limite d''inscription atteinte: maximum 30 utilisateurs autorisés.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_limit_trigger ON public.profiles;
CREATE TRIGGER enforce_user_limit_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_user_limit();