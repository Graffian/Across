import { pool } from "./pool"
import { SCHEMA_SQL } from "./schema"

export async function runMigrations(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(SCHEMA_SQL)
    await client.query("COMMIT")
    console.log("Database migrations completed successfully")
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("Migration failed:", error)
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
