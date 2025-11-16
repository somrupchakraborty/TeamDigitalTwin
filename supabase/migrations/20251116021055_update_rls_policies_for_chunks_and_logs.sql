/*
  # Update RLS Policies for Public Access

  ## Overview
  Updates RLS policies for document_chunks and search_logs tables to allow public access
  without authentication, matching the public access pattern for documents table.

  ## Changes
  1. Drop existing authenticated-only policies
  2. Create new public access policies for all operations
  
  ## Tables Updated
  - document_chunks: Public can view and insert chunks
  - search_logs: Public can view and insert search logs
*/

-- Drop existing policies for document_chunks
DROP POLICY IF EXISTS "Anyone can view chunks" ON document_chunks;
DROP POLICY IF EXISTS "System can insert chunks" ON document_chunks;

-- Drop existing policies for search_logs
DROP POLICY IF EXISTS "Anyone can view search logs" ON search_logs;
DROP POLICY IF EXISTS "Authenticated users can log searches" ON search_logs;

-- Public policies for document_chunks
CREATE POLICY "Public can view chunks"
ON document_chunks
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert chunks"
ON document_chunks
FOR INSERT
TO public
WITH CHECK (true);

-- Public policies for search_logs
CREATE POLICY "Public can view search logs"
ON search_logs
FOR SELECT
TO public
USING (true);

CREATE POLICY "Public can insert search logs"
ON search_logs
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Public can update search logs"
ON search_logs
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);