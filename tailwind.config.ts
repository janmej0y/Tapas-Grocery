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
        leaf: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#059669",
          600: "#047857",
          700: "#065f46"
        },
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
