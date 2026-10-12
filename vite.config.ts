/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  // relative asset paths, so the build works from any subpath (e.g. GitHub Pages)
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
