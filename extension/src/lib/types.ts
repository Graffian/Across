export interface TabInfo {
  tabId: number
  url: string
  title: string
  domain: string
  isActive: boolean
  isPinned: boolean
  isBookmarked: boolean
  openTime: number
  lastAccessedTime: number
  status: TabStatus
  visitCount: number
}

export type TabStatus = "pending" | "extracting" | "chunked" | "embedded" | "failed"

export interface ExtractedContent {
  tabId: number
  url: string
  title: string
  textContent: string
  headings: Heading[]
  codeBlocks: string[]
  wordCount: number
  extractedAt: number
}

export interface Heading {
  level: 1 | 2 | 3 | 4 | 5 | 6
  text: string
}

export interface ContentChunk {
  chunkId: string
  tabId: number
  url: string
  title: string
  content: string
  heading: string
  chunkIndex: number
  tokenCount: number
  timestamp: number
}

export interface ChunkMetadata {
  chunkId: string
  tabId: number
  url: string
  title: string
  heading: string
  chunkIndex: number
  timestamp: number
}

export interface ChunkWithEmbedding {
  chunk: ContentChunk
  embedding: number[]
}

export interface StoredChunk {
  chunk: ContentChunk
  embedding: number[] | null
  summary: string | null
}

export interface TabSummary {
  tabId: number
  url: string
  title: string
  summary: string
  keyPoints: string[]
  generatedAt: number
}

export interface SearchQuery {
  text: string
  topK: number
  tabId?: number
  urlFilter?: string
  timeRange?: { from: number; to: number }
}

export interface SearchResult {
  chunk: ContentChunk
  score: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ChatSession {
  sessionId: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface QueueItem {
  id: string
  tabId: number
  url: string
  priority: QueuePriority
  status: QueueItemStatus
  retryCount: number
  createdAt: number
  updatedAt: number
}

export type QueuePriority = 1 | 2 | 3 | 4
export type QueueItemStatus = "queued" | "processing" | "completed" | "failed"

export interface BackendConfig {
  baseUrl: string
  enabled: boolean
}

export interface ExtensionSettings {
  backend: BackendConfig
  chunkSize: number
  chunkOverlap: number
  maxTabsToProcess: number
  debounceMs: number
  autoIndex: boolean
  lazySummarize: boolean
  enableCloudSync: boolean
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backend: {
    baseUrl: "http://localhost:3001",
    enabled: false,
  },
  chunkSize: 800,
  chunkOverlap: 150,
  maxTabsToProcess: 20,
  debounceMs: 3000,
  autoIndex: true,
  lazySummarize: true,
  enableCloudSync: false,
}

export type ExtensionMessage =
  | { type: "EXTRACT_CONTENT"; tabId: number; url: string }
  | { type: "CONTENT_EXTRACTED"; payload: ExtractedContent }
  | { type: "CHUNKS_READY"; payload: ContentChunk[] }
  | { type: "EMBEDDINGS_READY"; tabId: number; chunks: ContentChunk[] }
  | { type: "SEARCH_QUERY"; payload: SearchQuery }
  | { type: "SEARCH_RESULTS"; payload: SearchResult[] }
  | { type: "CHAT_MESSAGE"; payload: { message: string; sessionId?: string } }
  | { type: "CHAT_RESPONSE"; payload: { response: string } }
  | { type: "TAB_UPDATED"; payload: Partial<TabInfo> }
  | { type: "TAB_CLOSED"; tabId: number }
  | { type: "TAB_ACTIVATED"; tabId: number }
  | { type: "NAVIGATION_COMPLETED"; tabId: number; url: string }
  | { type: "GET_TABS" }
  | { type: "TABS_LIST"; payload: TabInfo[] }
  | { type: "GET_SETTINGS" }
  | { type: "SETTINGS_UPDATED"; payload: Partial<ExtensionSettings> }
  | { type: "GET_CHAT_HISTORY" }
  | { type: "CHAT_HISTORY"; payload: ChatSession[] }
  | { type: "CLEAR_CHAT_HISTORY" }
  | { type: "DELETE_TAB_DATA"; tabId: number }
  | { type: "SUMMARIZE_TAB"; tabId: number }
  | { type: "TAB_SUMMARIZED"; payload: TabSummary }
  | { type: "INDEXING_PROGRESS"; payload: { tabId: number; status: TabStatus; progress: number } }
