import { build } from "esbuild"
import { execSync } from "child_process"
import { copyFileSync, mkdirSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(import.meta.dirname, "..")
const DIST = resolve(ROOT, "dist")

const BACKEND_URL = JSON.stringify(process.env.BACKEND_URL || "http://localhost:3001")

function log(msg) {
  console.log(`[build] ${msg}`)
}

async function main() {
  mkdirSync(DIST, { recursive: true })

  log(`Backend URL: ${BACKEND_URL}`)

  log("Building background script...")
  await build({
    entryPoints: [resolve(ROOT, "src/background/index.ts")],
    outfile: resolve(DIST, "background.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: false,
    define: { __BACKEND_URL__: BACKEND_URL },
  })

  log("Building content script...")
  await build({
    entryPoints: [resolve(ROOT, "src/content/index.ts")],
    outfile: resolve(DIST, "content.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    define: { __BACKEND_URL__: BACKEND_URL },
  })

  log("Building side panel + popup (Vite)...")
  execSync("npx vite build", { cwd: ROOT, stdio: "inherit" })

  log("Copying manifest...")
  copyFileSync(resolve(ROOT, "manifest.json"), resolve(DIST, "manifest.json"))

  log("Copying icons...")
  for (const size of [16, 48, 128]) {
    copyFileSync(resolve(ROOT, "assets", `icon-${size}.png`), resolve(DIST, `icon-${size}.png`))
  }

  log("Copying privacy policy...")
  copyFileSync(resolve(ROOT, "privacy.html"), resolve(DIST, "privacy.html"))

  log("Build complete!")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
