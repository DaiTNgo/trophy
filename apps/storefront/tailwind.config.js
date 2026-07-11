export default {
  theme: {
    extend: {
      "colors": {
          /* ── TrophySmack Brand Palette ────────────────────────── */
          /* Primary: Dark Navy */
          "primary":                    "#244159",
          "primary-foreground":         "#ffffff",
          "primary-container":          "#3a6a8f",
          "on-primary":                 "#ffffff",
          "on-primary-container":       "#e3effb",
          "on-primary-fixed":           "#ffffff",
          "on-primary-fixed-variant":   "#1a3048",
          "primary-fixed":              "#e3effb",
          "primary-fixed-dim":          "#288ab6",
          "inverse-primary":            "#288ab6",

          /* Secondary: Teal Green */
          "secondary":                  "#04a387",
          "secondary-foreground":       "#ffffff",
          "secondary-container":        "#cef2ec",
          "secondary-fixed":            "#cef2ec",
          "secondary-fixed-dim":        "#7dd4c4",
          "on-secondary":               "#ffffff",
          "on-secondary-container":     "#024d3f",
          "on-secondary-fixed":         "#013a2f",
          "on-secondary-fixed-variant": "#026b5a",

          /* Tertiary: Medium Blue */
          "tertiary":                   "#288ab6",
          "tertiary-container":         "#d0ebf7",
          "tertiary-fixed":             "#d0ebf7",
          "tertiary-fixed-dim":         "#80c8e5",
          "on-tertiary":                "#ffffff",
          "on-tertiary-container":      "#0d4f6e",
          "on-tertiary-fixed":          "#0a3d57",
          "on-tertiary-fixed-variant":  "#1a6f96",

          /* Error / Destructive: TrophySmack Orange */
          "error":                      "#EA4222",
          "error-container":            "#ffd5cc",
          "on-error":                   "#ffffff",
          "on-error-container":         "#8c1d00",

          /* Surface / Background */
          "background":                 "#ffffff",
          "on-background":              "#232323",
          "surface":                    "#f5fafd",
          "surface-dim":                "#d0dde8",
          "surface-bright":             "#f5fafd",
          "surface-container-lowest":   "#ffffff",
          "surface-container-low":      "#eaf3f9",
          "surface-container":          "#e3effb",
          "surface-container-high":     "#d6e8f4",
          "surface-container-highest":  "#c8dff0",
          "surface-variant":            "#ddeaf5",
          "surface-tint":               "#244159",
          "on-surface":                 "#232323",
          "on-surface-variant":         "#3a5a73",
          "inverse-surface":            "#171740",
          "inverse-on-surface":         "#e3effb",

          /* Outline / Border */
          "outline":                    "#5580a0",
          "outline-variant":            "#c8dff0",

          /* Utility */
          "surface-bright-2":           "#e3effb",
          "rating-color":               "#f6d02b"
      },
      "borderRadius": {
          "sm":      "0.25rem",
          "DEFAULT": "0.5rem",
          "md":      "0.75rem",
          "lg":      "1rem",
          "xl":      "1.5rem",
          "full":    "9999px"
      },
      "spacing": {
          "gutter":           "24px",
          "base":             "8px",
          "container-max":    "1280px",
          "margin-mobile":    "16px",
          "margin-desktop":   "64px"
      },
      "fontFamily": {
          "headline-lg":        ["Anton"],
          "label-md":           ["Inter"],
          "display-lg-mobile":  ["Anton"],
          "headline-md":        ["Anton"],
          "display-lg":         ["Anton"],
          "body-md":            ["Inter"],
          "body-lg":            ["Inter"]
      },
      "fontSize": {
          "headline-lg":       ["40px", {"lineHeight": "44px", "letterSpacing": "0.02em", "fontWeight": "400"}],
          "label-md":          ["14px", {"lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "600"}],
          "display-lg-mobile": ["48px", {"lineHeight": "48px", "letterSpacing": "0.04em", "fontWeight": "400"}],
          "headline-md":       ["32px", {"lineHeight": "36px", "letterSpacing": "0.02em", "fontWeight": "400"}],
          "display-lg":        ["72px", {"lineHeight": "72px", "letterSpacing": "0.04em", "fontWeight": "400"}],
          "body-md":           ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
          "body-lg":           ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
      }
    }
  }
}
