# Across — Browser Memory

> ChatGPT for your browser history and open tabs. Completely free with Jina AI embeddings + Groq Llama 3. No credit card required.

Across indexes content from open tabs, stores semantic memory in PostgreSQL with pgvector, and lets you chat with everything you've viewed.

## Features

- **Tab Monitoring** — auto-detects tabs, URL changes, activation, close
- **Content Extraction** — full-page text via Mozilla Readability + body fallback
- **Semantic Chunking** — heading-aware splitting with token overlap (800 target, 150 overlap)
- **Pluggable Embeddings** — Jina AI (free), Hugging Face (free), OpenAI
- **Priority Queue** — active > recent > pinned > background, debounced, retry with backoff
- **AI Chat** — RAG-based answers using Groq (free Llama 3), Hugging Face, OpenAI, or Anthropic
- **PostgreSQL + pgvector** — all chunks, embeddings, and tab state stored server-side
- **Backend Required** — the extension requires the backend running for chat and search

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension
- Free API keys (see below)

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
JINA_API_KEY=jina_your_key_here     # Jina AI for embeddings (free tier, 1M tokens)
GROQ_API_KEY=gsk_your_key_here      # Groq for Llama 3 chat (free, no credit card)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/across
```

Start the server:

```bash
npm run dev
```

### Extension

```bash
cd extension
npm install
npm run build
```

Load in Chrome:
1. `chrome://extensions` → Developer mode → Load unpacked
2. Select `extension/dist`

The extension connects to `http://localhost:3001` — make sure the backend is running.

## Embedding Providers

| Provider | Env Key | Quality | Cost |
|----------|---------|---------|------|
| **Jina AI** | `JINA_API_KEY` | ✅ Semantic | **Free** (1M tokens/month) |
| Hugging Face | `HF_API_TOKEN` | ✅ Semantic | **Free** (rate-limited) |
| OpenAI | `OPENAI_API_KEY` | ✅ Semantic | Paid |

Priority: `JINA_API_KEY` → `OPENAI_API_KEY` → `HF_API_TOKEN` → local trigram fallback.

## LLM Providers

| Provider | Env Key | Quality | Cost |
|----------|---------|---------|------|
| **Groq** | `GROQ_API_KEY` | ✅ Llama 3.3 70B | **Free** (30 RPM, no credit card) |
| Hugging Face | `HF_API_TOKEN` | ✅ Mistral 7B | **Free** (rate-limited) |
| OpenAI | `OPENAI_API_KEY` | ✅ GPT-4o-mini | Paid |
| Anthropic | `ANTHROPIC_API_KEY` | ✅ Claude | Paid |
| Local | none | ⚠️ Template | Free |

Priority: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `GROQ_API_KEY` → `HF_API_TOKEN` → local fallback.

## How It Works

1. **Extract** — Content script runs Mozilla Readability on each page; falls back to `<article>`, `<main>`, `<p>` tags, then `document.body.innerText`
2. **Chunk** — Heading-aware splitting into ~800-token chunks with 150-token overlap
3. **Embed** — Each chunk gets a vector embedding via backend (Jina AI API)
4. **Store** — Chunks + embeddings sent to backend, stored in PostgreSQL with pgvector
5. **Query** — User asks a question in the side panel
6. **Retrieve** — Backend embeds the question, searches pgvector for top-10 similar chunks
7. **Answer** — Backend sends chunks + question to Groq (or configured LLM) for RAG response

## Architecture

```
Extension (React + TypeScript)
┌──────────────────────────────────────────┐
│  TabMonitor → QueueManager               │
│       ↓                                  │
│  ContentScript (Readability extraction)  │
│       ↓                                  │
│  ChunkingPipeline → EmbeddingService     │
│       ↓                                  │
│  api.ts → HTTP → Backend                 │
│       ↓                                  │
│  Side Panel (Chat UI)                    │
└──────────────────────────────────────────┘
                    │
                    ▼
         Backend (Express + PostgreSQL)
  ┌──────────────────────────────────────┐
  │  /api/tabs         — CRUD tab state  │
  │  /api/embeddings   — Jina AI         │
  │  /api/embeddings/store — store chunks│
  │  /api/search       — pgvector search │
  │  /api/chat         — RAG (search+LLM)│
  │  /api/summarize    — LLM summarization│
  │                                       │
  │  PostgreSQL + pgvector (vector(1024)) │
  └──────────────────────────────────────┘
```

## Project Structure

```
across/
├── extension/
│   ├── src/
│   │   ├── background/services/   # TabMonitor, QueueManager, Chunking, Embedding
│   │   ├── content/               # Readability extraction + fallback
│   │   ├── sidepanel/             # ChatView, MessageBubble, ChatInput, TabList
│   │   ├── popup/                 # Quick tab list panel
│   │   └── lib/                   # Types, constants, api.ts, indexedDB (chat only)
│   ├── assets/                    # Extension icons
│   ├── scripts/                   # build.mjs
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/                # tabs, embeddings, chat, search
│   │   ├── services/              # embeddingProvider (Jina/HF/OpenAI), llmProvider (Groq/Claude/OpenAI/HF), vectorStore
│   │   ├── db/                    # PostgreSQL pool + pgvector schema + migrations
│   │   └── middleware/            # rateLimit, errorHandler
│   └── package.json
├── AGENTS.md
└── README.md
```

## Environment Variables

```env
# Embeddings (pick one — Jina is free):
JINA_API_KEY=jina_your_key_here
# OPENAI_API_KEY=sk-...
# HF_API_TOKEN=hf_...

# LLM (pick one — Groq is free):
GROQ_API_KEY=gsk_your_key_here
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...

# PostgreSQL (required):
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/across

PORT=3001
```

## Getting Free API Keys

- **Jina AI** (embeddings): [jina.ai/embeddings](https://jina.ai/embeddings) — sign up, 1M free tokens/month
- **Groq** (Llama 3 chat): [console.groq.com](https://console.groq.com) — sign up, free tier, no credit card
- **Hugging Face** (embeddings + chat): [huggingface.co/join](https://huggingface.co/join) — free inference API

MIT
