import type { ContentChunk } from "../../lib/types"
import { EMBEDDING_DIMENSION, EMBEDDING_MODEL, MAX_RETRIES, RETRY_DELAY_MS } from "../../lib/constants"
import { apiStoreChunks } from "../../lib/api"

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

let provider: EmbeddingProvider | null = null

async function getProvider(): Promise<EmbeddingProvider> {
  if (provider) return provider
  provider = new BackendEmbeddingProvider("http://localhost:3001")
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
  await apiStoreChunks(chunks, embeddings)
}
