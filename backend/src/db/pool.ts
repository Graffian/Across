import { Pool } from "pg"
import dotenv from "dotenv"

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/across",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err)
  process.exit(-1)
})

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query("SELECT NOW()")
    client.release()
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}
