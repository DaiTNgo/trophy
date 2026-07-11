import { type Config } from "tailwindcss";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

const uiPath = path.resolve(
  path.dirname(require.resolve("@medusajs/ui")),
  "../..",
  "**/*.{js,jsx,ts,tsx}",
);
const customizationReactPath = path.resolve(
  path.dirname(require.resolve("@trophy/customization-react")),
  "**/*.{js,jsx,ts,tsx}",
);

const config: Config = {
  presets: [require("@medusajs/ui-preset")],
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    uiPath,
    customizationReactPath,
  ],
  theme: {
    extend: {
      colors: {
        primary: "#875200",
        "primary-fixed": "#ffddba",
        "on-primary-fixed": "#2b1700",
        accent: "#875200",
        "accent-foreground": "#ffffff",
        "on-surface": "#1c1b1b",
        "on-surface-variant": "#544433",
        outline: "#867461",
        "outline-variant": "#d9c3ad",
        background: "#fcf9f8",
        surface: "#fcf9f8",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f6f3f2",
        "surface-container": "#f0eded",
        "surface-variant": "#e5e2e1",
        destructive: "#ba1a1a",
      },
    },
  },
};

export default config;
