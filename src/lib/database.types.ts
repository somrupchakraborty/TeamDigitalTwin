export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          filename: string
          file_type: string
          file_size: number
          storage_path: string
          uploader_name: string
          upload_date: string
          processing_status: string
          summary: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filename: string
          file_type: string
          file_size: number
          storage_path: string
          uploader_name: string
          upload_date?: string
          processing_status?: string
          summary?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filename?: string
          file_type?: string
          file_size?: number
          storage_path?: string
          uploader_name?: string
          upload_date?: string
          processing_status?: string
          summary?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: number[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          content: string
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          embedding?: number[] | null
          metadata?: Json
          created_at?: string
        }
      }
      search_logs: {
        Row: {
          id: string
          query: string
          intent: string | null
          results_count: number
          search_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          query: string
          intent?: string | null
          results_count?: number
          search_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          query?: string
          intent?: string | null
          results_count?: number
          search_type?: string | null
          created_at?: string
        }
      }
    }
  }
}
