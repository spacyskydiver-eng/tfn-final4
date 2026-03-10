import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Tauri expects a fixed dev server port
  server: {
    port: 1420,
    strictPort: true,
    // Allow the Tauri host to connect
    host: "localhost",
    hmr: { protocol: "ws", host: "localhost", port: 1421 },
    watch: {
      // Watch Rust source so Vite restarts properly during dev
      ignored: ["**/src-tauri/**"],
    },
  },

  // Ensure the build output matches Tauri's expected directory
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  // Prevent Vite from obscuring Tauri-specific errors
  clearScreen: false,

  envPrefix: ["VITE_", "TAURI_"],
}));
