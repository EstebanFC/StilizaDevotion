import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FDFBF9",
          100: "#F7F3EE",
          200: "#EFE7DD",
          300: "#E2D5C5",
          400: "#CBB69E",
          500: "#B39778",
        },
        espresso: {
          700: "#3E322B",
          800: "#2A211C",
          900: "#1B1512",
        },
        terracotta: {
          500: "#C86D51",
          600: "#B2583D",
        },
        sage: {
          500: "#6B8068",
          600: "#556852",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
