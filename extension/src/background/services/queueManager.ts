import type { QueueItem, QueuePriority, QueueItemStatus, TabInfo } from "../../lib/types"
import { MAX_TABS_BATCH, PROCESSING_INTERVAL_MS, DEBOUNCE_MS_DEFAULT, MAX_RETRIES, RETRY_DELAY_MS, TAB_PRIORITY_ACTIVE, TAB_PRIORITY_RECENT, TAB_PRIORITY_PINNED, TAB_PRIORITY_BACKGROUND } from "../../lib/constants"
import { v4 as uuidv4 } from "uuid"

class QueueManager {
  private queue: QueueItem[] = []
  private processing: Set<string> = new Set()
  private debounceTimers: Map<number, ReturnType<typeof setTimeout>> = new Map()
  private paused = false
  private onProcessCallbacks: Array<(item: QueueItem) => Promise<void>> = []
  private onCompleteCallbacks: Array<(item: QueueItem) => void> = []
  private onErrorCallbacks: Array<(item: QueueItem, error: Error) => void> = []

  enqueue(tabId: number, url: string, priority: QueuePriority = 4): void {
    const existing = this.queue.find((q) => q.tabId === tabId && q.status === "queued")
    if (existing) {
      existing.priority = Math.min(existing.priority, priority) as QueuePriority
      existing.updatedAt = Date.now()
      return
    }

    const existingTimer = this.debounceTimers.get(tabId)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = setTimeout(() => {
      const item: QueueItem = {
        id: uuidv4(),
        tabId,
        url,
        priority,
        status: "queued",
        retryCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      this.queue.push(item)
      this.sortQueue()
      this.debounceTimers.delete(tabId)
      this.processNext()
    }, DEBOUNCE_MS_DEFAULT)

    this.debounceTimers.set(tabId, timer)
  }

  enqueueImmediate(tabId: number, url: string, priority: QueuePriority = 1): void {
    const timer = this.debounceTimers.get(tabId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(tabId)
    }

    const item: QueueItem = {
      id: uuidv4(),
      tabId,
      url,
      priority,
      status: "queued",
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.queue.push(item)
    this.sortQueue()
    this.processNext()
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
  }

  private async processNext(): Promise<void> {
    if (this.paused) return
    if (this.processing.size >= MAX_TABS_BATCH) return

    const next = this.queue.find((q) => q.status === "queued" && !this.processing.has(q.id))
    if (!next) return

    this.processing.add(next.id)
    next.status = "processing"
    next.updatedAt = Date.now()

    try {
      for (const cb of this.onProcessCallbacks) {
        await cb(next)
      }
      next.status = "completed"
      this.onCompleteCallbacks.forEach((cb) => cb(next))
    } catch (error) {
      next.retryCount++
      if (next.retryCount < MAX_RETRIES) {
        next.status = "queued"
        setTimeout(() => this.processNext(), RETRY_DELAY_MS * Math.pow(2, next.retryCount - 1))
      } else {
        next.status = "failed"
        this.onErrorCallbacks.forEach((cb) => cb(next, error instanceof Error ? error : new Error(String(error))))
      }
    } finally {
      this.processing.delete(next.id)
      this.queue = this.queue.filter((q) => q.status !== "completed" && q.status !== "failed")
      setTimeout(() => this.processNext(), PROCESSING_INTERVAL_MS)
    }
  }

  onProcess(callback: (item: QueueItem) => Promise<void>): void {
    this.onProcessCallbacks.push(callback)
  }

  onComplete(callback: (item: QueueItem) => void): void {
    this.onCompleteCallbacks.push(callback)
  }

  onError(callback: (item: QueueItem, error: Error) => void): void {
    this.onErrorCallbacks.push(callback)
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    this.processNext()
  }

  clearQueue(): void {
    this.queue = []
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  getQueueLength(): number {
    return this.queue.filter((q) => q.status === "queued").length
  }

  isProcessing(): boolean {
    return this.processing.size > 0
  }
}

export const queueManager = new QueueManager()
