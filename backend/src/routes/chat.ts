import { Router, Request, Response } from "express"
import { getLLMProvider } from "../services/llmProvider"
import { searchSimilar } from "../services/vectorStore"
import { getEmbeddingProvider } from "../services/embeddingProvider"
import { chatLimiter } from "../middleware/rateLimit"

const router = Router()

router.post("/", chatLimiter, async (req: Request, res: Response) => {
  try {
    const { message, context, model } = req.body

    if (!message) {
      res.status(400).json({ error: "message is required" })
      return
    }

    let ragContext = context

    if (!ragContext) {
      const embeddingProvider = getEmbeddingProvider()
      const queryEmbedding = await embeddingProvider.embed(message)
      const results = await searchSimilar(queryEmbedding, 5)
      ragContext = results
        .map((r) => `[Source: ${r.chunk.title}] (${r.chunk.url})\n${r.chunk.content.slice(0, 1000)}`)
        .join("\n\n---\n\n")
        .slice(0, 8000)
    }

    const llm = getLLMProvider()
    const response = await llm.chat(message, ragContext, req.body.history)

    res.json({ response, model: model || "default" })
  } catch (error) {
    console.error("Chat error:", error)
    res.status(500).json({ error: "Chat failed" })
  }
})

router.post("/summarize", async (req: Request, res: Response) => {
  try {
    const { content, title, model } = req.body

    if (!content) {
      res.status(400).json({ error: "content is required" })
      return
    }

    const llm = getLLMProvider()
    const result = await llm.summarize(content, title || "")

    res.json(result)
  } catch (error) {
    console.error("Summarize error:", error)
    res.status(500).json({ error: "Summarization failed" })
  }
})

export default router
