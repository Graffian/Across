import type { TabSummary, ContentChunk } from "../../lib/types"
import { LLM_MODEL, LLM_MAX_TOKENS, LLM_TEMPERATURE, MAX_RETRIES, RETRY_DELAY_MS } from "../../lib/constants"
import { storeSummary, getChunksByTabId, getSettings } from "../../lib/indexedDB"

async function getBackendUrl(): Promise<string> {
  const settings = await getSettings()
  return settings?.backend?.baseUrl || "http://localhost:3001"
}

async function summarizeViaBackend(chunks: ContentChunk[]): Promise<{ summary: string; keyPoints: string[] }> {
  const baseUrl = await getBackendUrl()
  const combinedContent = chunks.map((c) => `[${c.heading || "General"}]\n${c.content}`).join("\n\n")

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/api/summarize`, {
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

async function summarizeLocally(chunks: ContentChunk[]): Promise<{ summary: string; keyPoints: string[] }> {
  const firstFewHundred = chunks.map((c) => c.content).join("\n\n").slice(0, 2000)
  const wordCount = firstFewHundred.split(/\s+/).length

  return {
    summary: `Page about "${chunks[0]?.title || "unknown"}". Content includes approximately ${wordCount} words across ${chunks.length} sections. Topics covered: ${chunks
      .map((c) => c.heading)
      .filter(Boolean)
      .slice(0, 5)
      .join(", ")}.`,
    keyPoints: [
      `Title: ${chunks[0]?.title || "unknown"}`,
      `URL: ${chunks[0]?.url || "unknown"}`,
      `Sections: ${chunks.length}`,
      `Estimated words: ${wordCount}`,
    ],
  }
}

export async function generateSummary(tabId: number): Promise<TabSummary | null> {
  try {
    const chunks = await getChunksByTabId(tabId)
    if (chunks.length === 0) return null

    const settings = await getSettings()
    const useBackend = settings?.backend?.enabled ?? false

    let result: { summary: string; keyPoints: string[] }
    if (useBackend) {
      result = await summarizeViaBackend(chunks)
    } else {
      result = await summarizeLocally(chunks)
    }

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
