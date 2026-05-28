import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

const TARGET_DIM = 1536

function padToDim(vec: number[], target = TARGET_DIM): number[] {
  if (vec.length >= target) return vec
  const padded = new Array(target).fill(0)
  for (let i = 0; i < vec.length; i++) padded[i] = vec[i]
  return padded
}

export interface EmbeddingProvider {
  name: string
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = "OpenAI"
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

export class JinaAIEmbeddingProvider implements EmbeddingProvider {
  name = "Jina AI"
  private apiKey: string
  private endpoint = "https://api.jina.ai/v1/embeddings"

  constructor() {
    this.apiKey = process.env.JINA_API_KEY!
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        input: texts,
        task: "retrieval.query",
        dimensions: 1024,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Jina AI error ${response.status}: ${body}`)
    }

    const data = await response.json()
    return data.data.map((item: { embedding: number[] }) => padToDim(item.embedding))
  }
}

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  name = "Hugging Face"
  private apiKey: string
  private endpoint = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

  constructor() {
    this.apiKey = process.env.HF_API_TOKEN!
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text])
    return results[0]
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`HuggingFace error ${response.status}: ${body}`)
    }

    const data = await response.json()
    const rows = Array.isArray(data[0]) ? data : [data]
    return rows.map((r: number[]) => padToDim(r))
  }
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  name = "hash-based (keyword)"
  private dimension = TARGET_DIM

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

  if (process.env.JINA_API_KEY) {
    console.log("Using Jina AI for embeddings (free tier available)")
    provider = new JinaAIEmbeddingProvider()
  } else if (process.env.OPENAI_API_KEY) {
    console.log("Using OpenAI for embeddings")
    provider = new OpenAIEmbeddingProvider()
  } else if (process.env.HF_API_TOKEN) {
    console.log("Using Hugging Face for embeddings (free tier available)")
    provider = new HuggingFaceEmbeddingProvider()
  } else {
    console.warn("No embedding API key set — using hash-based embeddings (keyword matching only). Set JINA_API_KEY, OPENAI_API_KEY, or HF_API_TOKEN for real semantic embeddings.")
    provider = new MockEmbeddingProvider()
  }

  return provider
}
