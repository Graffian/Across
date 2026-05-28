import React from "react"
import type { TabInfo } from "../../lib/types"

interface Props {
  tabs: TabInfo[]
  onSelectTab?: (tabId: number) => void
  onDeleteTab?: (tabId: number) => void
  onSummarizeTab?: (tabId: number) => void
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function getStatusDot(status: string): string {
  switch (status) {
    case "embedded": return "bg-green-500"
    case "chunked": return "bg-yellow-500"
    case "extracting": return "bg-blue-500"
    case "failed": return "bg-red-500"
    default: return "bg-slate-500"
  }
}

function Favicon({ domain, title }: { domain: string; title: string }) {
  const [errored, setErrored] = React.useState(false)

  if (errored || !domain) {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-700 text-[9px] font-bold text-slate-400 uppercase">
        {(title || "?").charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className="h-5 w-5 shrink-0 rounded"
      onError={() => setErrored(true)}
    />
  )
}

export default function TabList({ tabs, onSelectTab, onDeleteTab, onSummarizeTab }: Props) {
  const sorted = [...tabs].sort((a, b) => b.lastAccessedTime - a.lastAccessedTime)

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <svg className="mb-3 h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm">No indexed tabs yet</p>
        <p className="mt-1 text-xs text-slate-600">Browse normally and tabs will be indexed automatically</p>
      </div>
    )
  }

  return (
    <div className="space-y-1 p-3">
      {sorted.map((tab) => (
        <div
          key={tab.tabId}
          className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 transition-all hover:border-across-500/30 hover:bg-slate-800/60"
        >
          <div className="flex items-start gap-3">
            <Favicon domain={tab.domain} title={tab.title} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="truncate text-sm font-medium text-slate-200">{tab.title || "Untitled"}</div>
                <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${getStatusDot(tab.status)}`} />
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="truncate text-xs text-slate-500">{tab.domain}</span>
                <span className="shrink-0 rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-500">{formatTime(tab.lastAccessedTime)}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {onSelectTab && (
              <button onClick={() => onSelectTab(tab.tabId)} className="rounded px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200" title="Switch to tab">
                Switch
              </button>
            )}
            {onSummarizeTab && (
              <button onClick={() => onSummarizeTab(tab.tabId)} className="rounded px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200" title="Summarize">
                Summarize
              </button>
            )}
            {onDeleteTab && (
              <button onClick={() => onDeleteTab(tab.tabId)} className="rounded px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400" title="Delete">
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
