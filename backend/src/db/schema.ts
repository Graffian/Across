export const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
    chunk_id UUID PRIMARY KEY,
    tab_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    heading TEXT NOT NULL DEFAULT '',
    chunk_index INTEGER NOT NULL DEFAULT 0,
    token_count INTEGER NOT NULL DEFAULT 0,
    timestamp BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id UUID PRIMARY KEY REFERENCES chunks(chunk_id) ON DELETE CASCADE,
    vector vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tabs (
    tab_id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_bookmarked BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending',
    open_time BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    last_accessed_time BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summaries (
    tab_id INTEGER PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_points JSONB DEFAULT '[]',
    generated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX IF NOT EXISTS idx_chunks_tab_id ON chunks(tab_id);
CREATE INDEX IF NOT EXISTS idx_chunks_url ON chunks(url);
CREATE INDEX IF NOT EXISTS idx_chunks_timestamp ON chunks(timestamp);
CREATE INDEX IF NOT EXISTS idx_embeddings_tab_id ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_tabs_url ON tabs(url);
CREATE INDEX IF NOT EXISTS idx_tabs_last_accessed ON tabs(last_accessed_time);
`
