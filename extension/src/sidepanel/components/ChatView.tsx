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
      <header className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-across-500 to-across-700 text-xs font-bold text-white shadow-sm">
            A
          </div>
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
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-across-500/20 to-across-700/20 ring-1 ring-across-500/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-across-500 to-across-700 text-lg font-bold text-white shadow-lg">
                    A
                  </div>
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
                      className="group rounded-lg border border-slate-700/50 bg-slate-800/30 px-3.5 py-2.5 text-left text-xs text-slate-400 transition-all hover:border-across-500/50 hover:bg-slate-800/80 hover:text-slate-200"
                    >
                      <span className="mr-2 text-across-500 opacity-0 transition-opacity group-hover:opacity-100">&rarr;</span>
                      {s}
                    </button>
                  ))}
                </div>

                {tabs.length > 0 && (
                  <div className="mt-6 flex items-center gap-3 text-[10px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      {embeddedCount} embedded
                    </span>
                    <span className="text-slate-700">|</span>
                    <span>{tabs.length} tracked</span>
                  </div>
                )}
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
