/*
  # Add Vector Similarity Search Function

  ## Overview
  Creates a PostgreSQL function to perform semantic search using vector similarity
  on document chunks. This enables RAG (Retrieval Augmented Generation) capabilities.

  ## Function Created
  match_document_chunks - Performs cosine similarity search on embeddings

  ## Parameters
  - query_embedding: vector(384) - The embedding vector to search for
  - match_threshold: float - Minimum similarity score (0-1)
  - match_count: int - Maximum number of results to return

  ## Returns
  Table with id, document_id, content, chunk_index, similarity
*/

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.chunk_index,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;