-- Add storage_path column to file_attachments table
-- This column stores the Supabase Storage object path for uploaded files

-- First add the column as nullable
ALTER TABLE file_attachments 
ADD COLUMN storage_path TEXT;

-- Update any existing rows with a placeholder path (for seeded data)
UPDATE file_attachments 
SET storage_path = 'legacy/' || id::text || '/' || name
WHERE storage_path IS NULL;

-- Now make the column NOT NULL
ALTER TABLE file_attachments 
ALTER COLUMN storage_path SET NOT NULL;

-- Add RLS policies for file_attachments
-- Allow authenticated users to view file attachments
CREATE POLICY "Users can view file attachments" ON file_attachments
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert file attachments
CREATE POLICY "Users can insert file attachments" ON file_attachments
  FOR INSERT TO authenticated WITH CHECK (true);
