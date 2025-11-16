import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'rag-db.json');

const INITIAL_STATE = {
  documents: [],
  chunks: [],
};

const cloneInitialState = () => JSON.parse(JSON.stringify(INITIAL_STATE));

export class LocalDatabase {
  constructor() {
    if (!existsSync(DB_PATH)) {
      this.state = cloneInitialState();
      this.#save();
    } else {
      const raw = readFileSync(DB_PATH, 'utf-8');
      this.state = raw ? JSON.parse(raw) : cloneInitialState();
    }
  }

  #save() {
    writeFileSync(DB_PATH, JSON.stringify(this.state, null, 2));
  }

  addDocumentWithChunks(document, chunks) {
    this.state.documents.push(document);
    this.state.chunks.push(...chunks);
    this.#save();
  }

  getRecentDocuments(days) {
    const now = Date.now();
    const cutoff = days ? now - days * 24 * 60 * 60 * 1000 : 0;
    return this.state.documents
      .filter(doc => (cutoff ? new Date(doc.uploaded_at).getTime() >= cutoff : true))
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  searchChunks(queryEmbedding, { limit = 8, recencyDays }) {
    const now = Date.now();
    const cutoff = recencyDays ? now - recencyDays * 24 * 60 * 60 * 1000 : 0;
    const documentsById = Object.fromEntries(this.state.documents.map(doc => [doc.id, doc]));

    const scored = this.state.chunks
      .map(chunk => {
        const document = documentsById[chunk.document_id];
        if (!document) return null;
        if (cutoff && new Date(document.uploaded_at).getTime() < cutoff) return null;
        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
        return { chunk, document, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
