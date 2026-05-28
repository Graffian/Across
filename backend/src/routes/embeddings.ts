import { Router, Request, Response } from "express"
import { getEmbeddingProvider } from "../services/embeddingProvider"
import { embeddingLimiter } from "../middleware/rateLimit"
import { v4 as uuidv4 } from "uuid"

const router = Router()

router.post("/", embeddingLimiter, async (req: Request, res: Response) => {
  try {
    const { input, model } = req.body

    if (!input) {
      res.status(400).json({ error: "input is required" })
      return
    }

    const texts = Array.isArray(input) ? input : [input]
    const provider = getEmbeddingProvider()
    const embeddings = await provider.embedBatch(texts)

    const data = embeddings.map((embedding, i) => ({
      object: "embedding",
      embedding,
      index: i,
    }))

    res.json({
      object: "list",
      data,
      model: model || "local",
      usage: { prompt_tokens: 0, total_tokens: 0 },
    })
  } catch (error) {
    console.error("Embedding error:", error)
    res.status(500).json({ error: "Failed to generate embeddings" })
  }
})

router.post("/store", async (req: Request, res: Response) => {
  try {
    const { chunks, embeddings } = req.body

    if (!chunks || !embeddings) {
      res.status(400).json({ error: "chunks and embeddings are required" })
      return
    }

    const { storeChunks } = await import("../services/vectorStore")
    await storeChunks(chunks, embeddings)

    res.json({ success: true, stored: chunks.length })
  } catch (error) {
    console.error("Store error:", error)
    res.status(500).json({ error: "Failed to store embeddings" })
  }
})

export default router
