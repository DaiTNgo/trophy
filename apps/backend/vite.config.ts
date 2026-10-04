import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  build: {
    target: "node22",
    ssr: true,
    outDir: "dist/backend",
    rollupOptions: {
      input: {
        index: "src/index.ts",
        migrate: "src/db/migrate.ts"
      },
      output: {
        entryFileNames: "[name].js",
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
