import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { extractText, chunkText, summarizeText } from './text.js';
import { embedText } from './embedding.js';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function processFiles(uploaderName, files) {
  const processed = [];

  files.forEach(file => {
    const id = randomUUID();
    const storedFilename = `${id}-${file.name}`;
    const storedPath = path.join(UPLOAD_DIR, storedFilename);
    const buffer = Buffer.from(file.content, 'base64');
    writeFileSync(storedPath, buffer);

    const text = extractText(buffer, file.type);
    const summary = summarizeText(text);
    const chunks = chunkText(text);

    const doc = {
      id,
      filename: file.name,
      file_type: file.type || 'unknown',
      file_size: file.size,
      uploader_name: uploaderName,
      summary,
      uploaded_at: new Date().toISOString(),
      storage_path: storedFilename,
    };

    const chunkRows = chunks.map((chunk, index) => ({
      id: randomUUID(),
      document_id: id,
      chunk_index: index,
      content: chunk,
      embedding: embedText(chunk),
    }));

    processed.push({ document: doc, chunks: chunkRows });
  });

  return processed;
}
