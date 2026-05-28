import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

const BACKEND_URL = JSON.stringify(process.env.BACKEND_URL || "http://localhost:3001")

export default defineConfig({
  plugins: [react()],
  define: { __BACKEND_URL__: BACKEND_URL },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "src/sidepanel/index.html"),
        popup: resolve(__dirname, "src/popup/index.html"),
      },
    },
  },
  base: "",
})
