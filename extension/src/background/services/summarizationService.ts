import type { TabSummary, ContentChunk } from "../../lib/types"
import { LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE, MAX_RETRIES, RETRY_DELAY_MS } from "../../lib/constants"
import { storeSummary, getChunksByTabId } from "../../lib/indexedDB"

declare const __BACKEND_URL__: string | undefined
const BACKEND_URL = typeof __BACKEND_URL__ !== "undefined" ? __BACKEND_URL__ : "http://localhost:3001"

async function summarizeViaBackend(chunks: ContentChunk[]): Promise<{ summary: string; keyPoints: string[] }> {
  const combinedContent = chunks.map((c) => `[${c.heading || "General"}]\n${c.content}`).join("\n\n")

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: combinedContent.slice(0, 15000),
          title: chunks[0]?.title || "",
          model: LLM_MODEL,
          maxTokens: LLM_MAX_TOKENS,
          temperature: LLM_TEMPERATURE,
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)))
    }
  }

  throw new Error("Summarization failed after retries")
}

export async function generateSummary(tabId: number): Promise<TabSummary | null> {
  try {
    const chunks = await getChunksByTabId(tabId)
    if (chunks.length === 0) return null

    const result = await summarizeViaBackend(chunks)

    const summary: TabSummary = {
      tabId,
      url: chunks[0].url,
      title: chunks[0].title,
      summary: result.summary,
      keyPoints: result.keyPoints,
      generatedAt: Date.now(),
    }

    await storeSummary(summary)
    return summary
  } catch (error) {
    console.error(`Summarization failed for tab ${tabId}:`, error)
    return null
  }
}
