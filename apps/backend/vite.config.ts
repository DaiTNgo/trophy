import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  build: {
    target: "node22",
    ssr: "src/index.ts",
    outDir: "dist/backend",
    rollupOptions: {
      input: "src/index.ts",
      output: {
        entryFileNames: "index.js",
        format: "esm",
      },
    },
  },
  plugins: [
    process.env.ANALYZE_BUNDLE === "1"
      ? visualizer({
          filename: "dist/bundle-report.html",
          template: "treemap",
          gzipSize: true,
          brotliSize: true,
          open: false,
        })
      : null,
  ],
});
