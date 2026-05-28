# Across - Browser Memory

> ChatGPT for your browser history and open tabs.

Across is an AI-powered Chrome extension that indexes content from open tabs, stores semantic memory using embeddings, and allows you to chat with all previously viewed tabs.

## Features

- **Tab Monitoring** - Automatically detects and tracks tab lifecycle
- **Content Extraction** - Clean article extraction using Mozilla Readability
- **Semantic Chunking** - Heading-aware splitting with token overlap
- **Embedding System** - OpenAI or local embedding provider abstraction
- **Vector Search** - pgvector-backed cosine similarity retrieval
- **AI Chat** - RAG-based responses from your browser memory
- **Lazy Summarization** - On-demand tab summarization
- **Local-First** - IndexedDB storage, works without cloud dependency

## Quick Start

### Extension

```bash
cd extension
npm install
npm run dev
```

Load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/build` folder

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your OpenAI API key
npm run db:migrate
npm run dev
```

## Architecture

```
Extension                    Backend
┌─────────────┐             ┌─────────────┐
│ Tab Monitor │             │ Express API │
│   ↓         │             │   ↓         │
│ Chunking    │────HTTP────│ pgvector    │
│   ↓         │             │   ↓         │
│ Embedding   │             │ OpenAI/Claude│
│   ↓         │             └─────────────┘
│ IndexedDB   │
│   ↓         │
│ Side Panel  │
│   (React)   │
└─────────────┘
```

## How It Works

1. **Index** - Extension monitors tabs, extracts content, chunks and embeds it
2. **Store** - Chunks stored in IndexedDB (local) + pgvector (backend)
3. **Query** - User asks question in side panel chat
4. **Retrieve** - Query embedded, relevant chunks found via cosine similarity
5. **Answer** - Context sent to LLM for RAG response

## Tech Stack

- **Extension**: Plasmo, React, TypeScript, Tailwind
- **Backend**: Node.js, Express, PostgreSQL + pgvector
- **AI**: OpenAI (embeddings + chat), Claude (alternative)
- **Storage**: IndexedDB (local), pgvector (backend)

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/across
OPENAI_API_KEY=sk-your-key-here
PORT=3001
DEFAULT_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

## Project Structure

```
across/
├── extension/
│   ├── src/
│   │   ├── background/        # Service worker + services
│   │   ├── content/           # Content script (Readability)
│   │   ├── sidepanel/         # React chat UI
│   │   ├── popup/             # Quick access popup
│   │   └── lib/               # Shared types and utilities
│   ├── package.json
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── db/                # Database layer
│   │   └── middleware/        # Rate limiting, error handling
│   ├── package.json
│   └── .env.example
├── AGENTS.md
└── README.md
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/embeddings` | Generate embeddings |
| POST | `/api/embeddings/store` | Store chunks with embeddings |
| POST | `/api/search` | Semantic search |
| POST | `/api/chat` | RAG-based chat |
| POST | `/api/chat/summarize` | Summarize content |

## License

MIT
