import React, { useState } from "react"

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [input, setInput] = useState("")

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/95 p-3 backdrop-blur-sm">
      <div className="flex items-end gap-2 rounded-xl border border-slate-600/50 bg-slate-800/80 p-2 transition-colors focus-within:border-across-500 focus-within:ring-1 focus-within:ring-across-500/30">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask about your tabs..."}
          disabled={disabled}
          className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-across-600 text-white transition-all hover:bg-across-500 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-600">Enter to send &middot; Shift+Enter for new line</div>
    </div>
  )
}
