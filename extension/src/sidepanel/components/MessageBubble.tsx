import React from "react"
import type { ChatMessage } from "../../lib/types"

interface Props {
  message: ChatMessage
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let codeLang = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        codeLines.push(line.slice(3))
      }
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="my-2 overflow-x-auto rounded-lg bg-slate-800 p-3 text-xs text-slate-200">
            <code>{codeLines.join("\n")}</code>
          </pre>
        )
        codeLines = []
        codeLang = ""
      } else {
        codeLang = line.slice(3).trim()
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.trim() === "") {
      elements.push(<div key={`empty-${i}`} className="h-2" />)
      continue
    }

    const urlRegex = /(https?:\/\/[^\s<]+)/g
    let processed = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code class='rounded bg-slate-700 px-1 text-xs text-across-300'>$1</code>")
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        "<a href='$2' target='_blank' class='text-across-400 underline hover:text-across-300'>$1</a>"
      )
      .replace(urlRegex, "<a href='$1' target='_blank' class='text-across-400 underline hover:text-across-300'>$1</a>")

    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 text-sm leading-relaxed text-slate-100">
          <span className="mt-0.5 shrink-0 text-slate-500">&bull;</span>
          <span dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />
        </div>
      )
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 text-sm leading-relaxed text-slate-100">
          <span className="mt-0.5 shrink-0 text-slate-500">{line.match(/^(\d+)\./)?.[1]}.</span>
          <span dangerouslySetInnerHTML={{ __html: processed.replace(/^\d+\.\s/, "") }} />
        </div>
      )
    } else {
      elements.push(
        <div key={`p-${i}`} className="text-sm leading-relaxed text-slate-100" dangerouslySetInnerHTML={{ __html: processed }} />
      )
    }
  }

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key="code-trailing" className="my-2 overflow-x-auto rounded-lg bg-slate-800 p-3 text-xs text-slate-200">
        <code>{codeLines.join("\n")}</code>
      </pre>
    )
  }

  return <>{elements}</>
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[88%] break-words rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-across-600 text-white rounded-br-md"
            : "bg-slate-700/80 text-slate-100 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <div className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        ) : (
          <SimpleMarkdown content={message.content} />
        )}
        <div className={`mt-2 flex items-center justify-between text-[10px] ${isUser ? "text-across-200" : "text-slate-500"}`}>
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="ml-2 rounded px-1.5 py-0.5 transition-colors hover:bg-slate-600"
              title="Copy"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
