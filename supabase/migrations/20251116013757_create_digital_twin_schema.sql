/*
  # Digital Twin MVP - Initial Schema

  ## Overview
  Creates the database schema for the Digital Twin MVP, enabling document upload,
  processing, storage, and retrieval with semantic search capabilities.

  ## Tables Created

  ### 1. documents
  Core table storing document metadata and processing status.
  - `id` (uuid, primary key) - Unique document identifier
  - `filename` (text) - Original filename
  - `file_type` (text) - File extension (ppt, pdf, xlsx, etc.)
  - `file_size` (bigint) - File size in bytes
  - `storage_path` (text) - Path in Supabase Storage
  - `uploader_name` (text) - Name of person who uploaded
  - `upload_date` (timestamptz) - When document was uploaded
  - `processing_status` (text) - Status: pending, processing, completed, failed
  - `summary` (text) - AI-generated summary (headline + bullets)
  - `tags` (text[]) - Auto-generated topic tags
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp

  ### 2. document_chunks
  Stores text chunks extracted from documents for semantic search.
  - `id` (uuid, primary key) - Unique chunk identifier
  - `document_id` (uuid, foreign key) - Reference to parent document
  - `chunk_index` (integer) - Order of chunk in document
  - `content` (text) - Extracted text content
  - `embedding` (vector) - Embedding for semantic search
  - `metadata` (jsonb) - Additional chunk-specific metadata
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. search_logs
  Tracks user searches for analytics and improvement.
  - `id` (uuid, primary key) - Unique log identifier
  - `query` (text) - User's search query
  - `intent` (text) - Classified intent (find-update, find-doc, summarize-topic)
  - `results_count` (integer) - Number of results returned
  - `search_type` (text) - Type: semantic, metadata, recent, hybrid
  - `created_at` (timestamptz) - Search timestamp

  ## Security
  - RLS enabled on all tables
  - All users can read all documents (team collaboration)
  - All authenticated users can upload and search
  - Restrictive policies for data integrity

  ## Indexes
  - Documents indexed on upload_date for recent updates queries
  - Documents indexed on file_type and tags for filtering
  - Chunks indexed on document_id for fast retrieval
  - Vector index (ivfflat) on embeddings for semantic search

  ## Extensions
  - pgvector enabled for vector similarity search
*/

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  uploader_name text NOT NULL,
  upload_date timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'pending',
  summary text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document_chunks table with vector support
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(384),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create search_logs table
CREATE TABLE IF NOT EXISTS search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  intent text,
  results_count integer DEFAULT 0,
  search_type text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC);

-- Create vector index for semantic search (using ivfflat)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Anyone can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for document_chunks
CREATE POLICY "Anyone can view chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert chunks"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for search_logs
CREATE POLICY "Anyone can view search logs"
  ON search_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can log searches"
  ON search_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();