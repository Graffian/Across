import { Router, Request, Response } from "express"
import { pool } from "../db/pool"

const router = Router()

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT tab_id, url, title, domain, is_active, is_pinned, is_bookmarked,
              status, open_time, last_accessed_time, visit_count
       FROM tabs
       ORDER BY last_accessed_time DESC`
    )
    res.json({ tabs: result.rows.map(mapTab) })
  } catch (error) {
    console.error("Get tabs error:", error)
    res.status(500).json({ error: "Failed to fetch tabs" })
  }
})

router.post("/", async (req: Request, res: Response) => {
  try {
    const tab = req.body
    await pool.query(
      `INSERT INTO tabs (tab_id, url, title, domain, is_active, is_pinned, is_bookmarked, status, open_time, last_accessed_time, visit_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tab_id) DO UPDATE SET
         url = EXCLUDED.url,
         title = EXCLUDED.title,
         domain = EXCLUDED.domain,
         is_active = EXCLUDED.is_active,
         is_pinned = EXCLUDED.is_pinned,
         is_bookmarked = EXCLUDED.is_bookmarked,
         status = EXCLUDED.status,
         last_accessed_time = EXCLUDED.last_accessed_time,
         visit_count = EXCLUDED.visit_count,
         updated_at = NOW()`,
      [tab.tabId, tab.url, tab.title, tab.domain, tab.isActive, tab.isPinned, tab.isBookmarked,
       tab.status, tab.openTime, tab.lastAccessedTime, tab.visitCount]
    )
    res.json({ success: true })
  } catch (error) {
    console.error("Store tab error:", error)
    res.status(500).json({ error: "Failed to store tab" })
  }
})

router.delete("/:tabId", async (req: Request, res: Response) => {
  try {
    const { tabId } = req.params
    await pool.query("DELETE FROM embeddings WHERE chunk_id IN (SELECT chunk_id FROM chunks WHERE tab_id = $1)", [tabId])
    await pool.query("DELETE FROM chunks WHERE tab_id = $1", [tabId])
    await pool.query("DELETE FROM summaries WHERE tab_id = $1", [tabId])
    await pool.query("DELETE FROM tabs WHERE tab_id = $1", [tabId])
    res.json({ success: true })
  } catch (error) {
    console.error("Delete tab error:", error)
    res.status(500).json({ error: "Failed to delete tab" })
  }
})

function mapTab(row: any) {
  return {
    tabId: row.tab_id,
    url: row.url,
    title: row.title,
    domain: row.domain,
    isActive: row.is_active,
    isPinned: row.is_pinned,
    isBookmarked: row.is_bookmarked,
    status: row.status,
    openTime: Number(row.open_time),
    lastAccessedTime: Number(row.last_accessed_time),
    visitCount: row.visit_count,
  }
}

export default router
