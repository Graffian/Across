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

function getStatusColor(status: string): string {
  switch (status) {
    case "embedded": return "bg-green-500"
    case "chunked": return "bg-yellow-500"
    case "extracting": return "bg-blue-500"
    case "failed": return "bg-red-500"
    default: return "bg-slate-500"
  }
}

export default function TabList({ tabs, onSelectTab, onDeleteTab, onSummarizeTab }: Props) {
  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <svg className="mb-3 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm">No indexed tabs yet</p>
        <p className="mt-1 text-xs text-slate-600">Browse normally and tabs will be indexed automatically</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {tabs.map((tab) => (
        <div
          key={tab.tabId}
          className="group rounded-lg border border-slate-700 bg-slate-800/50 p-3 transition-colors hover:border-across-600"
        >
          <div className="flex items-start gap-2">
            <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getStatusColor(tab.status)}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-200">{tab.title || "Untitled"}</div>
              <div className="mt-0.5 truncate text-xs text-slate-500">{tab.domain}</div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
            <span>{formatTime(tab.lastAccessedTime)}</span>
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onSelectTab && (
                <button onClick={() => onSelectTab(tab.tabId)} className="rounded px-1.5 py-0.5 hover:bg-slate-700" title="Switch to tab">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
              {onSummarizeTab && (
                <button onClick={() => onSummarizeTab(tab.tabId)} className="rounded px-1.5 py-0.5 hover:bg-slate-700" title="Summarize">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
              {onDeleteTab && (
                <button onClick={() => onDeleteTab(tab.tabId)} className="rounded px-1.5 py-0.5 hover:bg-slate-700" title="Delete">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
