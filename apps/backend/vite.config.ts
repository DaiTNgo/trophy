import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import {
  getAppCorsOrigins,
  CUSTOMIZATION_CORS_POLICY,
  SESSION_CORS_POLICY,
} from "./src/lib/cors";
import { visualizer } from "rollup-plugin-visualizer";

const devAllowedOrigins = getAppCorsOrigins(process.env as any);

export default defineConfig({
  server: {
    cors: {
      origin: devAllowedOrigins,
      credentials: true,
      allowedHeaders: Array.from(
        new Set([
          ...SESSION_CORS_POLICY.allowHeaders,
          ...CUSTOMIZATION_CORS_POLICY.allowHeaders,
        ]),
      ),
      methods: Array.from(
        new Set([
          ...SESSION_CORS_POLICY.allowMethods,
          ...CUSTOMIZATION_CORS_POLICY.allowMethods,
        ]),
      ),
    },
    port: 8787,
    strictPort: true,
  },
  preview: {
    port: 8788,
    strictPort: true,
  },
  plugins: [
    cloudflare(),
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
