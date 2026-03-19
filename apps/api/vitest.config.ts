if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === '') {
  process.env.DATABASE_URL = ':memory:';
}

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    fileParallelism: false,
    teardownTimeout: 15000,
  },
});
