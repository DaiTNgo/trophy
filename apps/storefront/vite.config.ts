import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";

const appRoot = import.meta.dirname;

export default defineConfig({
  root: appRoot,
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [searchForWorkspaceRoot(appRoot)],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
