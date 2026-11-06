import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          primary: "#7B6E86",
          secondary: "#D2C483",
        },
        amethyst: {
          50: "#F7F6F8",
          100: "#ECE9F0",
          200: "#DBD5E2",
          300: "#C4BACF",
          400: "#988BA5",
          500: "#7B6E86", // COLOR PRINCIPAL
          600: "#655970",
          700: "#504559",
          800: "#393140",
          900: "#221D27",
          950: "#141018",
        },
        champagne: {
          50: "#FAF9F2",
          100: "#F5F2E3",
          200: "#EBE5C6",
          300: "#DFD5A5",
          400: "#D2C483", // COLOR SECUNDARIO
          500: "#C3B267",
          600: "#A3934A",
          700: "#7A6D37",
          800: "#544B26",
        },
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
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-cinzel)", "Georgia", "serif"],
        display: ["var(--font-cinzel)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
