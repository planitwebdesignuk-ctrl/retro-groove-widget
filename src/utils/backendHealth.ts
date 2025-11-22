import { supabase } from '@/integrations/supabase/client';

export interface BucketCheckResult {
  exists: boolean;
  error: string | null;
}

export interface StorageBucketsHealth {
  tracks: BucketCheckResult;
  labelImages: BucketCheckResult;
  allHealthy: boolean;
}

/**
 * Checks if the required storage buckets exist in the backend.
 * This is particularly useful for remixed projects where storage buckets
 * may not have been created during the remix process.
 */
export async function checkStorageBuckets(): Promise<StorageBucketsHealth> {
  const results: StorageBucketsHealth = {
    tracks: { exists: false, error: null },
    labelImages: { exists: false, error: null },
    allHealthy: false,
  };

  // Check tracks bucket
  try {
    const { data, error } = await supabase.storage
      .from('tracks')
      .list('', { limit: 1 });
    
    if (error) {
      results.tracks.error = error.message;
      results.tracks.exists = false;
    } else {
      results.tracks.exists = true;
    }
  } catch (error: any) {
    results.tracks.error = error.message || 'Unknown error';
    results.tracks.exists = false;
  }

  // Check label-images bucket
  try {
    const { data, error } = await supabase.storage
      .from('label-images')
      .list('', { limit: 1 });
    
    if (error) {
      results.labelImages.error = error.message;
      results.labelImages.exists = false;
    } else {
      results.labelImages.exists = true;
    }
  } catch (error: any) {
    results.labelImages.error = error.message || 'Unknown error';
    results.labelImages.exists = false;
  }

  results.allHealthy = results.tracks.exists && results.labelImages.exists;

  return results;
}

/**
 * SQL migration to create missing storage buckets.
 * This can be copy-pasted into a new migration in remixed projects.
 */
export const STORAGE_BUCKETS_MIGRATION = `-- Creates missing storage buckets and their RLS policies
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

-- 1. Create tracks bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create label-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('label-images', 'label-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies for tracks bucket
CREATE POLICY IF NOT EXISTS "Anyone can view tracks"
ON storage.objects FOR SELECT
USING (bucket_id = 'tracks');

CREATE POLICY IF NOT EXISTS "Admins can upload tracks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY IF NOT EXISTS "Admins can update tracks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY IF NOT EXISTS "Admins can delete tracks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tracks' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Storage RLS policies for label-images bucket
CREATE POLICY IF NOT EXISTS "Anyone can view label images"
ON storage.objects FOR SELECT
USING (bucket_id = 'label-images');

CREATE POLICY IF NOT EXISTS "Admins can upload label images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY IF NOT EXISTS "Admins can update label images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY IF NOT EXISTS "Admins can delete label images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'label-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);`;
