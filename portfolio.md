# Across — Browser Memory

> ChatGPT for your browser history and open tabs. Index, search, and chat with everything you've viewed.

## Description

Across is a Chrome extension that continuously indexes the content of your open browser tabs, stores semantic embeddings in PostgreSQL with pgvector, and provides a chat interface for querying all previously viewed tabs using RAG (Retrieval-Augmented Generation). It works completely free using Jina AI embeddings and Groq Llama 3 with no credit card required, or can be upgraded to use OpenAI/Anthropic.

The extension automatically tracks tab lifecycle (open, close, URL changes, activation), extracts readable page content via Mozilla Readability, splits pages into heading-aware semantic chunks with overlap, and stores vector embeddings server-side. Users can then ask natural language questions and get answers grounded in content they've actually viewed, with source citations.

## Tech Stack

- **Frontend**: TypeScript, React, Tailwind CSS, Mozilla Readability
- **Backend**: Node.js, Express, PostgreSQL, pgvector
- **LLM Providers**: Groq (Llama 3), OpenAI (GPT-4o-mini), Anthropic (Claude), Hugging Face
- **Embedding Providers**: Jina AI, OpenAI, Hugging Face
- **Infrastructure**: Chrome Extensions API (Manifest V3), Service Workers
