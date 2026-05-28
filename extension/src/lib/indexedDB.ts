import { openDB, IDBPDatabase } from "idb"
import type { ContentChunk, StoredChunk, TabInfo, TabSummary, ChatSession, ExtensionSettings } from "./types"
import {
  INDEXEDDB_NAME,
  INDEXEDDB_VERSION,
  CHUNKS_STORE,
  TABS_STORE,
  SUMMARIES_STORE,
  CHAT_STORE,
  SETTINGS_STORE,
  EMBEDDINGS_STORE,
} from "./constants"

let dbInstance: IDBPDatabase | null = null

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(INDEXEDDB_NAME, INDEXEDDB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: "chunkId" })
        chunkStore.createIndex("tabId", "tabId", { unique: false })
        chunkStore.createIndex("url", "url", { unique: false })
        chunkStore.createIndex("timestamp", "timestamp", { unique: false })
      }

      if (!db.objectStoreNames.contains(EMBEDDINGS_STORE)) {
        const embStore = db.createObjectStore(EMBEDDINGS_STORE, { keyPath: "chunkId" })
        embStore.createIndex("tabId", "tabId", { unique: false })
      }

      if (!db.objectStoreNames.contains(TABS_STORE)) {
        const tabStore = db.createObjectStore(TABS_STORE, { keyPath: "tabId" })
        tabStore.createIndex("url", "url", { unique: false })
        tabStore.createIndex("lastAccessedTime", "lastAccessedTime", { unique: false })
      }

      if (!db.objectStoreNames.contains(SUMMARIES_STORE)) {
        const sumStore = db.createObjectStore(SUMMARIES_STORE, { keyPath: "tabId" })
        sumStore.createIndex("url", "url", { unique: false })
      }

      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: "sessionId" })
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" })
      }
    },
  })

  return dbInstance
}

export async function storeChunks(chunks: ContentChunk[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(CHUNKS_STORE, "readwrite")
  for (const chunk of chunks) {
    await tx.store.put(chunk)
  }
  await tx.done
}

export async function getChunksByTabId(tabId: number): Promise<ContentChunk[]> {
  const db = await getDB()
  const index = db.transaction(CHUNKS_STORE, "readonly").store.index("tabId")
  return index.getAll(tabId)
}

export async function getChunksByUrl(url: string): Promise<ContentChunk[]> {
  const db = await getDB()
  const index = db.transaction(CHUNKS_STORE, "readonly").store.index("url")
  return index.getAll(url)
}

export async function getAllChunks(): Promise<ContentChunk[]> {
  const db = await getDB()
  return db.transaction(CHUNKS_STORE, "readonly").store.getAll()
}

export async function deleteChunksByTabId(tabId: number): Promise<void> {
  const db = await getDB()
  const chunks = await getChunksByTabId(tabId)
  const tx = db.transaction(CHUNKS_STORE, "readwrite")
  for (const chunk of chunks) {
    await tx.store.delete(chunk.chunkId)
  }
  await tx.done
}

export async function storeEmbedding(chunkId: string, embedding: number[]): Promise<void> {
  const db = await getDB()
  await db.put(EMBEDDINGS_STORE, { chunkId, embedding })
}

export async function getEmbedding(chunkId: string): Promise<number[] | null> {
  const db = await getDB()
  const entry = await db.get(EMBEDDINGS_STORE, chunkId)
  return entry?.embedding ?? null
}

export async function storeTab(tab: TabInfo): Promise<void> {
  const db = await getDB()
  await db.put(TABS_STORE, tab)
}

export async function getTab(tabId: number): Promise<TabInfo | undefined> {
  const db = await getDB()
  return db.get(TABS_STORE, tabId)
}

export async function getAllTabs(): Promise<TabInfo[]> {
  const db = await getDB()
  return db.transaction(TABS_STORE, "readonly").store.getAll()
}

export async function deleteTab(tabId: number): Promise<void> {
  const db = await getDB()
  await db.delete(TABS_STORE, tabId)
}

export async function storeSummary(summary: TabSummary): Promise<void> {
  const db = await getDB()
  await db.put(SUMMARIES_STORE, summary)
}

export async function getSummary(tabId: number): Promise<TabSummary | undefined> {
  const db = await getDB()
  return db.get(SUMMARIES_STORE, tabId)
}

export async function storeChatSession(session: ChatSession): Promise<void> {
  const db = await getDB()
  await db.put(CHAT_STORE, session)
}

export async function getChatSessions(): Promise<ChatSession[]> {
  const db = await getDB()
  return db.transaction(CHAT_STORE, "readonly").store.getAll()
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete(CHAT_STORE, sessionId)
}

export async function clearAllChatSessions(): Promise<void> {
  const db = await getDB()
  await db.clear(CHAT_STORE)
}

export async function storeSettings(settings: ExtensionSettings): Promise<void> {
  const db = await getDB()
  await db.put(SETTINGS_STORE, { key: "settings", ...settings })
}

export async function getSettings(): Promise<ExtensionSettings | null> {
  const db = await getDB()
  const entry = await db.get(SETTINGS_STORE, "settings")
  return entry || null
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await db.clear(CHUNKS_STORE)
  await db.clear(EMBEDDINGS_STORE)
  await db.clear(TABS_STORE)
  await db.clear(SUMMARIES_STORE)
  await db.clear(CHAT_STORE)
}

export async function searchChunksLocally(
  queryEmbedding: number[],
  topK: number
): Promise<{ chunk: ContentChunk; score: number }[]> {
  const db = await getDB()
  const allChunks = await db.transaction(CHUNKS_STORE, "readonly").store.getAll()
  const results: { chunk: ContentChunk; score: number }[] = []

  for (const chunk of allChunks) {
    const emb = await getEmbedding(chunk.chunkId)
    if (!emb) continue
    const score = cosineSimilarity(queryEmbedding, emb)
    results.push({ chunk, score })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, topK)
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}
