/*
  # Enable Realtime for Documents Table

  ## Overview
  Enables Realtime replication for the documents table so that the client
  can listen for INSERT events and trigger document processing automatically.

  ## Changes
  - Add documents table to supabase_realtime publication
  - This allows clients to subscribe to changes via Supabase Realtime
*/

-- Enable Realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;