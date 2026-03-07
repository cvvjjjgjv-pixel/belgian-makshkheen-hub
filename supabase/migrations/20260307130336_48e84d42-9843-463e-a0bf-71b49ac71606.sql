
-- Fix storage upload policy only
DROP POLICY IF EXISTS "Authenticated users can upload story images" ON storage.objects;
CREATE POLICY "Authenticated users can upload story images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
