import { useState, useCallback, useEffect } from "react"
import type { ChatMessage, TabInfo, SearchResult, TabSummary } from "../../lib/types"

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "tabs">("chat")
  const [summaries, setSummaries] = useState<Map<number, TabSummary>>(new Map())

  useEffect(() => {
    loadTabs()
    const listener = (msg: any) => {
      if (msg.type === "TABS_LIST") {
        setTabs(msg.payload)
      }
      if (msg.type === "TAB_SUMMARIZED" && msg.payload) {
        setSummaries((prev) => new Map(prev).set(msg.payload.tabId, msg.payload))
      }
      if (msg.type === "INDEXING_PROGRESS") {
        loadTabs()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const loadTabs = () => {
    chrome.runtime.sendMessage({ type: "GET_TABS" }, (response) => {
      if (response?.payload) setTabs(response.payload)
    })
  }

  const sendMessage = useCallback((content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)
    chrome.runtime.sendMessage(
      { type: "CHAT_MESSAGE", payload: { message: content } },
      (response) => {
        if (response?.payload) {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: response.payload.response,
              timestamp: Date.now(),
            },
          ])
          setLoading(false)
        }
      },
    )
  }, [])

  const summarizeTab = useCallback((tabId: number) => {
    chrome.runtime.sendMessage({ type: "SUMMARIZE_TAB", tabId })
  }, [])

  const deleteTab = useCallback((tabId: number) => {
    chrome.runtime.sendMessage({ type: "DELETE_TAB_DATA", tabId })
    setTabs((prev) => prev.filter((t) => t.tabId !== tabId))
  }, [])

  const selectTab = useCallback((tabId: number) => {
    chrome.tabs.update(tabId, { active: true })
    chrome.windows.update
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    chrome.runtime.sendMessage({ type: "CLEAR_CHAT_HISTORY" })
  }, [])

  return {
    messages,
    tabs,
    loading,
    activeTab,
    setActiveTab,
    sendMessage,
    summarizeTab,
    deleteTab,
    selectTab,
    clearChat,
    loadTabs,
  }
}
