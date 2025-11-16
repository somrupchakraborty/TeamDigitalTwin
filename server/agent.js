import { embedText } from './embedding.js';

export function buildAgenticAnswer(query, recencyDays, database) {
  const steps = [];
  const normalizedQuery = query.trim();
  steps.push(`Interpreted user intent for: "${normalizedQuery}"`);

  const queryEmbedding = embedText(normalizedQuery);
  steps.push('Converted the question into a semantic vector representation.');

  const matches = database.searchChunks(queryEmbedding, { limit: 8, recencyDays });
  steps.push(`Retrieved ${matches.length} relevant knowledge chunks from the local store.`);

  const documents = aggregateDocuments(matches);
  steps.push('Assembled supporting document context.');

  const response = synthesizeAnswer(normalizedQuery, documents, matches);
  steps.push('Synthesized an answer with citations.');

  return { response, documents, steps };
}

function aggregateDocuments(matches) {
  const docMap = new Map();

  matches.forEach(({ document, chunk, score }) => {
    if (!docMap.has(document.id)) {
      docMap.set(document.id, {
        ...document,
        relevance: score,
        highlights: [],
      });
    }
    const entry = docMap.get(document.id);
    entry.relevance = Math.max(entry.relevance, score);
    entry.highlights.push(chunk.content.slice(0, 280));
  });

  return Array.from(docMap.values())
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
}

function synthesizeAnswer(query, documents, matches) {
  if (documents.length === 0) {
    return `I reviewed your local knowledge base but could not find information related to "${query}" in the selected time window.`;
  }

  const lines = [`Here is what I found for "${query}":`];
  documents.forEach((doc, index) => {
    const highlight = doc.highlights[0] ?? 'No readable excerpt available yet.';
    lines.push(
      `\n${index + 1}. **${doc.filename}** — ${doc.summary || 'Summary not available.'}\n   ↳ ${highlight.trim()}...`
    );
  });

  const supporting = matches
    .map(match => `• ${match.document.filename} (score ${(match.score).toFixed(2)})`)
    .join('\n');

  lines.push('\nRelevant sources:');
  lines.push(supporting);

  return lines.join('\n');
}
