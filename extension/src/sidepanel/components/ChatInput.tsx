import React, { useState, useRef, useEffect } from "react"

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [input, setInput] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"
    }
  }, [input])

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
    <div className="border-t border-slate-700 bg-slate-900 p-3">
      <div className="flex items-end gap-2 rounded-xl border border-slate-600 bg-slate-800 p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask about your tabs..."}
          disabled={disabled}
          rows={1}
          className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-across-600 text-white transition-colors hover:bg-across-500 disabled:opacity-40 disabled:hover:bg-across-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-600">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}
