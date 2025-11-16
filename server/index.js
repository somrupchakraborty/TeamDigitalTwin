import { createServer } from 'node:http';
import { LocalDatabase } from './database.js';
import { processFiles } from './processor.js';
import { buildAgenticAnswer } from './agent.js';

const database = new LocalDatabase();
const PORT = process.env.PORT || 4000;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  if (req.method === 'GET' && url.pathname === '/api/documents') {
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? Number(daysParam) : null;
    const documents = database.getRecentDocuments(Number.isFinite(days) ? days : null);
    return sendJson(res, 200, { documents });
  }

  if (req.method === 'POST' && url.pathname === '/api/documents') {
    try {
      const payload = await parseBody(req);
      const { uploaderName, files } = payload;
      if (!uploaderName || !files?.length) {
        return sendJson(res, 400, { error: 'Missing uploader name or files' });
      }

      const processed = processFiles(uploaderName, files);
      processed.forEach(({ document, chunks }) => {
        database.addDocumentWithChunks(document, chunks);
      });

      return sendJson(res, 200, { uploaded: processed.length });
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: 'Failed to save documents' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/agent') {
    try {
      const payload = await parseBody(req);
      const { query, recencyDays } = payload;
      if (!query) {
        return sendJson(res, 400, { error: 'Query is required' });
      }
      const result = buildAgenticAnswer(query, recencyDays, database);
      return sendJson(res, 200, result);
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: 'Failed to run agentic search' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/search') {
    try {
      const payload = await parseBody(req);
      const { query, recencyDays } = payload;
      if (!query) {
        return sendJson(res, 400, { error: 'Query is required' });
      }
      const result = buildAgenticAnswer(query, recencyDays, database);
      return sendJson(res, 200, { documents: result.documents });
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { error: 'Failed to search documents' });
    }
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Local RAG server listening on http://localhost:${PORT}`);
});

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
