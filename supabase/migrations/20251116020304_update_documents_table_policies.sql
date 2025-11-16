/*
  # Update Documents Table Policies for Public Access

  ## Overview
  Updates the documents table policies to allow public access without authentication.
  This enables anonymous users to upload and interact with documents.

  ## Changes
  1. Drop existing authenticated-only policies
  2. Create new public access policies for all operations
  
  ## Security Model
  - Public access: Anyone can insert, select, update, and delete documents
  - Suitable for collaborative environments without user authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON documents;

-- Policy: Allow anyone to insert documents
CREATE POLICY "Public can insert documents"
ON documents
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Allow anyone to view documents
CREATE POLICY "Public can view documents"
ON documents
FOR SELECT
TO public
USING (true);

-- Policy: Allow anyone to update documents
CREATE POLICY "Public can update documents"
ON documents
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Policy: Allow anyone to delete documents
CREATE POLICY "Public can delete documents"
ON documents
FOR DELETE
TO public
USING (true);