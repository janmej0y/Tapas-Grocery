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
        ink: "#0f172a"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 33, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
