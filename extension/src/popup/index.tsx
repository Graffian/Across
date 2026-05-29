import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import type { TabInfo } from "../lib/types"
import "../styles/globals.css"

function StatusDot({ status }: { status: string }) {
  const color =
    status === "embedded" ? "bg-green-500"
    : status === "chunked" ? "bg-yellow-500 animate-pulse"
    : status === "extracting" ? "bg-blue-500 animate-pulse"
    : status === "failed" ? "bg-red-500"
    : "bg-slate-500"
  const label =
    status === "embedded" ? "This page has been fully indexed. You can now chat about it."
    : status === "chunked" ? "Still processing this page. It will be ready to chat about shortly."
    : status === "extracting" ? "AI is currently reading this page. It will be indexed once complete."
    : status === "failed" ? "This page could not be indexed. Try reloading it."
    : "This page is queued for indexing and will be processed soon."
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} title={label} />
}

function Popup() {
  const [tabs, setTabs] = useState<TabInfo[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_TABS" }, (response) => {
      if (response?.payload) setTabs(response.payload)
    })
    const listener = (msg: any) => {
      if (msg.type === "TABS_LIST") setTabs(msg.payload)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const filtered = tabs.filter(
    (t) => t.title.toLowerCase().includes(query.toLowerCase()) || t.url.toLowerCase().includes(query.toLowerCase())
  )

  const openSidePanel = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (activeTabs[0]?.id) chrome.sidePanel.open({ tabId: activeTabs[0].id })
    })
  }

  return (
    <div className="w-80 bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={chrome.runtime.getURL("icon-48.png")} alt="Across" className="h-6 w-6 rounded-md" />
          <span className="text-sm font-semibold">Across</span>
        </div>
        <button onClick={openSidePanel} className="rounded-lg bg-across-600 px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-across-500">Open Chat</button>
      </div>
      <div className="px-4 py-2">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tabs..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-across-600" />
      </div>
      <div className="max-h-64 overflow-y-auto px-4 pb-3">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No tabs found</p>
        ) : (
          filtered.map((tab) => (
            <div key={tab.tabId} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-800">
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
        {tabs.length} tabs &middot; {tabs.filter((t) => t.status === "embedded").length} indexed
        {tabs.filter((t) => t.status === "extracting" || t.status === "chunked").length > 0 && (
          <span className="ml-1 text-yellow-500">&middot; {tabs.filter((t) => t.status === "extracting" || t.status === "chunked").length} processing</span>
        )}
      </div>
    </div>
  )
}

const root = document.getElementById("root")
if (root) createRoot(root).render(<Popup />)
