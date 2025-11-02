-- Add RLS policies to storage.objects for the tracks bucket
-- This prevents unauthorized uploads while maintaining public read access

-- Policy: Allow public read access to tracks
CREATE POLICY "Public can view tracks"
ON storage.objects FOR SELECT
USING (bucket_id = 'tracks');

-- Policy: Only admins can upload tracks
CREATE POLICY "Admins can upload tracks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tracks' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can update tracks
CREATE POLICY "Admins can update tracks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tracks' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can delete tracks
CREATE POLICY "Admins can delete tracks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tracks' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);