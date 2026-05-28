import React from "react"
import { createRoot } from "react-dom/client"
import ChatView from "./components/ChatView"
import { useChat } from "./hooks/useChat"
import "../styles/globals.css"

function SidePanel() {
  const {
    messages,
    tabs,
    loading,
    sendMessage,
    summarizeTab,
    deleteTab,
    selectTab,
    clearChat,
  } = useChat()

  return (
    <div className="h-screen w-screen">
      <ChatView
        messages={messages}
        tabs={tabs}
        loading={loading}
        onSend={sendMessage}
        onSummarizeTab={summarizeTab}
        onDeleteTab={deleteTab}
        onSelectTab={selectTab}
        onClearChat={clearChat}
      />
    </div>
  )
}

const root = document.getElementById("root")
if (root) {
  createRoot(root).render(<SidePanel />)
}
