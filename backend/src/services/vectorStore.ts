import { pool } from "../db/pool"

export interface VectorStoreChunk {
  chunkId: string
  tabId: number
  url: string
  title: string
  content: string
  heading: string
  chunkIndex: number
  tokenCount: number
  timestamp: number
}

export interface SearchResult {
  chunk: VectorStoreChunk
  score: number
}

export async function storeChunks(chunks: VectorStoreChunk[], embeddings: number[][]): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = embeddings[i]

      await client.query(
        `INSERT INTO chunks (chunk_id, tab_id, url, title, content, heading, chunk_index, token_count, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chunk_id) DO UPDATE SET content = EXCLUDED.content, heading = EXCLUDED.heading`,
        [chunk.chunkId, chunk.tabId, chunk.url, chunk.title, chunk.content, chunk.heading, chunk.chunkIndex, chunk.tokenCount, chunk.timestamp]
      )

      const vectorStr = `[${embedding.join(",")}]`
      await client.query(
        `INSERT INTO embeddings (chunk_id, vector)
         VALUES ($1, $2::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET vector = EXCLUDED.vector`,
        [chunk.chunkId, vectorStr]
      )
    }

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function searchSimilar(queryEmbedding: number[], topK: number, tabId?: number): Promise<SearchResult[]> {
  const vectorStr = `[${queryEmbedding.join(",")}]`

  let query = `
    SELECT c.*, e.vector <=> $1::vector AS distance
    FROM chunks c
    JOIN embeddings e ON c.chunk_id = e.chunk_id
  `

  const params: any[] = [vectorStr]

  if (tabId) {
    query += ` WHERE c.tab_id = $2`
    params.push(tabId)
  }

  query += ` ORDER BY distance ASC LIMIT $${params.length + 1}`
  params.push(topK)

  const result = await pool.query(query, params)

  return result.rows.map((row) => ({
    chunk: {
      chunkId: row.chunk_id,
      tabId: row.tab_id,
      url: row.url,
      title: row.title,
      content: row.content,
      heading: row.heading,
      chunkIndex: row.chunk_index,
      tokenCount: row.token_count,
      timestamp: row.timestamp,
    },
    score: 1 - parseFloat(row.distance),
  }))
}

export async function deleteChunksByTabId(tabId: number): Promise<void> {
  await pool.query("DELETE FROM chunks WHERE tab_id = $1", [tabId])
}

export async function getChunkCount(): Promise<number> {
  const result = await pool.query("SELECT COUNT(*) as count FROM chunks")
  return parseInt(result.rows[0].count)
}

export async function getTabCount(): Promise<number> {
  const result = await pool.query("SELECT COUNT(DISTINCT tab_id) as count FROM chunks")
  return parseInt(result.rows[0].count)
}
