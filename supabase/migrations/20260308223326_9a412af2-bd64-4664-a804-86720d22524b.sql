
CREATE TABLE public.tv_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📺',
  youtube_url text,
  is_live boolean NOT NULL DEFAULT false,
  schedule_time text,
  schedule_title text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tv_channels ENABLE ROW LEVEL SECURITY;

-- Everyone can view channels
CREATE POLICY "Channels viewable by everyone"
  ON public.tv_channels FOR SELECT
  USING (true);

-- Only admins can manage channels
CREATE POLICY "Admins can manage channels"
  ON public.tv_channels FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_channels;
