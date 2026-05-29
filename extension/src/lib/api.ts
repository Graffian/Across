import type { ContentChunk, TabInfo } from "./types"

declare const __BACKEND_URL__: string | undefined
const BASE_URL = typeof __BACKEND_URL__ !== "undefined" ? __BACKEND_URL__ : "http://localhost:3001"

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiStoreChunks(chunks: ContentChunk[], embeddings: number[][]): Promise<void> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/embeddings/store`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chunks, embeddings }),
  })
  if (!response.ok) throw new Error(`Store chunks failed: ${response.status}`)
}

export async function apiStoreTab(tab: TabInfo): Promise<void> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/tabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tab),
  })
  if (!response.ok) throw new Error(`Store tab failed: ${response.status}`)
}

export async function apiDeleteTabData(tabId: number): Promise<void> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/tabs/${tabId}`, { method: "DELETE" })
  if (!response.ok) throw new Error(`Delete tab failed: ${response.status}`)
}

export async function apiLoadTabs(): Promise<TabInfo[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/tabs`, { method: "GET" })
  if (!response.ok) throw new Error(`Load tabs failed: ${response.status}`)
  const data = await response.json()
  return data.tabs
}

export async function apiSearchChunks(query: string, topK: number): Promise<{ chunk: ContentChunk; score: number }[]> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK }),
  })
  if (!response.ok) throw new Error(`Search failed: ${response.status}`)
  const data = await response.json()
  return data.results
}

export async function apiChat(message: string, history?: { role: string; content: string }[]): Promise<string> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  }, 120000)
  if (!response.ok) throw new Error(`Chat failed: ${response.status}`)
  const data = await response.json()
  return data.response
}
