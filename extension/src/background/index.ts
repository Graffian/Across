import { tabMonitor } from "./services/tabMonitor"
import { queueManager } from "./services/queueManager"
import { chunkContent } from "./services/chunkingPipeline"
import { embedChunks } from "./services/embeddingService"
import { generateSummary } from "./services/summarizationService"
import type { ExtractedContent, ContentChunk, TabInfo, SearchQuery, SearchResult, ChatMessage, ChatSession, ExtensionSettings } from "../lib/types"
import { storeChunks, storeTab, getChunksByTabId, deleteChunksByTabId, searchChunksLocally, getEmbedding, getSettings, storeSettings, getChatSessions, storeChatSession, clearAllChatSessions, deleteTab, getAllTabs } from "../lib/indexedDB"
import { TAB_PRIORITY_ACTIVE, TAB_PRIORITY_RECENT, TAB_PRIORITY_PINNED, TAB_PRIORITY_BACKGROUND, TOP_K_DEFAULT } from "../lib/constants"
import { generateEmbedding } from "./services/embeddingService"
import { v4 as uuidv4 } from "uuid"

async function initialize(): Promise<void> {
  await tabMonitor.initialize()

  tabMonitor.onTabUpdate((tab) => {
    if (tab.status === "pending") {
      const priority = getPriorityForTab(tab)
      queueManager.enqueue(tab.tabId, tab.url, priority)
    }
  })

  queueManager.onProcess(async (item) => {
    await processTab(item.tabId, item.url)
  })

  queueManager.onComplete((item) => {
    notifyIndexingProgress(item.tabId, "embedded", 100)
  })

  queueManager.onError(async (item, error) => {
    console.error(`Failed to process tab ${item.tabId}:`, error)
    const tab = tabMonitor.getTab(item.tabId)
    if (tab) {
      tab.status = "failed"
      tabMonitor["tabs"].set(item.tabId, tab)
      await storeTab(tab)
    }
    notifyIndexingProgress(item.tabId, "failed", 0)
  })

  chrome.runtime.onMessage.addListener(handleMessage)
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })
}

function getPriorityForTab(tab: TabInfo): 1 | 2 | 3 | 4 {
  if (tab.isActive) return TAB_PRIORITY_ACTIVE as 1
  if (tab.isPinned) return TAB_PRIORITY_PINNED as 3
  if (Date.now() - tab.lastAccessedTime < 300000) return TAB_PRIORITY_RECENT as 2
  return TAB_PRIORITY_BACKGROUND as 4
}

async function processTab(tabId: number, url: string): Promise<void> {
  notifyIndexingProgress(tabId, "extracting", 10)

  const tab = tabMonitor.getTab(tabId)
  if (!tab) return

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "EXTRACT_CONTENT", tabId, url })
    if (!response?.success || !response.content) {
      throw new Error(response?.error || "Content extraction failed")
    }

    const extracted = response.content as ExtractedContent
    if (!extracted.textContent || extracted.wordCount < 5) {
      throw new Error("Page has no meaningful text content to index")
    }
    notifyIndexingProgress(tabId, "extracting", 40)

    const chunks = chunkContent(extracted)
    notifyIndexingProgress(tabId, "chunked", 60)

    await storeChunks(chunks)
    notifyIndexingProgress(tabId, "chunked", 70)

    await embedChunks(chunks)
    notifyIndexingProgress(tabId, "embedded", 90)

    const currentTab = tabMonitor.getTab(tabId)
    if (currentTab) {
      currentTab.status = "embedded"
      tabMonitor["tabs"].set(tabId, currentTab)
      await storeTab(currentTab)
    }

    notifyIndexingProgress(tabId, "embedded", 100)
  } catch (error) {
    notifyIndexingProgress(tabId, "failed", 0)
    throw error
  }
}

