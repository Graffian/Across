import { Router, Request, Response } from "express"
import { searchSimilar } from "../services/vectorStore"
import { getEmbeddingProvider } from "../services/embeddingProvider"
import { searchLimiter } from "../middleware/rateLimit"

const router = Router()

router.post("/", searchLimiter, async (req: Request, res: Response) => {
  try {
    const { query, topK, tabId } = req.body

    if (!query) {
      res.status(400).json({ error: "query is required" })
      return
    }

    const provider = getEmbeddingProvider()
    const queryEmbedding = await provider.embed(query)
    const results = await searchSimilar(queryEmbedding, topK || 10, tabId)

    res.json({ results })
  } catch (error) {
    console.error("Search error:", error)
    res.status(500).json({ error: "Search failed" })
  }
})

export default router
