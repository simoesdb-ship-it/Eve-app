import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Use Node environment (no browser DOM needed for server-side tests)
    environment: "node",
    // Each test file gets its own isolated context
    isolate: true,
    // Load .env-style secrets from the process environment (Replit injects these)
    setupFiles: [],
    // Allow real async I/O (DB, HTTP) — generous timeout for integration tests
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
});
