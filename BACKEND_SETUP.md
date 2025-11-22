# Backend Setup Guide

## Storage Buckets Missing in Remixed Projects

If you've remixed this project and are experiencing "Bucket not found" errors when uploading tracks or label images, this is expected behavior. Here's why and how to fix it.

## Why This Happens

When you remix a Lovable project, the Supabase backend uses `pg_dump` to copy the database schema, tables, and data. However, **storage bucket configurations are NOT included in pg_dump exports**. This means:

✅ Database tables are copied  
✅ RLS policies are copied  
✅ Functions and triggers are copied  
❌ Storage buckets are NOT copied  
❌ Storage bucket RLS policies are NOT copied  

## How to Fix It

The admin panel will automatically detect if storage buckets are missing and display a prominent warning banner with instructions. Here's what to do:

### Step 1: Copy the Migration SQL

The admin panel provides the complete SQL migration you need. Click the "Copy SQL" button in the warning banner, or copy the SQL below:

```sql
-- Creates missing storage buckets and their RLS policies
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
);
```

### Step 2: Access Your Backend

In your Lovable project:
1. Click the **Cloud** tab in the top navigation
2. Navigate to **Database** → **Migrations**

### Step 3: Create and Run the Migration

1. Click **"New Migration"** or similar button
2. Paste the SQL you copied
3. Give it a descriptive name like `create_storage_buckets`
4. Click **"Run Migration"** or **"Apply"**

### Step 4: Verify and Refresh

1. After the migration completes successfully, refresh your admin panel page
2. The warning banner should disappear
3. Try uploading a track or label image - it should now work!

## What Gets Created

This migration creates:

### Tracks Bucket
- **Purpose**: Stores MP3 audio files
- **Public**: Yes (files are publicly accessible)
- **RLS Policies**:
  - Anyone can view/download tracks
  - Only admins can upload, update, or delete tracks

### Label-Images Bucket
- **Purpose**: Stores vinyl label images (PNG, JPG, JPEG, WebP)
- **Public**: Yes (images are publicly accessible)
- **RLS Policies**:
  - Anyone can view label images
  - Only admins can upload, update, or delete label images

## Troubleshooting

### "Policy already exists" error
This is normal if you run the migration multiple times. The `IF NOT EXISTS` clauses prevent duplicate policies, but some database versions might still show warnings. As long as the migration completes, you're good.

### Still seeing "Bucket not found" after migration
1. Verify the migration ran successfully (check for errors)
2. Clear your browser cache
3. Hard refresh the admin page (Ctrl+Shift+R or Cmd+Shift+R)
4. Check the browser console for any other errors

### Uploads work but playback doesn't
Make sure the buckets are set to `public = true`. The migration above does this automatically.

## Prevention for Future Templates

If you're creating a new template project and want to ensure smooth remixes:

1. Always document storage bucket requirements
2. Consider adding a backend health check (this template already has one!)
3. Provide the migration SQL in an easy-to-find location
4. Test your template by remixing it yourself before sharing

## Technical Details

**Why can't this be automated?**

Lovable Cloud uses Supabase under the hood. When remixing, the system uses `pg_dump` which is a PostgreSQL utility that exports database content. Storage buckets in Supabase are managed separately from the main database tables, so they don't get exported in a standard `pg_dump`.

**Is this a bug?**

No, this is expected PostgreSQL and Supabase behavior. Storage buckets are infrastructure-level resources that need to be explicitly created, similar to how you'd need to set up S3 buckets in AWS.

## Need Help?

If you're still experiencing issues after following this guide:

1. Check the browser console for detailed error messages
2. Verify your admin role is properly set up
3. Ensure you're logged in as an admin user
4. Check the Lovable Discord for community support
