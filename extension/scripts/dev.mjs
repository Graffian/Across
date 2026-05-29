import { context } from "esbuild"
import { spawn } from "child_process"
import { copyFileSync, mkdirSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "..")
const DIST = resolve(ROOT, "dist")

const BACKEND_URL = JSON.stringify(process.env.BACKEND_URL || "http://localhost:3001")

function log(msg) {
  console.log(`[dev] ${msg}`)
}

async function main() {
  mkdirSync(DIST, { recursive: true })
  copyFileSync(resolve(ROOT, "manifest.json"), resolve(DIST, "manifest.json"))

  log(`Backend URL: ${BACKEND_URL}`)

  log("Watching background script...")
  const bgCtx = await context({
    entryPoints: [resolve(ROOT, "src/background/index.ts")],
    outfile: resolve(DIST, "background.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: true,
    define: { __BACKEND_URL__: BACKEND_URL },
  })
  await bgCtx.watch()

  log("Watching content script...")
  const contentCtx = await context({
    entryPoints: [resolve(ROOT, "src/content/index.ts")],
    outfile: resolve(DIST, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    sourcemap: true,
    define: { __BACKEND_URL__: BACKEND_URL },
  })
  await contentCtx.watch()

  log("Watching side panel + popup (Vite)...")
  const vite = spawn("npx", ["vite", "build", "--watch"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
  })

  log("Dev mode ready. Load dist/ folder in Chrome.")
  log("Press Ctrl+C to stop.")

  process.on("SIGINT", () => {
    bgCtx.dispose()
    contentCtx.dispose()
    vite.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
