import type { TabInfo, TabStatus } from "../../lib/types"
import { URL_PATTERNS_TO_SKIP } from "../../lib/constants"
import { apiStoreTab, apiDeleteTabData, apiLoadTabs } from "../../lib/api"

class TabMonitor {
  private tabs: Map<number, TabInfo> = new Map()
  private onTabUpdateCallbacks: Array<(tab: TabInfo) => void> = []
  private onTabCloseCallbacks: Array<(tabId: number) => void> = []
  private activeTabId: number | null = null

  async initialize(): Promise<void> {
    try {
      const storedTabs = await apiLoadTabs()
      for (const tab of storedTabs) {
        this.tabs.set(tab.tabId, tab)
      }
    } catch {
      console.warn("Failed to load tabs from backend, starting fresh")
    }

    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTabs[0]) {
      this.activeTabId = activeTabs[0].id ?? null
    }

    chrome.tabs.onCreated.addListener((tab) => this.handleTabCreated(tab))
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.handleTabUpdated(tabId, changeInfo, tab))
    chrome.tabs.onActivated.addListener((activeInfo) => this.handleTabActivated(activeInfo))
    chrome.tabs.onRemoved.addListener((tabId) => this.handleTabRemoved(tabId))
    chrome.webNavigation.onCompleted.addListener((details) => this.handleNavigationCompleted(details))

    this.syncAllTabs()
  }

  private async syncAllTabs(): Promise<void> {
    const allTabs = await chrome.tabs.query({})
    for (const tab of allTabs) {
      if (tab.id && tab.url && !this.shouldSkipUrl(tab.url)) {
        this.upsertTab(tab.id, tab)
      }
    }
  }

  private shouldSkipUrl(url: string): boolean {
    return URL_PATTERNS_TO_SKIP.some((pattern) => pattern.test(url))
  }

  private handleTabCreated(tab: chrome.tabs.Tab): void {
    if (!tab.id || !tab.url || this.shouldSkipUrl(tab.url)) return
    this.upsertTab(tab.id, tab)
  }

  private handleTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab): void {
    if (changeInfo.url) {
      if (this.shouldSkipUrl(changeInfo.url)) return
    }
    if (!tab.url || this.shouldSkipUrl(tab.url)) return

    if (changeInfo.status === "complete" || changeInfo.url) {
      this.upsertTab(tabId, tab)
    }
  }

  private handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): void {
    this.activeTabId = activeInfo.tabId
    const tab = this.tabs.get(activeInfo.tabId)
    if (tab) {
      tab.isActive = true
      tab.lastAccessedTime = Date.now()
      this.tabs.set(activeInfo.tabId, tab)
      apiStoreTab(tab).catch(() => {})
      this.notifyTabUpdate(tab)
    }
  }

  private handleTabRemoved(tabId: number): void {
    const tab = this.tabs.get(tabId)
    this.tabs.delete(tabId)
    apiDeleteTabData(tabId).catch((err) => console.error(`Failed to delete tab ${tabId} from backend:`, err))
    this.notifyTabClose(tabId)
    chrome.runtime.sendMessage({ type: "TAB_REMOVED", payload: { tabId } }).catch(() => {})
  }

  private handleNavigationCompleted(details: chrome.webNavigation.WebNavigationFramedCallbackDetails): void {
    if (details.frameId !== 0) return
    if (this.shouldSkipUrl(details.url)) return

    const tab = this.tabs.get(details.tabId)
    if (tab) {
      const urlChanged = tab.url !== details.url
      tab.url = details.url
      tab.lastAccessedTime = Date.now()
      tab.visitCount++
      if (urlChanged) {
        tab.status = "pending"
        apiDeleteTabData(details.tabId).catch(() => {})
      }
      this.tabs.set(details.tabId, tab)
      apiStoreTab(tab).catch(() => {})
      this.notifyTabUpdate(tab)
    }
  }

  private upsertTab(tabId: number, tabData: chrome.tabs.Tab): void {
    const existing = this.tabs.get(tabId)
    const now = Date.now()
    const urlChanged = existing && tabData.url && existing.url !== tabData.url

    const tabInfo: TabInfo = {
      tabId,
      url: tabData.url ?? "",
      title: tabData.title ?? "",
      domain: tabData.url ? new URL(tabData.url).hostname : "",
      isActive: tabId === this.activeTabId,
      isPinned: tabData.pinned ?? false,
      isBookmarked: existing?.isBookmarked ?? false,
      openTime: existing?.openTime ?? now,
      lastAccessedTime: now,
      status: urlChanged ? "pending" : existing?.status ?? "pending",
      visitCount: existing?.visitCount ?? 0,
    }

    this.tabs.set(tabId, tabInfo)
    apiStoreTab(tabInfo).catch(() => {})
    this.notifyTabUpdate(tabInfo)
  }

  getTab(tabId: number): TabInfo | undefined {
    return this.tabs.get(tabId)
  }

  getAllTabs(): TabInfo[] {
    return Array.from(this.tabs.values())
  }

  getActiveTab(): TabInfo | null {
    if (this.activeTabId === null) return null
    return this.tabs.get(this.activeTabId) ?? null
  }

  onTabUpdate(callback: (tab: TabInfo) => void): void {
    this.onTabUpdateCallbacks.push(callback)
  }

  onTabClose(callback: (tabId: number) => void): void {
    this.onTabCloseCallbacks.push(callback)
  }

  private notifyTabUpdate(tab: TabInfo): void {
    for (const cb of this.onTabUpdateCallbacks) {
      cb(tab)
    }
  }

  private notifyTabClose(tabId: number): void {
    for (const cb of this.onTabCloseCallbacks) {
      cb(tabId)
    }
  }
}

export const tabMonitor = new TabMonitor()
