export interface DocumentSummary {
  id: string;
  filename: string;
  summary: string;
  file_type: string;
  file_size: number;
  uploader_name: string;
  uploaded_at: string;
  storage_path?: string;
  highlights?: string[];
  relevance?: number;
}

export interface AgentResponse {
  response: string;
  documents: DocumentSummary[];
  steps: string[];
}

export interface UploadPayload {
  name: string;
  type: string;
  size: number;
  content: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return response.json();
}

export function runAgentQuery(query: string, recencyDays: number | null) {
  return request('/api/agent', {
    method: 'POST',
    body: JSON.stringify({ query, recencyDays }),
  }) as Promise<AgentResponse>;
}

export function semanticSearch(query: string, recencyDays: number | null) {
  return request('/api/search', {
    method: 'POST',
    body: JSON.stringify({ query, recencyDays }),
  }) as Promise<{ documents: DocumentSummary[] }>;
}

export function fetchRecentDocuments(days: number) {
  const queryParam = days ? `?days=${days}` : '';
  return request(`/api/documents${queryParam}`, {
    method: 'GET',
  }) as Promise<{ documents: DocumentSummary[] }>;
}

export function uploadDocuments(uploaderName: string, files: UploadPayload[]) {
  return request('/api/documents', {
    method: 'POST',
    body: JSON.stringify({ uploaderName, files }),
  }) as Promise<{ uploaded: number }>;
}
