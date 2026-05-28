import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import { pool, testConnection } from "./db/pool"
import { runMigrations } from "./db/migrations"
import { errorHandler, requestLogger } from "./middleware/errorHandler"
import { apiLimiter } from "./middleware/rateLimit"
import embeddingsRouter from "./routes/embeddings"
import chatRouter from "./routes/chat"
import searchRouter from "./routes/search"
import tabsRouter from "./routes/tabs"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: "*" }))
app.use(express.json({ limit: "10mb" }))
app.use(requestLogger)
app.use("/api", apiLimiter)

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() })
})

app.use("/api/embeddings", embeddingsRouter)
app.use("/api/chat", chatRouter)
app.use("/api/search", searchRouter)
app.use("/api/tabs", tabsRouter)

app.use(errorHandler)

export default app

async function start(): Promise<void> {
  const dbConnected = await testConnection()
  if (dbConnected) {
    await runMigrations()
  } else {
    console.warn("Database not available, running without persistence")
  }

  app.listen(PORT, () => {
    console.log(`Across backend running on port ${PORT}`)
  })
}

if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error("Failed to start server:", err)
    process.exit(1)
  })
}
