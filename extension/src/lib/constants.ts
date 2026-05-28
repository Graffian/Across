export const CHUNK_SIZE_TARGET = 800
export const CHUNK_SIZE_MIN = 500
export const CHUNK_SIZE_MAX = 1000
export const CHUNK_OVERLAP_TARGET = 150
export const CHUNK_OVERLAP_MIN = 100
export const CHUNK_OVERLAP_MAX = 200

export const EMBEDDING_DIMENSION = 1536
export const EMBEDDING_MODEL = "text-embedding-3-small"

export const TOP_K_DEFAULT = 10
export const TOP_K_MAX = 50

export const DEBOUNCE_MS_DEFAULT = 3000
export const DEBOUNCE_MS_ACTIVE = 1000

export const MAX_TABS_BATCH = 5
export const PROCESSING_INTERVAL_MS = 500

export const INDEXEDDB_NAME = "across-store"
export const INDEXEDDB_VERSION = 1

export const CHUNKS_STORE = "chunks"
export const EMBEDDINGS_STORE = "embeddings"
export const TABS_STORE = "tabs"
export const SUMMARIES_STORE = "summaries"
export const CHAT_STORE = "chat_sessions"
export const SETTINGS_STORE = "settings"

export const BACKEND_DEFAULT_URL = "http://localhost:3001"

export const LLM_MODEL = "gpt-4o-mini"
export const LLM_MAX_TOKENS = 4096
export const LLM_TEMPERATURE = 0.3

export const MAX_RETRIES = 3
export const RETRY_DELAY_MS = 1000
export const RATE_LIMIT_RPM = 60

export const TAB_PRIORITY_ACTIVE = 1
export const TAB_PRIORITY_RECENT = 2
export const TAB_PRIORITY_PINNED = 3
export const TAB_PRIORITY_BACKGROUND = 4

export const STORAGE_KEYS = {
  SETTINGS: "across_settings",
  CHAT_SESSIONS: "across_chat_sessions",
  INDEXED_DB_INIT: "across_db_init",
} as const

export const MIME_TYPES_TO_SKIP = [
  "application/pdf",
  "image/",
  "video/",
  "audio/",
  "application/zip",
  "application/gzip",
]

export const URL_PATTERNS_TO_SKIP = [
  /^chrome:\/\//,
  /^chrome-extension:\/\//,
  /^about:/,
  /^file:\/\//,
  /^view-source:/,
  /^data:/,
  /\.(pdf|zip|gz|tar|rar|exe|dmg|iso|dll)$/i,
]
