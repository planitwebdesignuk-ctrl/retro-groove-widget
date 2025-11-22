-- Comprehensive fix for storage buckets and policies
-- This migration is idempotent and safe to run multiple times

-- 1. Ensure tracks bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure label-images bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Clean up ALL existing storage policies to eliminate duplicates
DO $$ 
BEGIN
  -- Drop all tracks bucket policies (from multiple migrations)
  DROP POLICY IF EXISTS "Anyone can view track files" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view tracks" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view tracks" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload track files" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload tracks" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update track files" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update tracks" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete track files" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete tracks" ON storage.objects;
  
  -- Drop all label-images bucket policies
  DROP POLICY IF EXISTS "Anyone can view label images in storage" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view label images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload label images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload label images in storage" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update label images in storage" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update label images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete label images from storage" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete label images" ON storage.objects;
END $$;

-- 4. Create unified storage policies for tracks bucket
CREATE POLICY "Anyone can view tracks"
ON storage.objects FOR SELECT
USING (bucket_id = 'tracks');

CREATE POLICY "Admins can upload tracks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update tracks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete tracks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Create unified storage policies for label-images bucket
CREATE POLICY "Anyone can view label images"
ON storage.objects FOR SELECT
USING (bucket_id = 'label-images');

CREATE POLICY "Admins can upload label images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update label images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete label images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. MANDATORY FIX: Prevent data deletion on remixed projects
-- Only delete data if this is the original project (no admin users exist yet)
DO $$
BEGIN
  -- Only run deletions if no admin user exists (original project setup)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role
  ) THEN
    DELETE FROM public.label_images;
    DELETE FROM auth.users WHERE email = 'pete@plan-it-web.co.uk';
  END IF;
END $$;