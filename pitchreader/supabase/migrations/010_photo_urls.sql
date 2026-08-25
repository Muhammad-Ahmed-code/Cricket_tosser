-- Add photo_urls column to reports table (JSONB array of storage URLs or data URIs)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS photo_urls JSONB;

-- Create pitch-photos storage bucket (private, JPEG only, max 5 MB per file)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pitch-photos', 'pitch-photos', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read objects whose first path segment matches their user ID.
-- Service role (edge function) bypasses RLS entirely — no policy needed for writes.
-- Signed URLs also bypass RLS, so this policy is defence-in-depth for direct access.
CREATE POLICY "Users can read their own pitch photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pitch-photos'
  AND (storage.foldername(name))[1] = requesting_user_id()
);
