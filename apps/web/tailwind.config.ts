import type { Config } from "tailwindcss";

const withAlpha = (name: string) => `rgb(var(${name}) / <alpha-value>)` as const;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css"
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Legacy alias — prefer `hs-*` (GlowHomeo Assist design tokens in theme.css).
         */
        gh: {
          cream: "var(--gh-cream)",
          paper: "var(--gh-paper)",
          sand: "var(--gh-sand)",
          ink: "var(--gh-ink)",
          muted: "var(--gh-muted)",
          subtle: "var(--gh-subtle)",
          accent: "var(--gh-accent)",
          "accent-light": "var(--gh-accent-light)",
          leaf: "var(--gh-leaf)"
        },
        /** Channel accents (marketing): WhatsApp brand green */
        wa: {
          DEFAULT: "#25D366",
          dark: "#128C7E",
          bubble: "#DCF8C6"
        },
        /** GlowHomeo Assist design system — reads `styles/theme.css` */
        hs: {
          primary: withAlpha("--ds-primary"),
          "primary-light": withAlpha("--ds-primary-light"),
          "primary-dark": withAlpha("--ds-primary-dark"),
          "primary-very-light": withAlpha("--ds-primary-very-light"),
          card: withAlpha("--ds-card"),
          surface: withAlpha("--ds-surface"),
          secondary: withAlpha("--ds-secondary"),
          "secondary-light": withAlpha("--ds-secondary-light"),
          "secondary-dark": withAlpha("--ds-secondary-dark"),
          cream: withAlpha("--ds-cream"),
          paper: withAlpha("--ds-paper"),
          ink: withAlpha("--ds-ink"),
          text: {
            DEFAULT: withAlpha("--ds-text"),
            secondary: withAlpha("--ds-text-secondary"),
            tertiary: withAlpha("--ds-text-tertiary")
          },
          border: {
            DEFAULT: withAlpha("--ds-border"),
            dark: withAlpha("--ds-border-dark")
          },
          success: withAlpha("--ds-success"),
          warning: withAlpha("--ds-warning"),
          danger: withAlpha("--ds-error"),
          info: withAlpha("--ds-info"),
          "complexity-simple": withAlpha("--ds-complexity-simple"),
          "complexity-standard": withAlpha("--ds-complexity-standard"),
          "complexity-complex": withAlpha("--ds-complexity-complex"),
          "complexity-urgent": withAlpha("--ds-complexity-urgent")
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: [
          "var(--font-outfit)",
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      fontSize: {
        "display-xl": ["3rem", { lineHeight: "1.2", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-xl": ["2rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-lg": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "caption-md": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        "caption-sm": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        "typo-hero": [
          "var(--ds-text-hero-size)",
          {
            lineHeight: "var(--ds-text-hero-leading)",
            fontWeight: "var(--ds-text-hero-weight)"
          }
        ],
        "typo-section": [
          "var(--ds-text-section-size)",
          { lineHeight: "var(--ds-text-section-leading)", fontWeight: "600" }
        ],
        "typo-body": [
          "var(--ds-text-body-size)",
          { lineHeight: "var(--ds-text-body-leading)" }
        ],
        "typo-small": [
          "var(--ds-text-small-size)",
          { lineHeight: "var(--ds-text-small-leading)" }
        ]
      },
      spacing: {
        "ds-xs": "var(--ds-space-xs)",
        "ds-sm": "var(--ds-space-sm)",
        "ds-md": "var(--ds-space-md)",
        "ds-lg": "var(--ds-space-lg)",
        "ds-xl": "var(--ds-space-xl)",
        "ds-2xl": "var(--ds-space-2xl)",
        "ds-3xl": "var(--ds-space-3xl)"
      },
      boxShadow: {
        card: "var(--ds-shadow-card)",
        input: "var(--ds-shadow-input)",
        "ds-sm": "var(--ds-shadow-sm)",
        "ds-md": "var(--ds-shadow-md)"
      },
      transitionDuration: {
        ds: "var(--ds-duration-fast)"
      }
    }
  },
  plugins: [
    require("@tailwindcss/container-queries")
  ]
};

export default config;
