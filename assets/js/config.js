/* Tailwind configuration — Deep Crimson Technical design system
   Loaded immediately after the Tailwind CDN script on every page. */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ffb3ad",
        "on-primary": "#680008",
        "primary-container": "#8b1d1d",
        "on-primary-container": "#ff9c94",
        "primary-fixed": "#ffdad6",
        "primary-fixed-dim": "#ffb3ad",
        "on-primary-fixed": "#410003",
        "on-primary-fixed-variant": "#891c1c",
        "secondary": "#c6c6c7",
        "on-secondary": "#2f3131",
        "secondary-container": "#454747",
        "on-secondary-container": "#b4b5b5",
        "secondary-fixed": "#e2e2e2",
        "secondary-fixed-dim": "#c6c6c7",
        "tertiary": "#95ceef",
        "on-tertiary": "#003549",
        "tertiary-container": "#004e6a",
        "on-tertiary-container": "#86bedf",
        "error": "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        "background": "#131313",
        "on-background": "#e5e2e1",
        "background-deep": "#1A1A1A",
        "surface": "#131313",
        "surface-dim": "#131313",
        "surface-bright": "#393939",
        "surface-light": "#F5F5F5",
        "surface-variant": "#353535",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#20201f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353535",
        "surface-tint": "#ffb3ad",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#dfbfbc",
        "inverse-surface": "#e5e2e1",
        "inverse-on-surface": "#313030",
        "inverse-primary": "#aa3431",
        "outline": "#a78a87",
        "outline-variant": "#58413f",
        "crimson-accent": "#8B1D1D"
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      spacing: {
        "base": "8px",
        "gutter": "24px",
        "margin-mobile": "16px",
        "margin-desktop": "64px",
        "max-width": "1200px"
      },
      maxWidth: {
        "max-width": "1200px"
      },
      fontFamily: {
        "label-mono": ["JetBrains Mono", "monospace"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "caption": ["Inter", "sans-serif"],
        "headline-lg": ["IBM Plex Sans", "sans-serif"],
        "headline-lg-mobile": ["IBM Plex Sans", "sans-serif"],
        "headline-md": ["IBM Plex Sans", "sans-serif"]
      },
      fontSize: {
        "label-mono": ["14px", { lineHeight: "1.5", letterSpacing: "0.05em", fontWeight: "500" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "500" }],
        "headline-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }]
      }
    }
  }
};
