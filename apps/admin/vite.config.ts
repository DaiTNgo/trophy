import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  resolve: {
    // Workspace packages must share the application's React dispatcher.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
  plugins: lazyPlugins(() => [
    react(),
    process.env.ANALYZE_BUNDLE === "1"
      ? visualizer({
          filename: "dist/bundle-report.html",
          template: "treemap",
          gzipSize: true,
          brotliSize: true,
          open: false,
        })
      : null,
  ]),
});
