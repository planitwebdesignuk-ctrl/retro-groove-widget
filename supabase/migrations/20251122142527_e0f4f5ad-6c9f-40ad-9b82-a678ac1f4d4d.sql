-- Create label_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.label_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text NOT NULL,
  is_active boolean DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on label_images
ALTER TABLE public.label_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view label images" ON public.label_images;
  DROP POLICY IF EXISTS "Admins can insert label images" ON public.label_images;
  DROP POLICY IF EXISTS "Admins can update label images" ON public.label_images;
  DROP POLICY IF EXISTS "Admins can delete label images" ON public.label_images;
END $$;

-- Create RLS Policies for label_images
CREATE POLICY "Anyone can view label images"
  ON public.label_images
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert label images"
  ON public.label_images
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update label images"
  ON public.label_images
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete label images"
  ON public.label_images
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to ensure only one active label
CREATE OR REPLACE FUNCTION public.ensure_single_active_label()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.label_images 
    SET is_active = false 
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for single active label
DROP TRIGGER IF EXISTS ensure_single_active_label_trigger ON public.label_images;
CREATE TRIGGER ensure_single_active_label_trigger
  BEFORE UPDATE ON public.label_images
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_label();

-- Create label-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view label images in storage" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload label images" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can update label images in storage" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete label images from storage" ON storage.objects;
END $$;

-- Create Storage RLS policies for label-images bucket
CREATE POLICY "Anyone can view label images in storage"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'label-images');

CREATE POLICY "Admins can upload label images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'label-images' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update label images in storage"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'label-images' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete label images from storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'label-images' 
    AND public.has_role(auth.uid(), 'admin')
  );