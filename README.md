# TeamDigitalTwin

Local-first Retrieval Augmented Generation workspace. The Supabase implementation has been replaced with a lightweight Node server and JSON vector store so everything runs on your machine.

## Getting Started

```bash
# install dependencies
npm install

# run the local RAG server (stores data in ./data)
npm run server

# in another terminal start the UI
npm run dev
```

Set `VITE_API_URL` in your `.env` if you run the API on a different port (defaults to `http://localhost:4000`).

## Architecture

- **Local database:** persisted in `data/rag-db.json`. Uploaded files are written to `data/uploads/` so nothing leaves your laptop.
- **Automatic embeddings:** every upload is chunked and embedded immediately using a deterministic hashed vector model so semantic search uses document content, not just titles.
- **Agentic retrieval:** `/api/agent` executes a multi-step plan (intent analysis → embedding → retrieval → synthesis) and returns the reasoning steps plus the best-matching document chunks.
- **Recency controls:** both the chat assistant and search surface offer 7/14/30 day filters (or “all time”), and the API enforces the filter when retrieving chunks.
- **Full RAG search:** the old keyword search view now calls the same semantic retrieval pipeline so results always come from content-level embeddings.

## Available API routes

| Route | Description |
| --- | --- |
| `POST /api/documents` | Accepts `{ uploaderName, files: [{ name, type, size, content }] }` where `content` is base64. Saves files locally, chunks text, builds embeddings, and persists metadata. |
| `GET /api/documents?days=7` | Returns recently uploaded documents with highlights for quick browsing. |
| `POST /api/agent` | Runs the agentic RAG pipeline and returns `response`, `documents`, and reasoning `steps`. |
| `POST /api/search` | Same retrieval pipeline but returns only the ranked documents for the search interface. |

All routes are implemented with Node’s built-in HTTP modules so you do not need any external services.
