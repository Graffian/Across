# Across — Browser Memory

> ChatGPT for your browser history and open tabs. No OpenAI needed — works with Claude + free Jina AI embeddings.

Across indexes content from open tabs, stores semantic memory using embeddings, and lets you chat with everything you've viewed.

## Features

- **Tab Monitoring** — auto-detects tabs, URL changes, activation, close
- **Content Extraction** — clean article extraction via Mozilla Readability
- **Semantic Chunking** — heading-aware splitting with token overlap (800 target, 150 overlap)
- **Embedding System** — pluggable providers: Jina AI (free), Hugging Face (free), OpenAI
- **Priority Queue** — active > recent > pinned > background, debounced, 2 concurrent max
- **AI Chat** — RAG-based answers using Claude (or OpenAI)
- **Lazy Summarization** — on-demand, not automatic
- **Local-First** — IndexedDB storage, backend is optional for basic use

## Quick Start

### 1. Extension

```bash
cd extension
npm install
npm run dev
```

Load in Chrome:
1. `chrome://extensions` → Developer mode → Load unpacked
2. Select `extension/build`

The extension works standalone (local-only mode) with hash-based keyword matching.

### 2. Backend (for real AI)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` — you only need **two keys**:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here   # Claude for chat
JINA_API_KEY=jina_your_key_here          # Jina AI for embeddings (free tier)
```

Start the server:

```bash
npm run dev
```

That's it. No OpenAI required.

## Embedding Providers

| Provider | Key | Quality | Cost |
|----------|-----|---------|------|
| **Jina AI** | `JINA_API_KEY` | ✅ Semantic | **Free** (1M tokens) |
| Hugging Face | `HF_API_TOKEN` | ✅ Semantic | **Free** (rate-limited) |
| OpenAI | `OPENAI_API_KEY` | ✅ Semantic | Paid |
| Hash fallback | none | ⚠️ Keyword | Free |

Priority: `JINA_API_KEY` → `OPENAI_API_KEY` → `HF_API_TOKEN` → hash fallback.

## LLM Providers

| Provider | Key | Used for |
|----------|-----|----------|
| **Anthropic Claude** | `ANTHROPIC_API_KEY` | Chat + summarization |
| OpenAI | `OPENAI_API_KEY` | Chat + summarization (fallback) |
| Local | none | Keyword-only response |

Priority: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → local fallback.

## How It Works

1. **Index** — background worker monitors tabs, extracts content via Readability
2. **Chunk** — heading-aware splitting into ~800-token chunks with overlap
3. **Embed** — chunks sent to backend for vector embedding (Jina/OpenAI/HF)
4. **Store** — IndexedDB (local) + pgvector (optional)
5. **Query** — user asks question in side panel
6. **Retrieve** — query embedded, top-k chunks found via cosine similarity
7. **Answer** — relevant chunks + question sent to Claude for RAG response

## Architecture

```
Extension (Plasmo)                    Backend (Express)
┌─────────────────────┐             ┌──────────────────────┐
│  TabMonitor         │             │  /api/embeddings     │
│  QueueManager       │──HTTP──────│  Jina │ OpenAI │ HF  │
│  ChunkingPipeline   │             ├──────────────────────┤
│  EmbeddingService   │             │  /api/chat           │
│  IndexedDB          │             │  Claude │ OpenAI     │
│  Side Panel (React) │             ├──────────────────────┤
│  Popup              │             │  /api/search         │
└─────────────────────┘             │  pgvector            │
                                    └──────────────────────┘
```

## Project Structure

```
across/
├── extension/
│   ├── src/
│   │   ├── background/services/   # TabMonitor, QueueManager, Chunking, Embedding, Summarization
│   │   ├── content/               # Readability extraction
│   │   ├── sidepanel/             # React chat UI (ChatView, MessageBubble, ChatInput, TabList)
│   │   ├── popup/                 # Quick access panel
│   │   └── lib/                   # Types, constants, IndexedDB, messaging
│   ├── package.json
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── routes/                # embeddings, chat, search
│   │   ├── services/              # embeddingProvider, llmProvider, vectorStore
│   │   ├── db/                    # pool, schema, migrations
│   │   └── middleware/            # rateLimit, errorHandler
│   ├── package.json
│   └── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```

## Environment Variables

```env
# Pick ONE embedding provider (free options available):
JINA_API_KEY=jina_your_key_here     # Free tier, 1M tokens
# OPENAI_API_KEY=sk-...             # Paid, best quality
# HF_API_TOKEN=hf_...               # Free, rate-limited

# Anthropic for chat (what you have):
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Database (optional — extension works locally without it):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/across

PORT=3001
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

## Getting Free API Keys

**Jina AI** (embeddings): [jina.ai/embeddings](https://jina.ai/embeddings) — sign up, get key, 1M free tokens

**Anthropic Claude** (chat): [console.anthropic.com](https://console.anthropic.com) — sign up, get API key

MIT
