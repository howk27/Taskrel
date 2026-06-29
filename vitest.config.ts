import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolves the "@/..." path alias (tsconfig paths) so tests can import modules
// — notably API route handlers — that reference it at runtime. Existing pure
// tests use relative/type-only imports and are unaffected.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
