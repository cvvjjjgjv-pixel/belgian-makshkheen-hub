
-- Create storage bucket for post media (images + videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Auth users can upload post media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow public read
CREATE POLICY "Public read post media"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own post media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
