import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/db/index.ts", "src/db/schema.ts", "src/env.ts", "src/index.ts"],
      thresholds: { statements: 95, branches: 95, functions: 90, lines: 95 }
    }
  }
})
