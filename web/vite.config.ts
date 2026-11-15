// AI-assisted: Claude (Anthropic).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' keeps every asset and data path relative, so the same build works
// on Vercel (Root Directory = web) and as a static bundle anywhere else.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", assetsDir: "assets", chunkSizeWarningLimit: 800 },
});
