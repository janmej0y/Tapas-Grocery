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
          50: "#f3fbf5",
          100: "#dff5e5",
          500: "#2f9e44",
          600: "#25843a",
          700: "#1f6b32"
        },
        marigold: "#f59f00",
        ink: "#17211b"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 33, 27, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
