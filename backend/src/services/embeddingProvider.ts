import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      input: texts,
    })
    return response.data.map((item) => item.embedding)
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension = 1536

  async embed(text: string): Promise<number[]> {
    return this.hashEmbedding(text)
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.hashEmbedding(t))
  }

  private hashEmbedding(text: string): number[] {
    const seed = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const vec: number[] = []
    for (let i = 0; i < this.dimension; i++) {
      vec.push(Math.sin(seed * (i + 1)) * 0.5 + 0.5)
    }
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
    return magnitude > 0 ? vec.map((v) => v / magnitude) : vec
  }
}

let provider: EmbeddingProvider | null = null

export function getEmbeddingProvider(): EmbeddingProvider {
  if (provider) return provider

  if (process.env.OPENAI_API_KEY) {
    console.log("Using OpenAI for embeddings")
    provider = new OpenAIEmbeddingProvider()
  } else {
    console.warn("No OPENAI_API_KEY set — using hash-based embeddings (keyword matching, not semantic). Add OPENAI_API_KEY for real embeddings.")
    provider = new MockEmbeddingProvider()
  }

  return provider
}
