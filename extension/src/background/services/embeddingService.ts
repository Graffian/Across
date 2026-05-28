import type { ContentChunk } from "../../lib/types"
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL, MAX_RETRIES, RETRY_DELAY_MS } from "../../lib/constants"
import { storeEmbedding, getSettings } from "../../lib/indexedDB"

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

class BackendEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.data.map((item: { embedding: number[] }) => item.embedding)
      } catch (error) {
        if (attempt === MAX_RETRIES - 1) throw error
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt)))
      }
    }
    throw new Error("Embedding failed after retries")
  }
}

class LocalEmbeddingProvider implements EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return this.hashEmbedding(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashEmbedding(t))
  }

  private hashEmbedding(text: string): number[] {
    const vec = new Array(EMBEDDING_DIMENSION).fill(0)
    const lower = text.toLowerCase()

    for (let i = 0; i < lower.length - 2; i++) {
      const gram = lower.slice(i, i + 3)
      let hash = 0
      for (let j = 0; j < gram.length; j++) {
        hash = ((hash << 5) - hash) + gram.charCodeAt(j)
        hash |= 0
      }
      vec[Math.abs(hash) % EMBEDDING_DIMENSION]++
    }

    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
    return magnitude > 0 ? vec.map((v) => v / magnitude) : vec
  }
}

let provider: EmbeddingProvider | null = null

async function getProvider(): Promise<EmbeddingProvider> {
  if (provider) return provider

  const settings = await getSettings()
  if (settings?.backend?.enabled) {
    provider = new BackendEmbeddingProvider(settings.backend.baseUrl)
  } else {
    provider = new LocalEmbeddingProvider()
  }

  return provider
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const p = await getProvider()
  return p.embed(text)
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const p = await getProvider()
  return p.embedBatch(texts)
}

export async function embedChunks(chunks: ContentChunk[]): Promise<void> {
  const texts = chunks.map((c) => `Title: ${c.title}\nSection: ${c.heading}\n${c.content}`)
  const embeddings = await generateEmbeddings(texts)

  for (let i = 0; i < chunks.length; i++) {
    await storeEmbedding(chunks[i].chunkId, embeddings[i])
  }
}
