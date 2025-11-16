import { TextDecoder } from 'node:util';

const decoder = new TextDecoder('utf-8', { fatal: false });

export function extractText(buffer, fileType) {
  if (fileType?.startsWith('text/') || fileType?.includes('csv')) {
    return decoder.decode(buffer);
  }

  // Fall back to a permissive decode that strips unprintable characters
  const raw = decoder.decode(buffer);
  return raw.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ');
}

export function chunkText(text, chunkSize = 800, overlap = 120) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  if (!clean) return chunks;

  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

export function summarizeText(text) {
  const sentences = text.match(/[^.!?]+[.!?]/g) ?? [];
  if (sentences.length === 0) {
    return text.split(' ').slice(0, 40).join(' ');
  }
  return sentences.slice(0, 3).join(' ').trim();
}
