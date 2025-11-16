/*
  # Add Storage Policies for Documents Bucket

  ## Overview
  Creates Row Level Security policies for the storage.objects table to allow
  public access to the documents bucket. Since this is a collaborative platform,
  all users (even anonymous) can upload and access documents.

  ## Security Model
  - Public bucket: Anyone can upload documents
  - Public bucket: Anyone can read documents
  - This enables seamless collaboration without authentication barriers

  ## Policies Created
  1. Allow anyone to upload to documents bucket
  2. Allow anyone to read from documents bucket
  3. Allow anyone to update documents in bucket
  4. Allow anyone to delete documents from bucket
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete documents" ON storage.objects;

-- Policy: Allow public uploads to documents bucket
CREATE POLICY "Public can upload documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow public reads from documents bucket
CREATE POLICY "Public can read documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Policy: Allow public updates to documents bucket
CREATE POLICY "Public can update documents"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Policy: Allow public deletes from documents bucket
CREATE POLICY "Public can delete documents"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'documents');