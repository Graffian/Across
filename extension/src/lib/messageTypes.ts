import type { ExtensionMessage } from "./types"

export async function sendMessage(msg: ExtensionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(msg)
}

export function addMessageListener(
  handler: (msg: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => void
): void {
  chrome.runtime.onMessage.addListener(handler)
}

export function sendMessageToTab(tabId: number, msg: ExtensionMessage): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, msg)
}
