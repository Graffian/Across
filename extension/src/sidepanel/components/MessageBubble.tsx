import React from "react"
import type { ChatMessage, SearchResult } from "../../lib/types"

interface Props {
  message: ChatMessage
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function SourceCard({ source }: { source: SearchResult }) {
  const shortUrl = source.chunk.url.length > 60
    ? source.chunk.url.slice(0, 57) + "..."
    : source.chunk.url

  return (
    <div className="mt-2 rounded-lg border border-slate-600 bg-slate-800/50 p-2 text-xs">
      <div className="flex items-center gap-1 text-slate-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span className="truncate">{source.chunk.title}</span>
      </div>
      <div className="mt-1 truncate text-slate-500">{shortUrl}</div>
      <div className="mt-1 text-slate-300">
        {source.chunk.content.slice(0, 120)}
        {source.chunk.content.length > 120 ? "..." : ""}
      </div>
    </div>
  )
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-across-600 text-white"
            : "bg-slate-700 text-slate-100"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-slate-600 pt-2">
            <div className="mb-1 text-xs font-medium text-slate-400">Sources:</div>
            {message.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        )}

        <div className={`mt-1 text-[10px] ${isUser ? "text-across-200" : "text-slate-500"}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  )
}