function notifyIndexingProgress(tabId: number, status: string, progress: number): void {
  chrome.runtime.sendMessage({
    type: "INDEXING_PROGRESS",
    payload: { tabId, status, progress },
  }).catch(() => {})
}

async function handleMessage(message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<boolean> {
  switch (message.type) {
    case "GET_TABS": {
      const tabs = tabMonitor.getAllTabs()
      sendResponse({ type: "TABS_LIST", payload: tabs })
      break
    }

    case "GET_SETTINGS": {
      const settings = await getSettings()
      sendResponse({ type: "SETTINGS_READY", payload: settings })
      break
    }

    case "SETTINGS_UPDATED": {
      await storeSettings(message.payload)
      sendResponse({ success: true })
      break
    }

    case "SEARCH_QUERY": {
      try {
        const query = message.payload as SearchQuery
        const queryEmbedding = await generateEmbedding(query.text)
        const results = await searchChunksLocally(queryEmbedding, query.topK || TOP_K_DEFAULT)
        sendResponse({ type: "SEARCH_RESULTS", payload: results })
      } catch (error) {
        sendResponse({ type: "SEARCH_RESULTS", payload: [] })
      }
      break
    }

    case "CHAT_MESSAGE": {
      try {
        const { message: userMessage, sessionId } = message.payload
        const queryEmbedding = await generateEmbedding(userMessage)
        const results = await searchChunksLocally(queryEmbedding, TOP_K_DEFAULT)

        const context = results
          .map((r) => `[Source: ${r.chunk.title}] (${r.chunk.url})\n${r.chunk.content}`)
          .join("\n\n---\n\n")

        const settings = await getSettings()
        let response: string

        if (settings?.backend?.enabled) {
          response = await queryLLMBackend(userMessage, context)
        } else {
          response = generateLocalResponse(userMessage, results)
        }

        const chatMessage: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: response,
          timestamp: Date.now(),
          sources: results.slice(0, 3),
        }

        sendResponse({
          type: "CHAT_RESPONSE",
          payload: { response, sources: results.slice(0, 3) },
        })
      } catch (error) {
        sendResponse({
          type: "CHAT_RESPONSE",
          payload: { response: "Sorry, I encountered an error processing your question.", sources: [] },
        })
      }
      break
    }

    case "GET_CHAT_HISTORY": {
      const sessions = await getChatSessions()
      sendResponse({ type: "CHAT_HISTORY", payload: sessions })
      break
    }

    case "CLEAR_CHAT_HISTORY": {
      await clearAllChatSessions()
      sendResponse({ success: true })
      break
    }

    case "DELETE_TAB_DATA": {
      const tabId = message.tabId
      await deleteChunksByTabId(tabId)
      await deleteTab(tabId)
      sendResponse({ success: true })
      break
    }

    case "SUMMARIZE_TAB": {
      const summary = await generateSummary(message.tabId)
      if (summary) {
        sendResponse({ type: "TAB_SUMMARIZED", payload: summary })
      } else {
        sendResponse({ type: "TAB_SUMMARIZED", payload: null })
      }
      break
    }
  }

  return true
}

async function queryLLMBackend(userMessage: string, context: string): Promise<string> {
  const settings = await getSettings()
  const baseUrl = settings?.backend?.baseUrl || "http://localhost:3001"

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        context,
        model: "gpt-4o-mini",
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    return data.response
  } finally {
    clearTimeout(timeout)
  }
}

function generateLocalResponse(userMessage: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return "I couldn't find any relevant content from your tabs to answer that question."
  }

  const topResults = results.slice(0, 3)
  const sources = topResults
    .map((r) => `- "${r.chunk.title}" (${r.chunk.url}) — *${r.chunk.content.slice(0, 150)}...*`)
    .join("\n")

  return `Based on your browser memory, here's what I found:\n\n${sources}\n\nI found ${results.length} relevant passages. Try connecting to the backend AI service for more detailed answers with full context-aware responses.`
}

initialize().catch(console.error)
