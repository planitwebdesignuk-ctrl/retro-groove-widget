-- Create label_images table
CREATE TABLE public.label_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES auth.users(id),
  file_size INTEGER
);

-- Enable RLS
ALTER TABLE public.label_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view label images"
  ON public.label_images FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert label images"
  ON public.label_images FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update label images"
  ON public.label_images FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete label images"
  ON public.label_images FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to ensure only one active label at a time
CREATE OR REPLACE FUNCTION public.ensure_single_active_label()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.label_images 
    SET is_active = false 
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to enforce single active label
CREATE TRIGGER enforce_single_active_label
  BEFORE INSERT OR UPDATE ON public.label_images
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_label();

-- Create storage bucket for label images
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true);

-- Storage policies for label images
CREATE POLICY "Anyone can view label images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'label-images');

CREATE POLICY "Admins can upload label images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'label-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete label images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'label-images' AND has_role(auth.uid(), 'admin'::app_role));