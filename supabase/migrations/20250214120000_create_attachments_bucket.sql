-- Create storage bucket for chat/file attachments
-- Public bucket allows direct URL access for downloads

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to attachments bucket
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

-- Allow anyone to download from attachments bucket (public bucket)
CREATE POLICY "Anyone can download attachments"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'attachments');
