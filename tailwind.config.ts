import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {

        "primary-accent": "#15803d",
        "secondary-accent": "#f59e0b",
        "heading": "#111827",
        "badge-success": "#15803d",
        "badge-deal": "#f59e0b",
        "badge-warning": "#dc2626",
        "badge-saved": "#06b6d4",
        marigold: "#b45309",
        ink: "#0f172a",
        leaf: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-bengali)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)",
        elevated: "0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)",
        modal: "0 24px 70px rgba(15, 23, 42, 0.16)",
        soft: "0 18px 60px rgba(23, 33, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
