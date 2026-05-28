import React, { useEffect, useState } from "react"
import type { TabInfo } from "../lib/types"

function StatusDot({ status }: { status: string }) {
  const color =
    status === "embedded"
      ? "bg-green-500"
      : status === "chunked"
        ? "bg-yellow-500"
        : status === "extracting"
          ? "bg-blue-500"
          : status === "failed"
            ? "bg-red-500"
            : "bg-slate-500"

  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
}

export default function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_TABS" }, (response) => {
      if (response?.payload) {
        setTabs(response.payload)
      }
    })

    const listener = (msg: any) => {
      if (msg.type === "TABS_LIST") {
        setTabs(msg.payload)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const filtered = tabs.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.url.toLowerCase().includes(query.toLowerCase())
  )

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (activeTabs[0]?.id) {
        chrome.sidePanel.open({ tabId: activeTabs[0].id })
      }
    })
  }

  return (
    <div className="w-80 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-across-600 text-[10px] font-bold text-white">A</div>
          <span className="text-sm font-semibold">Across</span>
        </div>
        <button
          onClick={openSidePanel}
          className="rounded-lg bg-across-600 px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-across-500"
        >
          Open Chat
        </button>
      </div>

      <div className="px-4 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tabs..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-across-600"
        />
      </div>

      <div className="max-h-64 overflow-y-auto px-4 pb-3">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No tabs found</p>
        ) : (
          filtered.map((tab) => (
            <div
              key={tab.tabId}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-800"
            >
              <StatusDot status={tab.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-200">{tab.title || "Untitled"}</div>
                <div className="truncate text-[10px] text-slate-500">{tab.domain}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-700 px-4 py-2 text-center text-[10px] text-slate-600">
        {tabs.length} tabs indexed &middot; {tabs.filter((t) => t.status === "embedded").length} embedded
      </div>
    </div>
  )
}
