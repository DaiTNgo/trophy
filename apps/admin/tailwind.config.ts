import { type Config } from "tailwindcss";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

const uiPath = path.resolve(
  path.dirname(require.resolve("@medusajs/ui")),
  "../..",
  "**/*.{js,jsx,ts,tsx}",
);

const config: Config = {
  presets: [require("@medusajs/ui-preset")],
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    uiPath,
  ],
};

export default config;
