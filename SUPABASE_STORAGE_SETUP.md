# Supabase Storage Setup for Product Images

## Overview
Product variant images are now uploaded directly to Supabase Storage instead of being stored as local paths.

## Setup Steps

### 1. Create Storage Bucket in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Buckets**
3. Create a new bucket with these settings:
   - **Name**: `product-images`
   - **Public bucket**: Yes (so images can be accessed publicly)
   - **File size limit**: 5 MB

### 2. Disable Row Level Security (RLS)

To allow unrestricted public uploads:

1. Go to **Authentication** → **Policies** in your Supabase dashboard
2. Find the **storage.objects** table
3. **Disable RLS** on the `storage.objects` table (this removes all RLS restrictions)

Alternatively, if you want to keep RLS enabled but allow public access:

```sql
-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

-- Allow public upload
CREATE POLICY "Allow public upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Allow public delete
CREATE POLICY "Allow public delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'product-images');
```

**Note:** Disabling RLS entirely is simpler but less secure. Use public policies if you want some protection.

### 3. Verify Setup

To test the setup:
1. Navigate to Web Manager in your application
2. Go to the Variants tab
3. Click "Edit" on a variant
4. Try uploading an image
5. You should see the image preview appear and the file upload to Supabase Storage

## Image URL Format

After upload, images are stored with this structure:
```
product-images/variants/{slug}-{timestamp}.{extension}
```

Example:
```
https://[project-id].supabase.co/storage/v1/object/public/product-images/variants/medical-grade-gloves-1704067200000.jpg
```

## Troubleshooting

### "Failed to upload image" error
- Check that the `product-images` bucket exists
- Verify RLS policies are correctly set
- Ensure the bucket is set as public

### Images not visible
- Check browser console for CORS errors
- Verify the bucket is public
- Confirm the file was actually uploaded to Supabase Storage

### Upload hangs or times out
- Check network tab in browser DevTools
- Verify Supabase project is accessible
- Ensure file size is under 5MB limit

## Code Integration

The upload functionality is implemented in:
- `src/utils/imageUploadService.ts` - Upload and delete utilities
- `src/components/web-manager/ImageUploadField.tsx` - UI component

Images are stored at: `variants/{variant-slug}-{timestamp}.{ext}`
