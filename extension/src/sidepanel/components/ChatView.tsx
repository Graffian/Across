import React, { useRef, useEffect, useState } from "react"
import MessageBubble from "./MessageBubble"
import ChatInput from "./ChatInput"
import TabList from "./TabList"
import type { ChatMessage, TabInfo, TabSummary } from "../../lib/types"

interface Props {
  messages: ChatMessage[]
  tabs: TabInfo[]
  loading: boolean
  onSend: (msg: string) => void
  onSummarizeTab: (tabId: number) => void
  onDeleteTab: (tabId: number) => void
  onSelectTab: (tabId: number) => void
  onClearChat: () => void
}

export default function ChatView({
  messages,
  tabs,
  loading,
  onSend,
  onSummarizeTab,
  onDeleteTab,
  onSelectTab,
  onClearChat,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tabView, setTabView] = useState<"chat" | "tabs">("chat")
  const [firstTabSeen, setFirstTabSeen] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (tabs.length > 0 && !firstTabSeen) {
      requestAnimationFrame(() => setFirstTabSeen(true))
    }
  }, [tabs.length, firstTabSeen])

  const embeddedCount = tabs.filter((t) => t.status === "embedded").length

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img src={chrome.runtime.getURL("icon-48.png")} alt="Across" className="h-7 w-7 rounded-lg" />
          <span className="text-sm font-semibold text-slate-200">Across</span>
          {messages.length > 0 && (
            <button onClick={onClearChat} className="ml-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300">
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTabView("chat")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tabView === "chat"
                ? "bg-across-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setTabView("tabs")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tabView === "tabs"
                ? "bg-across-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            Tabs{embeddedCount > 0 ? <span className="ml-1.5 rounded-full bg-slate-600 px-1.5 py-0.5 text-[10px] tabular-nums">{embeddedCount}</span> : null}
          </button>
        </div>
      </header>

      {tabView === "tabs" ? (
        <div className="flex-1 overflow-y-auto">
          <TabList tabs={tabs} onSelectTab={onSelectTab} onDeleteTab={onDeleteTab} onSummarizeTab={onSummarizeTab} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                <div className={`transition-all duration-700 ${firstTabSeen ? "pointer-events-none opacity-0 scale-95" : ""}`}>
                  <img src={chrome.runtime.getURL("icon-128.png")} alt="Across" className="mx-auto mb-5 h-16 w-16 rounded-2xl" />
                  <h2 className="text-lg font-semibold text-slate-200">Welcome to Across</h2>
                  <p className="mt-2 max-w-[260px] text-sm text-slate-400">
                    Close all your existing tabs and open them again for a smoother experience.
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Across indexes your tabs automatically as you browse.
                  </p>
                </div>

                <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-700 ${firstTabSeen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"}`}>
                  <img src={chrome.runtime.getURL("icon-128.png")} alt="Across" className="mx-auto mb-5 h-16 w-16 rounded-2xl" />
                  <h2 className="text-lg font-semibold text-slate-200">Browser Memory</h2>
                  <p className="mt-1 max-w-[260px] text-sm text-slate-500">
                    Chat with your tabs. Ask questions about anything you've browsed.
                  </p>

                  {tabs.length > 0 && (
                    <div className="mt-6 flex items-center gap-3 text-[10px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        {embeddedCount} indexed
                      </span>
                      {tabs.filter((t) => t.status === "extracting" || t.status === "chunked").length > 0 && (
                        <>
                          <span className="text-slate-700">|</span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
                            {tabs.filter((t) => t.status === "extracting" || t.status === "chunked").length} reading
                          </span>
                        </>
                      )}
                      <span className="text-slate-700">|</span>
                      <span>{tabs.length} tracked</span>
                    </div>
                  )}
                  {embeddedCount === 0 && tabs.length > 0 && (
                    <p className="mt-4 text-xs text-slate-500">
                      AI is reading your pages. They will be ready to chat about once indexed.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 pb-2 pt-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start pb-3">
                    <div className="rounded-2xl rounded-bl-md bg-slate-700/80 px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <ChatInput onSend={onSend} disabled={loading} placeholder="Ask about your tabs..." />
        </>
      )}
    </div>
  )
}
