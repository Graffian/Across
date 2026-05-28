import React from "react"
import ChatView from "./components/ChatView"
import { useChat } from "./hooks/useChat"
import "../styles/globals.css"

export default function SidePanel() {
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
