/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    target: "es2022",
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
