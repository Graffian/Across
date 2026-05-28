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

const SUGGESTIONS = [
  "Which tab talked about Rust ownership?",
  "Summarize everything I researched about async runtimes",
  "Compare pricing across all tabs",
  "What article mentioned pgvector?",
]

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const embeddedCount = tabs.filter((t) => t.status === "embedded").length

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-across-600 text-xs font-bold text-white">A</div>
          <span className="text-sm font-semibold text-slate-200">Across</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTabView("chat")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tabView === "chat" ? "bg-across-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setTabView("tabs")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tabView === "tabs" ? "bg-across-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Tabs ({embeddedCount})
          </button>
        </div>
      </div>

      {tabView === "tabs" ? (
        <div className="flex-1 overflow-y-auto">
          <TabList tabs={tabs} onSelectTab={onSelectTab} onDeleteTab={onDeleteTab} onSummarizeTab={onSummarizeTab} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-across-600/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-across-600 text-xl font-bold text-white">A</div>
                </div>
                <h2 className="text-lg font-semibold text-slate-200">Browser Memory</h2>
                <p className="mt-1 max-w-[260px] text-sm text-slate-500">
                  Chat with your tabs. Ask questions about anything you've browsed.
                </p>

                <div className="mt-6 grid w-full max-w-[320px] gap-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => onSend(s)}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-left text-xs text-slate-400 transition-colors hover:border-across-600 hover:text-slate-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {tabs.length > 0 && (
                  <p className="mt-4 text-[10px] text-slate-600">
                    {tabs.length} tabs indexed &middot; {embeddedCount} embedded
                  </p>
                )}
              </div>
            ) : (
              <div>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-slate-700 px-4 py-3">
                      <div className="flex gap-1">
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
