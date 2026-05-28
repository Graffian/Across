# AGENTS.md - Across Browser Memory

## Project Overview

AI-powered Chrome extension that indexes browser tab content, stores semantic embeddings, and provides a chat interface for querying all previously viewed tabs.

## Architecture

```
Extension (Plasmo + React + TypeScript)
├── Background Service Worker
│   ├── TabMonitor - tracks tab lifecycle
│   ├── QueueManager - priority-based async processing
│   ├── ChunkingPipeline - heading-aware semantic chunking
│   ├── EmbeddingService - provider abstraction for embeddings
│   └── SummarizationService - lazy tab summarization
├── Content Script
│   └── Readability extraction (Mozilla Readability)
├── Side Panel UI (React + Tailwind)
│   ├── ChatView - main chat interface
│   ├── MessageBubble - message display with sources
│   ├── ChatInput - input with keyboard shortcuts
│   ├── TabList - indexed tab browser
│   └── useChat - React hook for state management
├── Popup - quick access panel
└── Lib (shared utilities)
    ├── types.ts - all TypeScript interfaces
    ├── constants.ts - configuration values
    ├── indexedDB.ts - local storage layer
    └── messageTypes.ts - Chrome messaging

Backend (Node.js + Express + PostgreSQL)
├── Routes
│   ├── /api/embeddings - generate/store embeddings
│   ├── /api/chat - RAG-based chat
│   └── /api/search - semantic search
├── Services
│   ├── embeddingProvider - OpenAI/local abstraction
│   ├── llmProvider - OpenAI/local chat abstraction
│   └── vectorStore - pgvector storage/retrieval
└── DB
    ├── pool.ts - PostgreSQL connection
    ├── schema.ts - pgvector schema
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
- Storage: IndexedDB via idb library

### Message Passing
- Use `chrome.runtime.sendMessage` for extension-wide
- Use `chrome.tabs.sendMessage` for content script
- Always return true from listeners for async responses

## Development Commands

### Extension
```bash
cd extension
npm install
npm run dev    # Start Plasmo dev server
npm run build  # Build for production
```

### Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure env vars
npm run db:migrate    # Run PostgreSQL migrations
npm run dev           # Start dev server
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Content script extracts readable content
- [ ] Chunks are created with proper overlap
- [ ] IndexedDB stores/retrieves correctly
- [ ] Side panel opens and displays chat
- [ ] Messages are sent/received
- [ ] Backend starts and responds to health check
- [ ] Embeddings endpoint works
- [ ] Search returns relevant results

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
