import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mt: {
          primary: "#1B6B5C",
          "primary-light": "#2D8A77",
          "primary-dark": "#124E44",
          "primary-bg": "#E5F1EE",
          secondary: "#D4A574",
          "secondary-light": "#E8C9A6",
          "secondary-dark": "#B8874D",
          bg: "#FDFBF7",
          surface: "#FFFFFF",
          text: "#1C1917",
          "text-secondary": "#57534E",
          "text-tertiary": "#A8A29E",
          border: "#E5E0D8",
          "border-dark": "#C5BDB2",
          "accent-gold": "#D4A017",
          "accent-teal": "#1E7D8D",
          "accent-coral": "#C75B39",
          success: "#2D6A4F",
          error: "#8B4B4B",
          warning: "#D99E2B",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["3rem", { lineHeight: "1.15", fontWeight: "700" }],
        "display-lg": ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        "display-md": ["2rem", { lineHeight: "1.3", fontWeight: "700" }],
        "heading-xl": ["2rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-lg": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-md": ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "caption-md": ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
        "caption-sm": ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      boxShadow: {
        card: "0 1px 3px rgba(28,25,23,0.04), 0 8px 24px rgba(28,25,23,0.06)",
        "card-hover": "0 4px 12px rgba(28,25,23,0.08), 0 16px 40px rgba(28,25,23,0.10)",
        glow: "0 0 20px rgba(27,107,92,0.15)",
        input: "inset 0 1px 2px rgba(28,25,23,0.03)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      maxWidth: {
        container: "1200px",
        narrow: "800px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "count-up": "countUp 1.5s ease-out forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "draw-check": "drawCheck 0.6s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(27,107,92,0.2)" },
          "50%": { boxShadow: "0 0 24px rgba(27,107,92,0.4)" },
        },
        drawCheck: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
