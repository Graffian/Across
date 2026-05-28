# AGENTS.md - Across Browser Memory

## Project Overview

AI-powered Chrome extension that indexes browser tab content, stores semantic embeddings in PostgreSQL with pgvector, and provides a chat interface for querying all previously viewed tabs.

## Architecture

```
Extension (React + TypeScript)
├── Background Service Worker
│   ├── TabMonitor - tracks tab lifecycle (syncs to backend)
│   ├── QueueManager - priority-based async processing
│   ├── ChunkingPipeline - heading-aware semantic chunking
│   ├── EmbeddingService - embed + store to backend
│   └── SummarizationService - lazy tab summarization (via backend)
├── Content Script
│   └── Readability extraction (Mozilla Readability)
├── Side Panel UI (React + Tailwind)
│   ├── ChatView - main chat interface
│   ├── MessageBubble - message display
│   ├── ChatInput - input with keyboard shortcuts
│   ├── TabList - indexed tab browser
│   └── useChat - React hook for state management
├── Popup - quick access panel
└── Lib (shared utilities)
    ├── types.ts - all TypeScript interfaces
    ├── constants.ts - configuration values
    ├── api.ts - backend HTTP client
    └── indexedDB.ts - chat sessions only (ephemeral)

Backend (Node.js + Express + PostgreSQL)
├── Routes
│   ├── /api/tabs - CRUD tab state
│   ├── /api/embeddings - generate + store embeddings
│   ├── /api/chat - RAG-based chat (pgvector search + LLM)
│   └── /api/search - semantic search via pgvector
├── Services
│   ├── embeddingProvider - Jina AI / Hugging Face / OpenAI
│   ├── llmProvider - Groq / Hugging Face / OpenAI / Anthropic
│   └── vectorStore - pgvector storage + similarity search
└── DB
    ├── pool.ts - PostgreSQL connection
    ├── schema.ts - pgvector schema (vector 1024d)
    └── migrations.ts - run migrations
```

## Key Conventions

### Code Style
- TypeScript strict mode
- No comments unless requested
- Use `interface` for object types
- Use `type` for unions/aliases
- Prefer `const` over `let`
- Use early returns
- Destructure when possible

### File Naming
- Components: PascalCase (ChatView.tsx)
- Services: camelCase (tabMonitor.ts)
- Types: camelCase (types.ts)
- Constants: UPPER_SNAKE_CASE

### State Management
- Extension: React hooks (useState, useCallback)
- Background: Class singletons (TabMonitor, QueueManager)
- Storage: PostgreSQL + pgvector (primary), IndexedDB (chat sessions only)

### Message Passing
- Use `chrome.runtime.sendMessage` for extension-wide
- Use `chrome.tabs.sendMessage` for content script
- Always return true from listeners for async responses

## Development Commands

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure env vars + DATABASE_URL
npm run dev           # Starts server + runs migrations
```

### Extension
```bash
cd extension
npm install
npm run build  # Build to dist/
```

Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `extension/dist`

## Data Flow

### Tab Indexing
1. TabMonitor detects new/updated tab → enqueues in QueueManager
2. Content script extracts page text via Readability
3. ChunkingPipeline splits into 800-token chunks with 150 overlap
4. EmbeddingService sends chunks to backend for Jina AI embedding
5. Backend stores chunks + embeddings in PostgreSQL (chunks + embeddings tables)
6. TabMonitor upserts tab state to backend (tabs table)

### Chat Query
1. User types question in ChatView → useChat sends CHAT_MESSAGE to background
2. Background calls POST /api/chat with `{ message }`
3. Backend embeds query via Jina AI, searches pgvector cosine similarity
4. Backend sends top chunks + question to Groq LLM for RAG answer
5. Response returned to extension and displayed

### Startup / Restore
1. TabMonitor.initialize() calls GET /api/tabs to load stored tab state
2. Syncs with Chrome's open tabs via tabs.query
3. Tabs with "pending" status enqueued for re-indexing

### Tab Close / URL Change
1. TabMonitor detects tab removal or URL change
2. Calls DELETE /api/tabs/:tabId
3. Backend removes rows from embeddings, chunks, summaries, and tabs tables

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script extracts readable content
- [ ] Chunks are created with proper overlap
- [ ] Backend stores chunks in PostgreSQL
- [ ] Backend stores embeddings in pgvector
- [ ] pgvector search returns relevant results
- [ ] Side panel opens and displays chat
- [ ] Chat messages return RAG answers from backend
- [ ] Tab close deletes data from PostgreSQL
- [ ] Extension restart restores tab state from backend

## Performance Rules

1. Never process all tabs simultaneously
2. Use priority queue (active > recent > pinned > background)
3. Debounce tab processing (3s default)
4. Lazy summarize (only on demand)
5. Background indexing only when tab is idle
6. Max 2 concurrent processing tasks
7. Retry with exponential backoff (3 attempts)

## Security Rules

1. Never store API keys in extension code
2. Use environment variables for secrets
3. Validate all inputs on backend
4. Sanitize content before storage
5. No eval() or innerHTML with user content
6. Use HTTPS for all backend communication
