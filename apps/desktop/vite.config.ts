import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite + Vitest configuration for the desktop shell.
// The Tauri window loads the dev server on a fixed port (see src-tauri/tauri.conf.json).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
  },
});
