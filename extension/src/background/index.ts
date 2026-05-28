import { tabMonitor } from "./services/tabMonitor"
import { queueManager } from "./services/queueManager"
import { chunkContent } from "./services/chunkingPipeline"
import { embedChunks } from "./services/embeddingService"
import { generateSummary } from "./services/summarizationService"
import type { ExtractedContent, TabInfo, SearchQuery } from "../lib/types"
import { getChatSessions, clearAllChatSessions } from "../lib/indexedDB"
import { TAB_PRIORITY_ACTIVE, TAB_PRIORITY_RECENT, TAB_PRIORITY_PINNED, TAB_PRIORITY_BACKGROUND, TOP_K_DEFAULT } from "../lib/constants"
import { apiSearchChunks, apiDeleteTabData, apiChat } from "../lib/api"

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

    await embedChunks(chunks)
    notifyIndexingProgress(tabId, "embedded", 90)

    const currentTab = tabMonitor.getTab(tabId)
    if (currentTab) {
      currentTab.status = "embedded"
      tabMonitor["tabs"].set(tabId, currentTab)
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

    case "SEARCH_QUERY": {
      try {
        const payload = message.payload as SearchQuery
        const results = await apiSearchChunks(payload.text, payload.topK || TOP_K_DEFAULT)
        sendResponse({ type: "SEARCH_RESULTS", payload: results })
      } catch (error) {
        sendResponse({ type: "SEARCH_RESULTS", payload: [] })
      }
      break
    }

    case "CHAT_MESSAGE": {
      try {
        const { message: userMessage } = message.payload
        const response = await apiChat(userMessage)

        sendResponse({
          type: "CHAT_RESPONSE",
          payload: { response },
        })
      } catch (error) {
        sendResponse({
          type: "CHAT_RESPONSE",
          payload: { response: "Sorry, I encountered an error processing your question." },
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
      await apiDeleteTabData(tabId)
      tabMonitor["tabs"].delete(tabId)
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

initialize().catch(console.error)
